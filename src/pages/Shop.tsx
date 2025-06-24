import React, { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SmoothScroll from "@/components/SmoothScroll";
import CollectionCard from "@/components/shop/CollectionCard";
import ProductCard from "@/components/shop/ProductCard";
import FlashSalesBanner from "@/components/shop/FlashSalesBanner";
import { getCollections, getFeaturedProducts, getNewProducts } from "@/services/shopify/shopifyStorefrontService";
import { getNewProductsFromDB, getFeaturedProductsFromDB, getCollectionsFromDB, getBestSellingProductsFromDB } from "@/services/shopify/databaseProductService";
import { getActiveFlashSales } from "@/services/flashSalesService";
import { getVisibleCollectionOrders, initializeCollectionOrders } from "@/services/collectionOrderService";
import { Collection } from "@/services/types/shopify-types";
import { Search, ShoppingBag, Sparkles, TrendingUp, Star, Crown, Loader2, Users, Package, MessageCircle, Zap, ChevronRight, XCircle, Settings } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useScrollAnimation, useParallax, useStaggeredAnimation, usePageLoader, useTextReveal } from "@/hooks/useScrollAnimation";
import "@/styles/animations.css";
import "@/styles/micro-interactions.css";
import "@/styles/hero.css";
import "@/styles/featured-products.css";
import "@/styles/discord.css";
import "@/styles/shop.css";

const Shop: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredCollections, setFilteredCollections] = useState<Collection[]>([]);
  const [memberCount, setMemberCount] = useState(1610);
  const [activeCount, setActiveCount] = useState(465);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  
  const {
    data: collectionsResponse,
    isLoading: collectionsLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ["collections-db"],
    queryFn: async () => {
      // Try database first
      const dbResult = await getCollectionsFromDB();
      if (dbResult.data.length > 0) {
        return { data: dbResult.data };
      }
      
      // Fallback to API if database is empty
      console.log('No collections in database, falling back to API');
      return getCollections({ limit: 50 });
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const {
    data: featuredProductsData,
    isLoading: featuredProductsLoading,
    error: featuredProductsError
  } = useQuery({
    queryKey: ["best-selling-products-db"],
    queryFn: async () => {
      // Try database best sellers first
      const dbResult = await getBestSellingProductsFromDB(6);
      if (dbResult.data.length > 0) {
        return {
          products: dbResult.data,
          hasEnoughProducts: dbResult.data.length >= 6,
          availableCount: dbResult.data.length,
        };
      }
      
      // Fallback to API if database is empty
      console.log('No best-selling products in database, falling back to API');
      const products = await getFeaturedProducts(6);
      
      return {
        products,
        hasEnoughProducts: products.length >= 6,
        availableCount: products.length,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  const featuredProducts = React.useMemo(() => featuredProductsData?.products || [], [featuredProductsData?.products]);

  const {
    data: newProductsData,
    isLoading: newProductsLoading,
    error: newProductsError
  } = useQuery({
    queryKey: ["new-products-db"],
    queryFn: async () => {
      // Try database first
      const dbResult = await getNewProductsFromDB(8);
      if (dbResult.data.length > 0) {
        return dbResult.data;
      }
      // Fallback to API if database is empty
      console.log('No new products in database, falling back to API');
      const products = await getNewProducts(8);
      return products;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  const newProducts = React.useMemo(() => newProductsData || [], [newProductsData]);

  const {
    data: flashSales = [],
    isLoading: flashSalesLoading
  } = useQuery({
    queryKey: ["flash-sales"],
    queryFn: getActiveFlashSales,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const {
    data: collectionOrders = [],
    isLoading: collectionOrdersLoading
  } = useQuery({
    queryKey: ["visible-collection-orders"],
    queryFn: getVisibleCollectionOrders,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Animation hooks
  const isLoading = usePageLoader(1500);
  const heroRef = useScrollAnimation({ threshold: 0.1 });
  const heroTitleRef = useTextReveal();
  const flashSalesRef = useScrollAnimation({ threshold: 0.2 });
  const featuredProductsRef = useScrollAnimation({ threshold: 0.1 });
  const newProductsRef = useScrollAnimation({ threshold: 0.1 });
  const searchSectionRef = useScrollAnimation({ threshold: 0.3 });
  const collectionsSectionRef = useScrollAnimation({ threshold: 0.1 });
  const ctaSectionRef = useScrollAnimation({ threshold: 0.2 });
  const discordSectionRef = useScrollAnimation({ threshold: 0.2 });
  const productsGridRef = useStaggeredAnimation(6, { threshold: 0.1 });
  const newProductsGridRef = useStaggeredAnimation(8, { threshold: 0.1 });
  const collectionsGridRef = useStaggeredAnimation(20, { threshold: 0.1 }); // Use a fixed reasonable max
  const statsRef = useStaggeredAnimation(3, { threshold: 0.2 });
  const discordStatsRef = useStaggeredAnimation(2, { threshold: 0.3 });
  const benefitsRef = useStaggeredAnimation(4, { threshold: 0.2 });
  const parallaxHeroRef = useParallax(0.3);
  const parallaxBgRef = useParallax(0.5);

  const collections = React.useMemo(() => collectionsResponse?.data || [], [collectionsResponse?.data]);

  // Check if there are uninitialized collections
  const hasUninitializedCollections = React.useMemo(() => {
    if (!isAdmin || collections.length === 0) return false;
    
    // If collection_order is empty but we have collections, we need to initialize
    if (collectionOrders.length === 0) return true;
    
    // Otherwise check if any collections are missing from collection_order
    const orderedHandles = new Set(collectionOrders.map(order => order.collection_handle));
    return collections.some(collection => !orderedHandles.has(collection.handle));
  }, [isAdmin, collectionOrders, collections]);

  const handleInitializeCollections = async () => {
    try {
      await initializeCollectionOrders(
        collections.map(c => ({ handle: c.handle, title: c.title }))
      );
      toast.success("Collections initialized successfully!");
      // Refetch collection orders
      queryClient.invalidateQueries({ queryKey: ["visible-collection-orders"] });
      queryClient.invalidateQueries({ queryKey: ["collections-db"] });
    } catch (error) {
      console.error("Error initializing collections:", error);
      toast.error("Failed to initialize collections");
    }
  };

  // Update filtered collections when collections, collection orders, or search query changes
  React.useEffect(() => {
    // Start with all collections
    let filtered = collections;
    
    // Apply search filter
    if (searchQuery.trim()) {
      filtered = collections.filter(collection =>
        collection.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        collection.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Filter by visible collections from database
    if (collectionOrders.length > 0) {
      const visibleHandles = new Set(collectionOrders.map(order => order.collection_handle));
      filtered = filtered.filter(collection => visibleHandles.has(collection.handle));
      
      // Create maps for ordering and featured status
      const orderMap = new Map(collectionOrders.map(order => [order.collection_handle, order.display_order]));
      const featuredMap = new Map(collectionOrders.map(order => [order.collection_handle, order.featured || false]));
      
      // Sort by featured status first, then by database order
      filtered = [...filtered].sort((a, b) => {
        const aFeatured = featuredMap.get(a.handle) || false;
        const bFeatured = featuredMap.get(b.handle) || false;
        
        // Featured collections come first
        if (aFeatured && !bFeatured) return -1;
        if (!aFeatured && bFeatured) return 1;
        
        // Then sort by display order
        const orderA = orderMap.get(a.handle) ?? Number.MAX_SAFE_INTEGER;
        const orderB = orderMap.get(b.handle) ?? Number.MAX_SAFE_INTEGER;
        
        if (orderA !== orderB) {
          return orderA - orderB;
        }
        
        // Fallback to alphabetical if same order (shouldn't happen with unique display_order)
        return a.title.localeCompare(b.title);
      });
    }
    
    setFilteredCollections(filtered);
  }, [collections, collectionOrders, searchQuery]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Animated background effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const animate = () => {
      time += 0.001;
      
      ctx.fillStyle = 'rgba(18, 18, 18, 0.02)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw shop-themed gradient orbs
      const drawShopOrb = (x: number, y: number, size: number, opacity: number, color: string) => {
        const offsetX = Math.sin(time * 0.5) * 30;
        const offsetY = Math.cos(time * 0.3) * 20;
        
        const gradient = ctx.createRadialGradient(
          x + offsetX, y + offsetY, 0,
          x + offsetX, y + offsetY, size
        );
        gradient.addColorStop(0, color.replace('rgb', 'rgba').replace(')', `, ${opacity})`));
        gradient.addColorStop(0.5, color.replace('rgb', 'rgba').replace(')', `, ${opacity * 0.5})`));
        gradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x + offsetX, y + offsetY, size, 0, Math.PI * 2);
        ctx.fill();
      };

      // Draw multiple orbs
      drawShopOrb(canvas.width * 0.2, canvas.height * 0.3, 150, 0.1, 'rgb(59, 130, 246)');
      drawShopOrb(canvas.width * 0.8, canvas.height * 0.7, 200, 0.08, 'rgb(239, 68, 68)');
      drawShopOrb(canvas.width * 0.5, canvas.height * 0.5, 100, 0.12, 'rgb(16, 185, 129)');

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Animated counter effect for Discord stats
  useEffect(() => {
    const animateValue = (start: number, end: number, duration: number, setter: (value: number) => void) => {
      const startTime = Date.now();
      const update = () => {
        const currentTime = Date.now();
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const currentValue = Math.floor(start + (end - start) * progress);
        setter(currentValue);
        
        if (progress < 1) {
          requestAnimationFrame(update);
        }
      };
      requestAnimationFrame(update);
    };

    if (discordSectionRef.isInView) {
      animateValue(0, 1610, 2000, setMemberCount);
      animateValue(0, 465, 1500, setActiveCount);
    }
  }, [discordSectionRef.isInView]);

  // Get statistics
  const totalProducts = React.useMemo(() => 
    collections.reduce((sum, collection) => sum + collection.productCount, 0), 
    [collections]
  );
  const avgProductsPerCollection = React.useMemo(() => 
    collections.length > 0 ? Math.round(totalProducts / collections.length) : 0, 
    [collections, totalProducts]
  );

  const renderContent = React.useCallback(() => {
    if (collectionsLoading) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div 
              key={i} 
              className="bg-lolcow-darkgray rounded-lg overflow-hidden skeleton hover-lift transition-all duration-300"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="aspect-square bg-lolcow-lightgray" />
              <div className="p-6 space-y-3">
                <div className="h-4 bg-lolcow-lightgray rounded w-3/4" />
                <div className="h-3 bg-lolcow-lightgray rounded w-full" />
                <div className="h-3 bg-lolcow-lightgray rounded w-2/3" />
                <div className="h-6 bg-lolcow-lightgray rounded w-1/2 mt-4" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-12 animate-on-scroll fade-up in-view">
          <ShoppingBag className="h-16 w-16 text-red-500 opacity-50 mx-auto mb-4 hover-rotate transition-transform duration-300" />
          <h3 className="text-xl font-fredoka text-white mb-2 hover-scale transition-transform duration-300">Unable to load collections</h3>
          <p className="text-gray-300 mb-4">
            {error instanceof Error ? error.message : "Something went wrong while fetching collections."}
          </p>
          <Button onClick={() => refetch()} className="btn-outline hover-lift transition-all duration-300 group">
            Try Again
            <Sparkles className="h-4 w-4 ml-2 group-hover:rotate-12 transition-transform duration-300" />
          </Button>
        </div>
      );
    }

    if (filteredCollections.length === 0) {
      return (
        <div className="text-center py-12 animate-on-scroll fade-up in-view">
          <ShoppingBag className="h-16 w-16 text-lolcow-blue opacity-50 mx-auto mb-4 hover-rotate transition-transform duration-300" />
          <h3 className="text-xl font-fredoka text-white mb-2 hover-scale transition-transform duration-300">
            {searchQuery ? "No collections found" : "No collections available"}
          </h3>
          <p className="text-gray-300">
            {searchQuery
              ? `No collections match "${searchQuery}". Try a different search term.`
              : "Collections will appear here once they're available."}
          </p>
          {searchQuery && (
            <Button 
              onClick={() => setSearchQuery("")} 
              className="btn-outline mt-4 hover-lift transition-all duration-300 group"
            >
              Clear Search
              <Search className="h-4 w-4 ml-2 group-hover:scale-110 transition-transform duration-300" />
            </Button>
          )}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-8">
        {filteredCollections.map((collection, index) => (
          <div 
            key={collection.id}
            className="animate-on-scroll scale-in hover-lift transition-all duration-300" 
            style={{ '--stagger-index': index } as React.CSSProperties}
          >
            <CollectionCard {...collection} />
          </div>
        ))}
      </div>
    );
  }, [collectionsLoading, error, filteredCollections, searchQuery]);

  return (
    <>
      {/* Page Loader */}
      {isLoading && (
        <div className="page-loader">
          <div className="loader-content">
            <div className="loader-logo">
              <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="50" cy="50" r="40" stroke="url(#gradient)" strokeWidth="4" fill="none" />
                <path d="M30 50 Q50 30 70 50 Q50 70 30 50" fill="url(#gradient)" />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FF3366" />
                    <stop offset="50%" stopColor="#FF6B6B" />
                    <stop offset="100%" stopColor="#4ECDC4" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className="loader-progress">
              <div className="loader-progress-bar" />
            </div>
          </div>
        </div>
      )}
      
      <div className={`flex flex-col min-h-screen ${isLoading ? 'opacity-0' : 'opacity-100'}`} style={{ transition: 'opacity 0.5s ease-out' }}>
        <SmoothScroll>
          <div className="flex flex-col min-h-screen">
        <Navbar />
      
      <main className="flex-grow bg-lolcow-black">
        {/* Enhanced Hero Section */}
        <section 
          ref={heroRef.ref}
          className={`relative py-32 bg-gradient-to-br from-lolcow-darkgray via-lolcow-black to-lolcow-darkgray overflow-hidden animate-on-scroll fade-up ${heroRef.isInView ? 'in-view' : ''}`}
        >
          {/* Enhanced animated mesh background */}
          <div className="shop-mesh-bg" />
          
          {/* Gradient overlay */}
          <div className="absolute inset-0 shop-hero-gradient" />
          {/* Animated Background Canvas */}
          <canvas 
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none opacity-60"
          />
          
          {/* Enhanced Parallax Background Elements */}
          <div 
            ref={parallaxHeroRef.ref}
            className="absolute inset-0"
          >
            {/* Floating shopping elements with enhanced animations */}
            <div className="absolute top-20 left-[10%] w-16 h-16 bg-lolcow-blue/20 rounded-lg rotate-12 floating-shop-element" />
            <div className="absolute top-32 right-[15%] w-12 h-12 bg-lolcow-red/25 rounded-full floating-shop-element" style={{ animationDelay: '3s' }} />
            <div className="absolute bottom-40 left-[20%] w-20 h-20 bg-green-500/20 rounded-lg -rotate-6 floating-shop-element" style={{ animationDelay: '6s' }} />
            <div className="absolute bottom-20 right-[10%] w-14 h-14 bg-yellow-500/20 rounded-full floating-shop-element" style={{ animationDelay: '9s' }} />
            
            {/* Enhanced gradient orbs */}
            <div className="shop-orb top-[20%] left-[25%] w-96 h-96 bg-lolcow-blue/30" />
            <div className="shop-orb bottom-[20%] right-[20%] w-80 h-80 bg-lolcow-red/30" style={{ animationDelay: '4s' }} />
            <div className="shop-orb top-[50%] left-[50%] w-64 h-64 bg-green-500/30" style={{ animationDelay: '8s' }} />
            
            {/* Shopping particles */}
            <div className="absolute top-[15%] left-[30%] w-2 h-2 bg-lolcow-blue/40 rounded-full animate-ping" style={{ animationDelay: '0s' }} />
            <div className="absolute top-[25%] right-[25%] w-3 h-3 bg-lolcow-red/30 rounded-full animate-ping" style={{ animationDelay: '2s' }} />
            <div className="absolute bottom-[30%] left-[40%] w-2 h-2 bg-green-500/30 rounded-full animate-ping" style={{ animationDelay: '4s' }} />
          </div>
          
          {/* Enhanced patterns and overlays */}
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }} />
          
          {/* Geometric shapes */}
          <div className="geometric-pattern square top-[15%] right-[10%] w-20 h-20" style={{ animationDelay: '0s' }} />
          <div className="geometric-pattern circle bottom-[25%] left-[8%] w-16 h-16" style={{ animationDelay: '5s' }} />
          <div className="geometric-pattern triangle top-[60%] right-[30%]" style={{ animationDelay: '10s' }} />
          
          {/* Floating particles */}
          <div className="shop-particle" style={{ animationDelay: '0s', left: '10%' }} />
          <div className="shop-particle" style={{ animationDelay: '3s', left: '30%' }} />
          <div className="shop-particle" style={{ animationDelay: '6s', left: '50%' }} />
          <div className="shop-particle" style={{ animationDelay: '9s', left: '70%' }} />
          <div className="shop-particle" style={{ animationDelay: '12s', left: '90%' }} />
          
          {/* Floating shopping icons */}
          <div className="absolute inset-0 pointer-events-none">
            <ShoppingBag className="absolute top-[20%] left-[8%] h-8 w-8 text-lolcow-blue/30 animate-pulse hover-rotate" style={{ animationDelay: '1s' }} />
            <Package className="absolute top-[30%] right-[12%] h-6 w-6 text-lolcow-red/30 animate-bounce" style={{ animationDelay: '2.5s' }} />
            <Star className="absolute bottom-[35%] left-[15%] h-7 w-7 text-yellow-500/30 animate-pulse" style={{ animationDelay: '3.5s' }} />
            <TrendingUp className="absolute bottom-[25%] right-[8%] h-6 w-6 text-green-500/30 animate-bounce" style={{ animationDelay: '0.5s' }} />
          </div>
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            {/* Animated Shop logo */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                <div className="absolute inset-0 bg-lolcow-blue/20 rounded-full blur-3xl" />
                <div className="relative z-10 w-20 h-20 bg-gradient-to-br from-lolcow-blue to-lolcow-red rounded-full flex items-center justify-center">
                  <ShoppingBag className="h-10 w-10 text-white" />
                </div>
                <div className="absolute -inset-4">
                  <div className="absolute inset-0 rounded-full border border-lolcow-blue/30 animate-ping" />
                  <div className="absolute inset-0 rounded-full border border-lolcow-red/30 animate-ping" style={{ animationDelay: '0.5s' }} />
                </div>
              </div>
            </div>
            
            <div className="text-center">
              <div 
                ref={heroTitleRef.ref}
                className={`hero-animate hero-title animate-on-scroll fade-up duration-slow ${heroRef.isInView ? 'in-view' : ''}`}
              >
                <h1 className="text-5xl md:text-7xl font-fredoka text-white mb-6 leading-tight">
                  <span className="text-lolcow-blue hover-scale inline-block transition-transform duration-300 cursor-pointer">LOL</span>
                  <span className="text-lolcow-red hover-scale inline-block transition-transform duration-300 cursor-pointer">COW</span>
                  <span className="text-white hover-scale inline-block transition-transform duration-300 cursor-pointer"> Shop</span>
                </h1>
              </div>
              
              <div className={`hero-animate hero-subtitle animate-on-scroll fade-up duration-slow ${heroRef.isInView ? 'in-view' : ''}`}>
                <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed mb-8">
                  Discover exclusive LolCow merchandise and collections. From classic tees to limited edition items, 
                  find the perfect gear to show your love for the worst podcast on the internet.
                </p>
              </div>
              
              {/* Live shop stats */}
              <div ref={statsRef.ref} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12 max-w-3xl mx-auto stagger-container">
                <div className="discord-glass rounded-xl p-4 text-center transform transition-all duration-300 hover:scale-105 animate-on-scroll fade-up">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <Package className="h-5 w-5 text-lolcow-blue" />
                    <span className="text-gray-400 text-sm">Collections</span>
                  </div>
                  <div className="text-3xl font-bold text-white counter-pop">
                    {collections.length}
                  </div>
                </div>
                
                <div className="discord-glass rounded-xl p-4 text-center transform transition-all duration-300 hover:scale-105 animate-on-scroll fade-up">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <ShoppingBag className="h-5 w-5 text-lolcow-red" />
                    <span className="text-gray-400 text-sm">Products</span>
                  </div>
                  <div className="text-3xl font-bold text-white counter-pop">
                    {totalProducts}
                  </div>
                </div>
                
                <div className="discord-glass rounded-xl p-4 text-center transform transition-all duration-300 hover:scale-105 animate-on-scroll fade-up">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <Star className="h-5 w-5 text-yellow-500" />
                    <span className="text-gray-400 text-sm">Avg per Collection</span>
                  </div>
                  <div className="text-3xl font-bold text-white counter-pop">
                    {avgProductsPerCollection}
                  </div>
                </div>
              </div>
              
              <div className={`hero-animate hero-cta animate-on-scroll fade-up duration-slow ${heroRef.isInView ? 'in-view' : ''}`}>
                <div className="flex flex-wrap justify-center gap-4">
                  <Button 
                    asChild
                    className="bg-lolcow-blue hover:bg-lolcow-blue/80 text-white font-semibold px-8 py-4 text-lg hover-lift transition-all duration-300 group"
                  >
                    <a href="#collections">
                      Browse Collections
                      <ShoppingBag className="h-5 w-5 ml-2 group-hover:scale-110 transition-transform duration-300" />
                    </a>
                  </Button>
                  <Button 
                    asChild
                    variant="outline"
                    className="border-lolcow-red text-lolcow-red hover:bg-lolcow-red hover:text-white font-semibold px-8 py-4 text-lg hover-lift transition-all duration-300 group"
                  >
                    <a href="#featured">
                      Best Sellers
                      <TrendingUp className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Flash Sales Banner */}
        {!flashSalesLoading && flashSales.length > 0 && (
          <section 
            ref={flashSalesRef.ref}
            className={`py-6 animate-on-scroll fade-down ${flashSalesRef.isInView ? 'in-view' : ''}`}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="hover-lift transition-transform duration-300">
                <FlashSalesBanner />
              </div>
            </div>
          </section>
        )}

        {/* Featured Products Section */}
        {!featuredProductsLoading && featuredProducts.length > 0 && (
          <section 
            id="featured"
            ref={featuredProductsRef.ref}
            className={`py-20 bg-gradient-to-r from-lolcow-black via-lolcow-darkgray to-lolcow-black relative overflow-hidden animate-on-scroll fade-up ${featuredProductsRef.isInView ? 'in-view' : ''}`}
          >
            {/* Background texture overlay */}
            <div className="absolute inset-0 opacity-5">
              <div className="absolute inset-0" style={{
                backgroundImage: `repeating-linear-gradient(
                  45deg,
                  transparent,
                  transparent 10px,
                  rgba(255,255,255,0.05) 10px,
                  rgba(255,255,255,0.05) 20px
                )`
              }} />
            </div>
            
            {/* Animated gradient orbs */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-lolcow-blue/10 rounded-full filter blur-3xl animate-pulse" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-lolcow-red/10 rounded-full filter blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
            
            {/* Dot pattern texture */}
            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)`,
              backgroundSize: '30px 30px'
            }} />
            
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
              <div className={`text-center mb-16 animate-on-scroll fade-up ${featuredProductsRef.isInView ? 'in-view' : ''}`}>
                <div className="flex items-center justify-center gap-3 mb-6">
                  <Crown className="h-10 w-10 text-lolcow-red animate-bounce hover-rotate" style={{ animationDelay: '0s' }} />
                  <h2 className="text-4xl md:text-5xl font-fredoka text-white hover-scale transition-transform duration-300">
                    Best Sellers
                  </h2>
                  <Crown className="h-10 w-10 text-lolcow-red animate-bounce hover-rotate" style={{ animationDelay: '0.5s' }} />
                </div>
                <p className="text-gray-300 text-xl max-w-3xl mx-auto">
                  Our most popular products based on actual sales - see what the LolCow community is buying!
                </p>
              </div>

              <div 
                ref={productsGridRef.ref}
                className={`grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto stagger-container ${productsGridRef.isInView ? 'in-view' : ''}`}
              >
                {featuredProducts.map((product, index) => (
                  <div 
                    key={product.id} 
                    className="animate-on-scroll scale-in-bounce hover-lift transition-all duration-300" 
                    style={{ '--stagger-index': index } as React.CSSProperties}
                  >
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
              
              {/* Show message if we have fewer than expected products */}
              {featuredProductsData && featuredProductsData.products.length < 6 && (
                <div className="text-center mt-8 p-4 bg-lolcow-darkgray/50 rounded-lg max-w-2xl mx-auto">
                  <p className="text-gray-300">
                    {featuredProductsData.products.length === 0 
                      ? "All best sellers are currently sold out. Check back soon for restocks!"
                      : featuredProductsData.products.length < 3
                      ? `Limited stock - only ${featuredProductsData.products.length} best seller${featuredProductsData.products.length === 1 ? '' : 's'} available!`
                      : `Showing ${featuredProductsData.products.length} best sellers currently in stock.`}
                  </p>
                </div>
              )}

              <div className={`text-center mt-16 animate-on-scroll fade-up ${featuredProductsRef.isInView ? 'in-view' : ''}`}>
                <Button 
                  asChild
                  className="bg-lolcow-blue hover:bg-lolcow-blue/80 text-white font-semibold px-10 py-4 text-lg shadow-lg hover:shadow-xl hover-lift transition-all duration-300 group"
                >
                  <a href="/shop/products">
                    View All Products
                    <Sparkles className="h-5 w-5 ml-2 group-hover:rotate-12 transition-transform duration-300" />
                  </a>
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* New Products Section */}
        {!newProductsLoading && newProducts.length > 0 && (
          <section 
            ref={newProductsRef.ref}
            className={`py-20 bg-gradient-to-r from-lolcow-black via-lolcow-darkgray/50 to-lolcow-black relative overflow-hidden animate-on-scroll fade-up ${newProductsRef.isInView ? 'in-view' : ''}`}
          >
            {/* Background gradient */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0" style={{
                backgroundImage: `linear-gradient(135deg, transparent 25%, rgba(59, 130, 246, 0.1) 25%, rgba(59, 130, 246, 0.1) 50%, transparent 50%, transparent 75%, rgba(59, 130, 246, 0.1) 75%, rgba(59, 130, 246, 0.1))`,
                backgroundSize: '40px 40px'
              }} />
            </div>
            
            <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
              <div className={`text-center mb-12 animate-on-scroll fade-up ${newProductsRef.isInView ? 'in-view' : ''}`}>
                <div className="inline-flex items-center gap-2 mb-4">
                  <div className="bg-lolcow-blue text-white px-4 py-2 rounded-full text-sm font-bold animate-slow-pulse hover-scale transition-transform duration-300">
                    NEW
                  </div>
                  <h2 className="text-3xl md:text-4xl font-fredoka text-white hover-scale transition-transform duration-300">
                    New Arrivals
                  </h2>
                </div>
                <p className="text-gray-300 text-lg max-w-2xl mx-auto">
                  Check out the latest additions to our collection
                </p>
              </div>

              <div
                ref={newProductsGridRef.ref}
                className={`grid grid-cols-1 md:grid-cols-2 gap-6 stagger-container ${newProductsGridRef.isInView ? 'in-view' : ''}`}
              >
                {newProducts.map((product, index) => (
                  <div 
                    key={product.id} 
                    className="animate-on-scroll scale-in hover-lift transition-all duration-300" 
                    style={{ '--stagger-index': index } as React.CSSProperties}
                  >
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>

              <div className={`text-center mt-10 animate-on-scroll fade-up ${newProductsRef.isInView ? 'in-view' : ''}`}>
                <Button 
                  asChild
                  variant="outline"
                  className="border-lolcow-blue text-lolcow-blue hover:bg-lolcow-blue hover:text-white hover-lift transition-all duration-300 group"
                >
                  <a href="/shop/products?sort=newest">
                    View All New Products
                    <TrendingUp className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
                  </a>
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* Enhanced Search Collections Section */}
        <section 
          ref={searchSectionRef.ref}
          className={`relative find-collection-wrapper animate-on-scroll fade-up ${searchSectionRef.isInView ? 'in-view' : ''}`}
        >
          {/* Enhanced background effects */}
          <div className="find-collection-bg" />
          
          {/* Particle field overlay */}
          <div className="particle-field">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="particle"
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 20}s`,
                  animationDuration: `${20 + Math.random() * 10}s`
                }}
              />
            ))}
          </div>
          
          {/* Geometric overlay pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '60px 60px'
          }} />
          
          <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            {/* Enhanced title with icon */}
            <div className={`flex items-center justify-center gap-4 mb-8 animate-on-scroll fade-up ${searchSectionRef.isInView ? 'in-view' : ''}`}>
              <Search className="h-8 w-8 text-lolcow-blue animate-pulse" />
              <h2 className="text-3xl md:text-4xl font-fredoka text-white hover-scale transition-transform duration-300">
                <span className="bg-gradient-to-r from-lolcow-blue via-white to-lolcow-red bg-clip-text text-transparent">
                  Find Your Collection
                </span>
              </h2>
              <Sparkles className="h-8 w-8 text-lolcow-red animate-pulse" style={{ animationDelay: '0.5s' }} />
            </div>
            
            {/* Search stats */}
            <div className={`flex justify-center gap-6 mb-6 text-sm animate-on-scroll fade-up ${searchSectionRef.isInView ? 'in-view' : ''}`}>
              <div className="flex items-center gap-2 text-gray-400">
                <ShoppingBag className="h-4 w-4" />
                <span>{collections.length} Collections</span>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <Package className="h-4 w-4" />
                <span>{totalProducts} Products</span>
              </div>
            </div>
            
            {/* Enhanced search input */}
            <div className={`max-w-2xl mx-auto relative animate-on-scroll scale-in ${searchSectionRef.isInView ? 'in-view' : ''}`}>
              <div className="relative search-section section-transition">
                <div className="search-glow" />
                <div className="absolute left-6 top-1/2 transform -translate-y-1/2 z-10">
                  <Search className="h-7 w-7 text-gray-400 search-icon-animated" />
                </div>
                <Input
                  type="text"
                  placeholder="Search collections by name or description..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="search-input-enhanced pl-16 pr-14 py-6 text-xl text-white placeholder-gray-400 rounded-2xl w-full relative z-10 font-medium"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-6 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-all duration-300 z-10 hover:scale-110"
                  >
                    <XCircle className="h-6 w-6" />
                  </button>
                )}
              </div>
              
              {/* Search hint */}
              {searchQuery && (
                <div className={`mt-4 text-center animate-on-scroll fade-up ${searchSectionRef.isInView ? 'in-view' : ''}`}>
                  <p className="text-sm text-gray-400">
                    Showing collections matching "<span className="text-lolcow-blue font-semibold">{searchQuery}</span>"
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Enhanced Collections Section */}
        <section 
          id="collections"
          ref={collectionsSectionRef.ref}
          className={`collections-section-enhanced py-20 relative overflow-hidden animate-on-scroll fade-up ${collectionsSectionRef.isInView ? 'in-view' : ''}`}
        >
          {/* Enhanced background mesh */}
          <div className="collections-bg-mesh" />
          {/* Hexagon pattern texture */}
          <div className="absolute inset-0 opacity-5" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M50 5 L90 25 L90 75 L50 95 L10 75 L10 25 Z' fill='none' stroke='white' stroke-width='0.5'/%3E%3C/svg%3E")`,
            backgroundSize: '100px 100px'
          }} />
          
          {/* Wave pattern overlay */}
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: `repeating-linear-gradient(
              90deg,
              transparent,
              transparent 20px,
              rgba(59, 130, 246, 0.1) 20px,
              rgba(59, 130, 246, 0.1) 40px
            ),
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 20px,
              rgba(239, 68, 68, 0.1) 20px,
              rgba(239, 68, 68, 0.1) 40px
            )`
          }} />
          
          {/* Floating circles animation */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute w-72 h-72 bg-lolcow-red/5 rounded-full -top-36 -left-36 animate-pulse" style={{ animationDuration: '8s' }} />
            <div className="absolute w-96 h-96 bg-lolcow-blue/5 rounded-full -bottom-48 -right-48 animate-pulse" style={{ animationDuration: '10s' }} />
            <div className="absolute w-64 h-64 bg-lolcow-red/5 rounded-full top-1/2 left-1/3 animate-pulse" style={{ animationDuration: '6s' }} />
          </div>
          
          {/* Grid dots texture */}
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }} />
          
          {/* Parallax Background Elements */}
          <div 
            ref={parallaxBgRef.ref}
            className="absolute inset-0 opacity-20"
          >
            <div className="absolute top-20 left-20 w-40 h-40 bg-lolcow-blue/20 rounded-full filter blur-3xl animate-pulse" />
            <div className="absolute bottom-20 right-20 w-56 h-56 bg-lolcow-red/15 rounded-full filter blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />
          </div>
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className={`text-center mb-16 animate-on-scroll fade-up ${collectionsSectionRef.isInView ? 'in-view' : ''}`}>
              <h2 className="text-4xl md:text-5xl font-fredoka text-white mb-6 hover-scale transition-transform duration-300">
                Shop by Collection
              </h2>
              <p className="text-gray-300 text-xl max-w-3xl mx-auto">
                Browse our curated collections and find the perfect gear for every LolCow fan
              </p>
              
              {/* Statistics */}
              {!collectionsLoading && collections.length > 0 && (
                <div className={`flex flex-wrap justify-center gap-8 mt-8 animate-on-scroll fade-up ${collectionsSectionRef.isInView ? 'in-view' : ''}`}>
                  <div className="flex items-center gap-2 text-sm hover-lift transition-transform duration-300">
                    <ShoppingBag className="h-4 w-4 text-lolcow-blue hover-rotate transition-transform duration-300" />
                    <span className="text-white font-semibold counter-animate">{collections.length}</span>
                    <span className="text-gray-300">Collections</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm hover-lift transition-transform duration-300">
                    <Sparkles className="h-4 w-4 text-lolcow-red hover-rotate transition-transform duration-300" />
                    <span className="text-white font-semibold counter-animate">{totalProducts}</span>
                    <span className="text-gray-300">Total Products</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm hover-lift transition-transform duration-300">
                    <TrendingUp className="h-4 w-4 text-green-400 hover-rotate transition-transform duration-300" />
                    <span className="text-white font-semibold counter-animate">{avgProductsPerCollection}</span>
                    <span className="text-gray-300">Avg per Collection</span>
                  </div>
                </div>
              )}
            </div>

            <div 
              ref={collectionsGridRef.ref}
              className={`stagger-container ${collectionsGridRef.isInView ? 'in-view' : ''}`}
            >
              {renderContent()}
            </div>
          </div>
        </section>

        {/* Discord Community */}
        {!collectionsLoading && !error && collections.length > 0 && (
          <section 
            ref={discordSectionRef.ref}
            className={`relative py-24 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 overflow-hidden animate-on-scroll fade-up ${discordSectionRef.isInView ? 'in-view' : ''}`}
          >
            {/* Animated gradient mesh */}
            <div className="absolute inset-0 discord-mesh opacity-30" />
            
            {/* Floating Discord elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {/* Floating Discord logos */}
              <i className="fa-brands fa-discord absolute text-discord-blurple/20 text-4xl top-20 left-[10%] icon-float-1" />
              <i className="fa-brands fa-discord absolute text-discord-blurple/15 text-6xl top-40 right-[15%] icon-float-2" />
              <i className="fa-brands fa-discord absolute text-discord-blurple/10 text-3xl bottom-20 left-[70%] icon-float-1" style={{ animationDelay: '-10s' }} />
              
              {/* Floating emojis */}
              <span className="absolute text-4xl top-32 right-[25%] opacity-30 icon-float-2">🎮</span>
              <span className="absolute text-3xl top-60 left-[20%] opacity-25 icon-float-1" style={{ animationDelay: '-5s' }}>🔊</span>
              <span className="absolute text-5xl bottom-40 right-[30%] opacity-20 icon-float-2" style={{ animationDelay: '-15s' }}>💬</span>
              <span className="absolute text-3xl bottom-32 left-[15%] opacity-30 icon-float-1" style={{ animationDelay: '-7s' }}>🎉</span>
              
              {/* Animated chat messages */}
              <div className="absolute top-[20%] left-[5%] discord-glass rounded-lg p-3 max-w-[200px] message-bubble" style={{ animationDelay: '0s' }}>
                <div className="flex items-center space-x-2 mb-1">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-lolcow-red to-lolcow-blue" />
                  <span className="text-xs text-gray-400">MooFan42</span>
                </div>
                <p className="text-xs text-gray-300">Just joined the stream! 🐄</p>
              </div>
              
              <div className="absolute top-[40%] right-[8%] discord-glass rounded-lg p-3 max-w-[200px] message-bubble" style={{ animationDelay: '3s' }}>
                <div className="flex items-center space-x-2 mb-1">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-discord-blurple to-lolcow-blue" />
                  <span className="text-xs text-gray-400">CowTipper</span>
                </div>
                <p className="text-xs text-gray-300">Can't wait for tonight's episode!</p>
              </div>
              
              <div className="absolute bottom-[30%] left-[12%] discord-glass rounded-lg p-3 max-w-[180px] message-bubble" style={{ animationDelay: '6s' }}>
                <div className="flex items-center space-x-2 mb-1">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-400 to-blue-500" />
                  <span className="text-xs text-gray-400">LolCowLover</span>
                </div>
                <p className="text-xs text-gray-300">Voice chat is lit! 🔥</p>
              </div>
              
              {/* Discord particles */}
              <div className="discord-particle w-2 h-2 bg-discord-blurple/30 rounded-full left-[20%]" style={{ animationDelay: '0s' }} />
              <div className="discord-particle w-3 h-3 bg-lolcow-blue/20 rounded-full left-[50%]" style={{ animationDelay: '5s' }} />
              <div className="discord-particle w-2 h-2 bg-lolcow-red/25 rounded-full left-[80%]" style={{ animationDelay: '10s' }} />
            </div>
            
            <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
              {/* Animated Discord logo */}
              <div className="flex justify-center mb-8">
                <div className="relative">
                  <div className="absolute inset-0 bg-discord-blurple/30 rounded-full blur-3xl discord-blob" />
                  <i className="fa-brands fa-discord text-7xl text-discord-blurple discord-float relative z-10" />
                  <div className="absolute -inset-4">
                    <div className="discord-ripple bg-discord-blurple/20" />
                    <div className="discord-ripple bg-discord-blurple/20" style={{ animationDelay: '0.5s' }} />
                    <div className="discord-ripple bg-discord-blurple/20" style={{ animationDelay: '1s' }} />
                  </div>
                </div>
              </div>
              
              <h2 className="text-4xl md:text-5xl font-fredoka text-white mb-6 text-center animate-on-scroll fade-up duration-slow">
                <span className="bg-gradient-to-r from-discord-blurple via-white to-lolcow-blue bg-clip-text text-transparent">
                  Join the LolCow Community
                </span>
              </h2>
              
              {/* Live stats cards */}
              <div ref={discordStatsRef.ref} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12 max-w-2xl mx-auto stagger-container">
                {/* Total members */}
                <div className="discord-glass rounded-xl p-4 text-center transform transition-all duration-300 hover:scale-105 animate-on-scroll fade-up">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <Users className="h-5 w-5 text-discord-blurple" />
                    <span className="text-gray-400 text-sm">Total Members</span>
                  </div>
                  <div className="text-3xl font-bold text-white counter-pop">
                    {memberCount.toLocaleString()}
                  </div>
                </div>
                
                {/* Online now */}
                <div className="discord-glass rounded-xl p-4 text-center transform transition-all duration-300 hover:scale-105 animate-on-scroll fade-up">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <div className="relative">
                      <div className="w-3 h-3 bg-green-500 rounded-full" />
                      <div className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full presence-pulse" />
                    </div>
                    <span className="text-gray-400 text-sm">Online Now</span>
                  </div>
                  <div className="text-3xl font-bold text-white counter-pop">
                    {activeCount}
                  </div>
                </div>
              </div>
              
              {/* Benefits section */}
              <div className="mb-12">
                <h3 className="text-2xl font-fredoka text-white mb-6 text-center animate-on-scroll fade-up">Why Join Our Discord?</h3>
                <div ref={benefitsRef.ref} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto stagger-container">
                  {/* Benefit cards */}
                  <div className="group animate-on-scroll fade-up">
                    <div className="discord-glass rounded-lg p-4 transform transition-all duration-300 group-hover:scale-105 glass-shimmer">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-discord-blurple/20 flex items-center justify-center">
                          <Sparkles className="h-5 w-5 text-discord-blurple" />
                        </div>
                        <h4 className="font-semibold text-white">Exclusive Content</h4>
                      </div>
                      <p className="text-gray-400 text-sm">Early access to new episodes and behind-the-scenes content</p>
                    </div>
                  </div>
                  
                  <div className="group animate-on-scroll fade-up">
                    <div className="discord-glass rounded-lg p-4 transform transition-all duration-300 group-hover:scale-105 glass-shimmer">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-lolcow-red/20 flex items-center justify-center">
                          <MessageCircle className="h-5 w-5 text-lolcow-red" />
                        </div>
                        <h4 className="font-semibold text-white">Live Shows</h4>
                      </div>
                      <p className="text-gray-400 text-sm">Join live podcast recordings and Q&A sessions</p>
                    </div>
                  </div>
                  
                  <div className="group animate-on-scroll fade-up">
                    <div className="discord-glass rounded-lg p-4 transform transition-all duration-300 group-hover:scale-105 glass-shimmer">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-lolcow-blue/20 flex items-center justify-center">
                          <Users className="h-5 w-5 text-lolcow-blue" />
                        </div>
                        <h4 className="font-semibold text-white">Community Events</h4>
                      </div>
                      <p className="text-gray-400 text-sm">Game nights, contests, and community challenges</p>
                    </div>
                  </div>
                  
                  <div className="group animate-on-scroll fade-up">
                    <div className="discord-glass rounded-lg p-4 transform transition-all duration-300 group-hover:scale-105 glass-shimmer">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                          <Zap className="h-5 w-5 text-green-500" />
                        </div>
                        <h4 className="font-semibold text-white">Direct Access</h4>
                      </div>
                      <p className="text-gray-400 text-sm">Chat directly with the hosts and other fans</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* CTA Button */}
              <div className="flex justify-center animate-on-scroll fade-up duration-slow timing-bounce">
                <a 
                  href="/login" 
                  className="relative inline-flex items-center space-x-2 px-8 py-4 bg-discord-blurple text-white font-semibold rounded-lg transform transition-all duration-300 hover:scale-105 discord-button-glow group no-underline hover:no-underline"
                >
                  <i className="fa-brands fa-discord text-2xl group-hover:rotate-12 transition-transform duration-300" />
                  <span className="text-lg">Join {memberCount.toLocaleString()}+ Members</span>
                  <ChevronRight className="h-5 w-5 opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300" />
                </a>
              </div>
              
              {/* Server preview hint */}
              <p className="text-center mt-6 text-gray-500 text-sm">
                <span className="inline-flex items-center space-x-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span>Active community with {activeCount} members online now</span>
                </span>
              </p>
            </div>
          </section>
        )}
      </main>
      
      <Footer />
          </div>
        </SmoothScroll>
      </div>

      {/* Floating admin button for uninitialized collections */}
      {isAdmin && hasUninitializedCollections && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className="bg-yellow-500/10 backdrop-blur-md border border-yellow-500/20 rounded-lg p-4 mb-4 max-w-sm">
            <p className="text-sm text-yellow-200 mb-2">
              Some collections are not initialized. Initialize them to control visibility and order.
            </p>
            <Button 
              onClick={handleInitializeCollections}
              className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold w-full"
            >
              <Settings className="h-4 w-4 mr-2" />
              Initialize Collections
            </Button>
          </div>
          <Button
            asChild
            className="bg-lolcow-blue hover:bg-lolcow-blue/80 text-white font-semibold w-full"
          >
            <a href="/admin/collection-order">
              Go to Collection Manager
            </a>
          </Button>
        </div>
      )}
    </>
  );
};

export default Shop;