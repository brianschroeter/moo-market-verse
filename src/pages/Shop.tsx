import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CollectionCard from "@/components/shop/CollectionCard";
import ProductCard from "@/components/shop/ProductCard";
import FlashSalesBanner from "@/components/shop/FlashSalesBanner";
import { getCollections, getFeaturedProducts, getNewProducts } from "@/services/shopify/shopifyStorefrontService";
import { getActiveFlashSales } from "@/services/flashSalesService";
import { getVisibleCollectionOrders } from "@/services/collectionOrderService";
import { Collection } from "@/services/types/shopify-types";
import { Search, ShoppingBag, Sparkles, TrendingUp, Star, Crown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const Shop: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredCollections, setFilteredCollections] = useState<Collection[]>([]);

  const {
    data: collectionsResponse,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ["collections"],
    queryFn: () => getCollections({ limit: 50 }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const {
    data: featuredProductsData,
    isLoading: featuredProductsLoading,
    error: featuredProductsError
  } = useQuery({
    queryKey: ["featured-products"],
    queryFn: async () => {
      // Get featured products - the edge function now filters out unavailable products by default
      const products = await getFeaturedProducts(6);
      
      return {
        products,
        hasEnoughProducts: products.length >= 6,
        availableCount: products.length, // All returned products are available now
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  const featuredProducts = featuredProductsData?.products || [];

  const {
    data: newProductsData,
    isLoading: newProductsLoading,
    error: newProductsError
  } = useQuery({
    queryKey: ["new-products"],
    queryFn: async () => {
      const products = await getNewProducts(4);
      return products;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  const newProducts = newProductsData || [];

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

  const collections = collectionsResponse?.data || [];

  // Update filtered collections when collections, collection orders, or search query changes
  React.useEffect(() => {
    let filtered = collections;
    
    // Apply search filter
    if (searchQuery.trim()) {
      filtered = collections.filter(collection =>
        collection.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        collection.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Sort by custom order if available, otherwise by name
    if (collectionOrders.length > 0) {
      // Create a map of collection handles to their display order
      const orderMap = new Map(collectionOrders.map(order => [order.collection_handle, order.display_order]));
      
      filtered = [...filtered].sort((a, b) => {
        const orderA = orderMap.get(a.handle) ?? Number.MAX_SAFE_INTEGER;
        const orderB = orderMap.get(b.handle) ?? Number.MAX_SAFE_INTEGER;
        
        // If both have custom order, sort by display_order
        if (orderA !== Number.MAX_SAFE_INTEGER && orderB !== Number.MAX_SAFE_INTEGER) {
          return orderA - orderB;
        }
        
        // If one has custom order and other doesn't, prioritize the one with custom order
        if (orderA !== Number.MAX_SAFE_INTEGER) return -1;
        if (orderB !== Number.MAX_SAFE_INTEGER) return 1;
        
        // If neither have custom order, sort by name
        return a.title.localeCompare(b.title);
      });
    } else {
      // Sort by name by default
      filtered = [...filtered].sort((a, b) => a.title.localeCompare(b.title));
    }
    
    setFilteredCollections(filtered);
  }, [collections, collectionOrders, searchQuery]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Get statistics
  const totalProducts = collections.reduce((sum, collection) => sum + collection.productCount, 0);
  const avgProductsPerCollection = collections.length > 0 ? Math.round(totalProducts / collections.length) : 0;

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-lolcow-darkgray rounded-lg overflow-hidden animate-pulse">
              <div className="aspect-square bg-lolcow-lightgray" />
              <div className="p-6 space-y-3">
                <div className="h-4 bg-lolcow-lightgray rounded w-3/4" />
                <div className="h-3 bg-lolcow-lightgray rounded w-full" />
                <div className="h-3 bg-lolcow-lightgray rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-12">
          <ShoppingBag className="h-16 w-16 text-red-500 opacity-50 mx-auto mb-4" />
          <h3 className="text-xl font-fredoka text-white mb-2">Unable to load collections</h3>
          <p className="text-gray-300 mb-4">
            {error instanceof Error ? error.message : "Something went wrong while fetching collections."}
          </p>
          <Button onClick={() => refetch()} className="btn-outline">
            Try Again
          </Button>
        </div>
      );
    }

    if (filteredCollections.length === 0) {
      return (
        <div className="text-center py-12">
          <ShoppingBag className="h-16 w-16 text-lolcow-blue opacity-50 mx-auto mb-4" />
          <h3 className="text-xl font-fredoka text-white mb-2">
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
              className="btn-outline mt-4"
            >
              Clear Search
            </Button>
          )}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {filteredCollections.map((collection) => (
          <CollectionCard
            key={collection.id}
            {...collection}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className="flex-grow bg-lolcow-black">
        {/* Hero Section */}
        <section className="py-12 bg-gradient-to-r from-lolcow-darkgray to-lolcow-black">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl md:text-5xl font-fredoka text-white mb-4">
              <span className="text-lolcow-blue">LOL</span>
              <span className="text-lolcow-red">COW</span>
              <span className="text-white"> Shop</span>
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Discover exclusive LolCow merchandise and collections. From classic tees to limited edition items, 
              find the perfect gear to show your love for the worst podcast on the internet.
            </p>
          </div>
        </section>

        {/* Flash Sales Banner */}
        {!flashSalesLoading && flashSales.length > 0 && (
          <section className="py-4">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <FlashSalesBanner />
            </div>
          </section>
        )}

        {/* Featured Products Section */}
        {!featuredProductsLoading && featuredProducts.length > 0 && (
          <section className="py-20 bg-gradient-to-r from-lolcow-black via-lolcow-darkgray to-lolcow-black relative overflow-hidden">
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
              <div className="text-center mb-16">
                <div className="flex items-center justify-center gap-3 mb-6">
                  <Crown className="h-10 w-10 text-lolcow-red animate-bounce" style={{ animationDelay: '0s' }} />
                  <h2 className="text-4xl md:text-5xl font-fredoka text-white">
                    Best Sellers
                  </h2>
                  <Crown className="h-10 w-10 text-lolcow-red animate-bounce" style={{ animationDelay: '0.5s' }} />
                </div>
                <p className="text-gray-300 text-xl max-w-3xl mx-auto">
                  Discover our top-selling products loved by the LolCow community
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                {featuredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
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

              <div className="text-center mt-16">
                <Button 
                  asChild
                  className="bg-lolcow-blue hover:bg-lolcow-blue/80 text-white font-semibold px-10 py-4 text-lg shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <a href="/shop/products">
                    View All Products
                    <Sparkles className="h-5 w-5 ml-2" />
                  </a>
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* New Products Section */}
        {!newProductsLoading && newProducts.length > 0 && (
          <section className="py-20 bg-gradient-to-r from-lolcow-black via-lolcow-darkgray/50 to-lolcow-black relative overflow-hidden">
            {/* Background gradient */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0" style={{
                backgroundImage: `linear-gradient(135deg, transparent 25%, rgba(59, 130, 246, 0.1) 25%, rgba(59, 130, 246, 0.1) 50%, transparent 50%, transparent 75%, rgba(59, 130, 246, 0.1) 75%, rgba(59, 130, 246, 0.1))`,
                backgroundSize: '40px 40px'
              }} />
            </div>
            
            <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
              <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 mb-4">
                  <div className="bg-lolcow-blue text-white px-4 py-2 rounded-full text-sm font-bold animate-pulse">
                    NEW
                  </div>
                  <h2 className="text-3xl md:text-4xl font-fredoka text-white">
                    New Arrivals
                  </h2>
                </div>
                <p className="text-gray-300 text-lg max-w-2xl mx-auto">
                  Check out the latest additions to our collection
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {newProducts.map((product, index) => (
                  <div key={product.id} className="relative">
                    {/* NEW badge with days counter */}
                    <div className="absolute top-3 left-3 z-10 flex flex-col gap-1">
                      <span className="bg-lolcow-blue text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                        NEW
                      </span>
                    </div>
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>

              <div className="text-center mt-10">
                <Button 
                  asChild
                  variant="outline"
                  className="border-lolcow-blue text-lolcow-blue hover:bg-lolcow-blue hover:text-white"
                >
                  <a href="/shop/products?sort=newest">
                    View All New Products
                    <TrendingUp className="h-4 w-4 ml-2" />
                  </a>
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* Search Collections Section */}
        <section className="py-12 bg-lolcow-black/50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl md:text-3xl font-fredoka text-white mb-6">
              Find Your Collection
            </h2>
            <div className="max-w-lg mx-auto relative">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-6 w-6" />
                <Input
                  type="text"
                  placeholder="Search collections..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="pl-12 pr-4 py-4 text-lg bg-lolcow-lightgray border-lolcow-lightgray text-white placeholder-gray-400 focus:border-lolcow-blue rounded-xl"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Collections Section */}
        <section className="py-20 bg-gradient-to-r from-lolcow-black via-lolcow-darkgray to-lolcow-black relative overflow-hidden">
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
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-fredoka text-white mb-6">
                Shop by Collection
              </h2>
              <p className="text-gray-300 text-xl max-w-3xl mx-auto">
                Browse our curated collections and find the perfect gear for every LolCow fan
              </p>
              
              {/* Statistics */}
              {!isLoading && collections.length > 0 && (
                <div className="flex flex-wrap justify-center gap-8 mt-8">
                  <div className="flex items-center gap-2 text-sm">
                    <ShoppingBag className="h-4 w-4 text-lolcow-blue" />
                    <span className="text-white font-semibold">{collections.length}</span>
                    <span className="text-gray-300">Collections</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Sparkles className="h-4 w-4 text-lolcow-red" />
                    <span className="text-white font-semibold">{totalProducts}</span>
                    <span className="text-gray-300">Total Products</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <TrendingUp className="h-4 w-4 text-green-400" />
                    <span className="text-white font-semibold">{avgProductsPerCollection}</span>
                    <span className="text-gray-300">Avg per Collection</span>
                  </div>
                </div>
              )}
            </div>

            {renderContent()}
          </div>
        </section>

        {/* Call to Action */}
        {!isLoading && !error && collections.length > 0 && (
          <section className="py-16 bg-lolcow-darkgray">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <h2 className="text-3xl font-fredoka text-white mb-4">
                Join the LolCow Community
              </h2>
              <p className="text-gray-300 text-lg mb-8 max-w-2xl mx-auto">
                Get the latest updates on new products, exclusive releases, and community events.
                Be the first to know about limited edition drops.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild className="btn-primary">
                  <a href="/profile">Join Community</a>
                </Button>
                <Button asChild className="btn-outline">
                  <a href="https://lolcow.co" target="_blank" rel="noopener noreferrer">
                    Visit Main Store
                  </a>
                </Button>
              </div>
            </div>
          </section>
        )}
      </main>
      
      <Footer />
    </div>
  );
};

export default Shop;