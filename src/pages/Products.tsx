import React, { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductCard from "@/components/shop/ProductCard";
import ProductSkeleton from "@/components/shop/ProductSkeleton";
import ComingSoonCard from "@/components/shop/ComingSoonCard";
import RecentlyViewed from "@/components/shop/RecentlyViewed";
import ProductRecommendations from "@/components/shop/ProductRecommendations";
import { getCollections, getCollectionProducts } from "@/services/shopify/shopifyStorefrontService";
import { getCollectionsFromDB, getCollectionProductsFromDB, getAllProductsFromDB, DatabaseProduct } from "@/services/shopify/databaseProductService";
import { Product, Collection } from "@/services/types/shopify-types";
import { Loader2, ChevronLeft, ChevronRight, Filter, X, Search, Package, Star, ShoppingCart, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import "@/styles/products.css";
import "@/styles/animations.css";
import "@/styles/hero.css";

// Enhanced product type that includes collection information
interface ProductWithCollections extends Product {
  collectionHandles: string[];
  collectionTitles: string[];
}

enum SortOption {
  NEWEST = "newest",
  NAME_AZ = "name-asc",
  NAME_ZA = "name-desc",
  PRICE_LOW_HIGH = "price-asc",
  PRICE_HIGH_LOW = "price-desc",
}

interface FilterState {
  collections: string[];
  priceRange: [number, number];
  search: string;
}

const ITEMS_PER_PAGE = 24;
const INITIAL_LOAD_LIMIT = 48; // Load fewer products initially
const LOAD_MORE_COUNT = 24; // Load this many more when "Load More" is clicked
const COMING_SOON_POSITION = 12; // Position where Coming Soon card appears

const Products: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOption, setSortOption] = useState<SortOption>(() => {
    // Get sort from URL parameter, default to NAME_AZ
    const sortParam = searchParams.get('sort');
    if (sortParam === 'newest') return SortOption.NEWEST;
    return SortOption.NAME_AZ;
  });
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    collections: [],
    priceRange: [0, 500],
    search: "",
  });
  const [maxPrice, setMaxPrice] = useState(500);
  const [allProducts, setAllProducts] = useState<ProductWithCollections[]>([]);
  const [isLoadingAllProducts, setIsLoadingAllProducts] = useState(true);
  const [visibleProductCount, setVisibleProductCount] = useState(INITIAL_LOAD_LIMIT);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isFilterLoading, setIsFilterLoading] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);

  // Fetch all collections from database first, fallback to API if needed
  const { data: collectionsResponse, isLoading: collectionsLoading } = useQuery({
    queryKey: ["collections-db"],
    queryFn: async () => {
      // Try database first
      const dbResult = await getCollectionsFromDB();
      if (dbResult.data.length > 0) {
        return dbResult;
      }
      // Fallback to API if database is empty
      console.log('No collections in database, falling back to API');
      return getCollections({ limit: 50 });
    },
    staleTime: 5 * 60 * 1000,
  });

  const collections = collectionsResponse?.data || [];

  // Fetch products from all collections
  useEffect(() => {
    const fetchAllProducts = async () => {
      setIsLoadingAllProducts(true);
      try {
        // Try to get all products from database first
        const dbResult = await getAllProductsFromDB();
        
        if (dbResult.data.length > 0) {
          // Convert database products to ProductWithCollections format
          const productMap = new Map<string, ProductWithCollections>();
          
          dbResult.data.forEach((dbProduct: any) => {
            const collections = dbProduct.collection_products?.map((cp: any) => ({
              handle: cp.shopify_collections?.handle || '',
              title: cp.shopify_collections?.title || ''
            })) || [];
            
            const product: ProductWithCollections = {
              id: String(dbProduct.id),
              handle: dbProduct.handle,
              title: dbProduct.title,
              description: dbProduct.description || '',
              vendor: dbProduct.vendor,
              productType: dbProduct.product_type,
              tags: dbProduct.tags || [],
              featuredImageUrl: dbProduct.image_url || undefined,
              priceRange: {
                min: dbProduct.price || 0,
                max: dbProduct.price || 0,
                currencyCode: 'USD'
              },
              available: dbProduct.status === 'active',
              collectionHandles: collections.map(c => c.handle),
              collectionTitles: collections.map(c => c.title)
            };
            
            productMap.set(product.id, product);
          });
          
          const products = Array.from(productMap.values());
          setAllProducts(products);
          
          // Calculate max price from products
          const prices = products.map(p => p.priceRange.min);
          const calculatedMaxPrice = Math.ceil(Math.max(...prices, 100));
          setMaxPrice(calculatedMaxPrice);
          setFilters(prev => ({ ...prev, priceRange: [0, calculatedMaxPrice] }));
        } else if (collections.length) {
          // Fallback to API if database is empty
          console.log('No products in database, falling back to API');
          const productMap = new Map<string, ProductWithCollections>();
          
          // Fetch products from each collection
          await Promise.all(
            collections.map(async (collection) => {
              try {
                const response = await getCollectionProducts({
                  handle: collection.handle,
                  limit: 50, // Reduced initial load per collection
                });
                
                response.products.forEach(product => {
                  // Check if product already exists in map
                  const existingProduct = productMap.get(product.id);
                  
                  if (existingProduct) {
                    // Add collection to existing product
                  existingProduct.collectionHandles.push(collection.handle);
                  existingProduct.collectionTitles.push(collection.title);
                } else {
                  // Create new product with collection info
                  productMap.set(product.id, {
                    ...product,
                    collectionHandles: [collection.handle],
                    collectionTitles: [collection.title],
                  });
                }
              });
            } catch (error) {
              console.error(`Error fetching products from ${collection.title}:`, error);
            }
          })
        );
        
          const uniqueProducts = Array.from(productMap.values());
          setAllProducts(uniqueProducts);
          
          // Calculate max price from all products
          const prices = uniqueProducts.map(p => p.priceRange?.min || 0);
          const calculatedMaxPrice = Math.ceil(Math.max(...prices, 100));
          setMaxPrice(calculatedMaxPrice);
          setFilters(prev => ({ ...prev, priceRange: [0, calculatedMaxPrice] }));
        }
      } catch (error) {
        console.error("Error fetching all products:", error);
        toast.error("Failed to load products");
      } finally {
        setIsLoadingAllProducts(false);
      }
    };

    fetchAllProducts();
  }, [collections]);

  // Apply filters and sorting
  const filteredAndSortedProducts = useMemo(() => {
    let filtered = [...allProducts];

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(product =>
        product.title.toLowerCase().includes(searchLower) ||
        product.description?.toLowerCase().includes(searchLower) ||
        product.vendor?.toLowerCase().includes(searchLower)
      );
    }

    // Apply collection filter
    if (filters.collections.length > 0) {
      filtered = filtered.filter(product =>
        product.collectionHandles.some(handle => filters.collections.includes(handle))
      );
    }

    // Apply price filter
    filtered = filtered.filter(product => {
      const price = product.priceRange.min;
      return price >= filters.priceRange[0] && price <= filters.priceRange[1];
    });

    // Apply sorting with availability preference
    filtered.sort((a, b) => {
      // Always show available products first
      if (a.available !== b.available) {
        return a.available ? -1 : 1;
      }

      // Then apply the selected sort option
      switch (sortOption) {
        case SortOption.NEWEST:
          // For newest, we'll reverse the array order (assuming products are fetched in order)
          // In a real implementation, you'd sort by created_at or similar timestamp
          return allProducts.indexOf(b) - allProducts.indexOf(a);
        case SortOption.NAME_AZ:
          return a.title.localeCompare(b.title);
        case SortOption.NAME_ZA:
          return b.title.localeCompare(a.title);
        case SortOption.PRICE_LOW_HIGH:
          const priceA = a.priceRange.min;
          const priceB = b.priceRange.min;
          return priceA - priceB;
        case SortOption.PRICE_HIGH_LOW:
          const priceHighA = a.priceRange.min;
          const priceHighB = b.priceRange.min;
          return priceHighB - priceHighA;
        default:
          return 0;
      }
    });

    return filtered;
  }, [allProducts, filters, sortOption]);

  // Progressive loading - show only visible products
  const visibleProducts = filteredAndSortedProducts.slice(0, visibleProductCount);
  const hasMoreProducts = visibleProductCount < filteredAndSortedProducts.length;

  const handleLoadMore = () => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setVisibleProductCount(prev => Math.min(prev + LOAD_MORE_COUNT, filteredAndSortedProducts.length));
      setIsLoadingMore(false);
    }, 300); // Small delay for better UX
  };

  const handleResetFilters = () => {
    setFilters({
      collections: [],
      priceRange: [0, maxPrice],
      search: "",
    });
    setCurrentPage(1);
    setVisibleProductCount(INITIAL_LOAD_LIMIT);
  };

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleProductCount(INITIAL_LOAD_LIMIT);
    // Add loading animation when filters change
    if (!isLoadingAllProducts) {
      setIsFilterLoading(true);
      setTimeout(() => setIsFilterLoading(false), 500);
    }
  }, [filters, sortOption]);

  // Page load animation
  useEffect(() => {
    setTimeout(() => setIsPageLoading(false), 1500);
  }, []);

  const isLoading = collectionsLoading || isLoadingAllProducts;

  return (
    <>
      {/* Page Loader */}
      {isPageLoading && (
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
      
      <div className={`flex flex-col min-h-screen bg-lolcow-black ${isPageLoading ? 'opacity-0' : 'opacity-100'}`} style={{ transition: 'opacity 0.5s ease-out' }}>
      <Navbar />
      
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative py-16 bg-gradient-to-br from-lolcow-darkgray via-lolcow-black to-lolcow-darkgray overflow-hidden">
          {/* Animated background */}
          <div className="absolute inset-0">
            {/* Gradient orbs */}
            <div className="absolute top-0 left-0 w-72 h-72 bg-lolcow-blue/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-lolcow-red/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
            
            {/* Grid pattern */}
            <div className="absolute inset-0 opacity-[0.03]" style={{
              backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
                               linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)`,
              backgroundSize: '50px 50px'
            }} />
          </div>
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl md:text-6xl font-fredoka text-white mb-4">
              <span className="bg-gradient-to-r from-lolcow-blue via-white to-lolcow-red bg-clip-text text-transparent">
                All Products
              </span>
            </h1>
            <p className="text-lg md:text-xl text-gray-300 mb-6 max-w-2xl mx-auto">
              Browse our complete collection of LolCow merchandise
            </p>
            
            {/* Stats badges */}
            <div className="flex flex-wrap justify-center gap-4">
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-4 py-2 flex items-center gap-2">
                <Package className="h-4 w-4 text-lolcow-blue" />
                <span className="text-sm text-white">
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin inline" />
                  ) : (
                    `${allProducts.length} Products`
                  )}
                </span>
              </div>
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-4 py-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-lolcow-red" />
                <span className="text-sm text-white">{collections.length} Collections</span>
              </div>
            </div>
          </div>
        </section>

        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Search and Sort Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            {/* Left side - Search */}
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                type="text"
                placeholder="Search products..."
                value={filters.search}
                onChange={(e) => {
                  setFilters(prev => ({ ...prev, search: e.target.value }));
                  setCurrentPage(1);
                }}
                className="pl-10 pr-4 py-3 w-full sm:w-96 text-base"
              />
            </div>

            {/* Right side - Sort and results count */}
            <div className="flex items-center gap-4">
              <span className="text-gray-400 text-sm">
                {filteredAndSortedProducts.length} products
              </span>
              <Select value={sortOption} onValueChange={(value: SortOption) => setSortOption(value)}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SortOption.NEWEST}>Newest First</SelectItem>
                  <SelectItem value={SortOption.NAME_AZ}>Name: A to Z</SelectItem>
                  <SelectItem value={SortOption.NAME_ZA}>Name: Z to A</SelectItem>
                  <SelectItem value={SortOption.PRICE_LOW_HIGH}>Price: Low to High</SelectItem>
                  <SelectItem value={SortOption.PRICE_HIGH_LOW}>Price: High to Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Main Content with Sidebar */}
          <div className="flex gap-8">
            {/* Filters Sidebar */}
            <aside className="w-80 flex-shrink-0 hidden lg:block">
              <div className="sticky top-24 space-y-6">
                {/* Active Filters Header */}
                {(filters.collections.length > 0 || 
                  filters.priceRange[0] > 0 || 
                  filters.priceRange[1] < maxPrice) && (
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-gray-400">
                      {filters.collections.length + (filters.priceRange[0] > 0 || filters.priceRange[1] < maxPrice ? 1 : 0)} filters active
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleResetFilters}
                      className="text-gray-400 hover:text-white transition-colors text-xs"
                    >
                      Clear all
                    </Button>
                  </div>
                )}

                {/* Collections Filter */}
                <div className="bg-gradient-to-br from-lolcow-darkgray to-lolcow-black rounded-xl p-5 border border-lolcow-lightgray/20">
                  <h3 className="text-lg font-fredoka text-white mb-4 flex items-center">
                    <Package className="h-5 w-5 mr-2 text-lolcow-blue" />
                    Collections
                  </h3>
                  <div className={`grid gap-2 ${
                    collections.length > 20 ? 'grid-cols-2' : 'grid-cols-1'
                  }`}>
                    {collections.map((collection) => {
                      const productCount = allProducts.filter(p => p.collectionHandles.includes(collection.handle)).length;
                      const isChecked = filters.collections.includes(collection.handle);
                      
                      return (
                        <label 
                          key={collection.handle} 
                          className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all duration-200 ${
                            isChecked ? 'bg-lolcow-blue/20 border border-lolcow-blue/40' : 'hover:bg-lolcow-lightgray/10'
                          }`}
                        >
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={(checked) => {
                              setFilters(prev => ({
                                ...prev,
                                collections: checked
                                  ? [...prev.collections, collection.handle]
                                  : prev.collections.filter(h => h !== collection.handle)
                              }));
                              setCurrentPage(1);
                            }}
                            className="border-gray-400 data-[state=checked]:bg-lolcow-blue data-[state=checked]:border-lolcow-blue flex-shrink-0 h-4 w-4"
                          />
                          <span className={`flex-1 text-sm truncate ${isChecked ? 'text-white font-medium' : 'text-gray-300'}`} title={collection.title}>
                            {collection.title}
                          </span>
                          <Badge 
                            variant={isChecked ? "default" : "secondary"} 
                            className="text-xs px-1.5 py-0.5 flex-shrink-0"
                          >
                            {productCount}
                          </Badge>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Price Range Filter */}
                <div className="bg-gradient-to-br from-lolcow-darkgray to-lolcow-black rounded-xl p-5 border border-lolcow-lightgray/20">
                  <h3 className="text-lg font-fredoka text-white mb-4">Price Range</h3>
                  <div className="space-y-4">
                    <Slider
                      value={filters.priceRange}
                      onValueChange={(value) => {
                        setFilters(prev => ({ ...prev, priceRange: value as [number, number] }));
                        setCurrentPage(1);
                      }}
                      max={maxPrice}
                      step={10}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">${filters.priceRange[0]}</span>
                      <span className="text-gray-300">${filters.priceRange[1]}</span>
                    </div>
                  </div>
                </div>
              </div>
            </aside>

            {/* Mobile Filter Button */}
            <div className="lg:hidden fixed bottom-6 right-6 z-40">
              <Button
                onClick={() => setShowFilters(!showFilters)}
                className="bg-lolcow-blue hover:bg-lolcow-blue/80 text-white rounded-full shadow-2xl p-4"
              >
                <Filter className="h-6 w-6" />
                {(filters.collections.length > 0 || 
                  filters.priceRange[0] > 0 || 
                  filters.priceRange[1] < maxPrice) && (
                  <Badge variant="destructive" className="absolute -top-2 -right-2 h-6 w-6 p-0 flex items-center justify-center">
                    {filters.collections.length + (filters.priceRange[0] > 0 || filters.priceRange[1] < maxPrice ? 1 : 0)}
                  </Badge>
                )}
              </Button>
            </div>

            {/* Mobile Filters Modal */}
            {showFilters && (
              <div className="lg:hidden fixed inset-0 bg-black/50 z-50 animate-fadeIn">
                <div className="absolute right-0 top-0 h-full w-80 bg-lolcow-black p-6 overflow-y-auto animate-slideInRight">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-fredoka text-white">Filters</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowFilters(false)}
                      className="text-gray-400 hover:text-white"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>

                  <div className="space-y-6">
                    {/* Collections Filter */}
                    <div>
                      <h4 className="text-lg font-fredoka text-white mb-4 flex items-center">
                        <Package className="h-5 w-5 mr-2 text-lolcow-blue" />
                        Collections
                      </h4>
                      <div className="space-y-2 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                        {collections.map((collection) => {
                          const productCount = allProducts.filter(p => p.collectionHandles.includes(collection.handle)).length;
                          const isChecked = filters.collections.includes(collection.handle);
                          
                          return (
                            <label 
                              key={collection.handle} 
                              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                                isChecked ? 'bg-lolcow-blue/20 border border-lolcow-blue/40' : 'hover:bg-lolcow-lightgray/10'
                              }`}
                            >
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={(checked) => {
                                  setFilters(prev => ({
                                    ...prev,
                                    collections: checked
                                      ? [...prev.collections, collection.handle]
                                      : prev.collections.filter(h => h !== collection.handle)
                                  }));
                                  setCurrentPage(1);
                                }}
                                className="border-gray-400 data-[state=checked]:bg-lolcow-blue data-[state=checked]:border-lolcow-blue"
                              />
                              <span className={`flex-1 ${isChecked ? 'text-white font-medium' : 'text-gray-300'}`}>
                                {collection.title}
                              </span>
                              <Badge 
                                variant={isChecked ? "default" : "secondary"} 
                                className="text-xs"
                              >
                                {productCount}
                              </Badge>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Price Range Filter */}
                    <div>
                      <h4 className="text-lg font-fredoka text-white mb-4">Price Range</h4>
                      <div className="space-y-4">
                        <Slider
                          value={filters.priceRange}
                          onValueChange={(value) => {
                            setFilters(prev => ({ ...prev, priceRange: value as [number, number] }));
                            setCurrentPage(1);
                          }}
                          max={maxPrice}
                          step={10}
                          className="w-full"
                        />
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-300">${filters.priceRange[0]}</span>
                          <span className="text-gray-300">${filters.priceRange[1]}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex gap-3">
                    <Button
                      onClick={handleResetFilters}
                      variant="outline"
                      className="flex-1"
                    >
                      Reset
                    </Button>
                    <Button
                      onClick={() => setShowFilters(false)}
                      className="flex-1 bg-lolcow-blue hover:bg-lolcow-blue/80"
                    >
                      Apply Filters
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Products Container */}
            <div className="flex-1 relative">{/* Filter Loading Overlay */}
              {isFilterLoading && (
                <div className="fixed inset-0 bg-lolcow-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
                  <div className="loader-content">
                    <div className="loader-logo">
                      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-24 h-24">
                        <circle cx="50" cy="50" r="40" stroke="url(#gradient-filter)" strokeWidth="4" fill="none" />
                        <path d="M30 50 Q50 30 70 50 Q50 70 30 50" fill="url(#gradient-filter)" />
                        <defs>
                          <linearGradient id="gradient-filter" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#FF3366" />
                            <stop offset="50%" stopColor="#FF6B6B" />
                            <stop offset="100%" stopColor="#4ECDC4" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>
                    <p className="text-white text-sm mt-4">Updating products...</p>
                  </div>
                </div>
              )}
              
              {/* Products Grid */}
              {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-6 mb-12">
              {Array.from({ length: 12 }).map((_, index) => (
                <ProductSkeleton key={index} />
              ))}
            </div>
          ) : filteredAndSortedProducts.length === 0 ? (
            <div className="text-center py-20">
              <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-300 text-lg mb-4">No products found matching your criteria.</p>
              <Button onClick={handleResetFilters} variant="outline">
                Clear Filters
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-6 mb-12">
                {visibleProducts.flatMap((product, index) => {
                  // Insert Coming Soon card at the specified position
                  const items = [];
                  
                  // Add the Coming Soon card at the specified position
                  if (index === COMING_SOON_POSITION) {
                    items.push(
                      <div
                        key="coming-soon"
                        className="animate-fadeIn"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <ComingSoonCard />
                      </div>
                    );
                  }
                  
                  // Add the product card with HOT badge for top 6 products
                  items.push(
                    <div
                      key={product.id}
                      className="animate-fadeIn"
                      style={{ animationDelay: `${(index + (index >= COMING_SOON_POSITION ? 1 : 0)) * 50}ms` }}
                    >
                      <ProductCard 
                        product={product} 
                        isHot={index < 6} // First 6 products get HOT badge
                      />
                    </div>
                  );
                  
                  return items;
                })}
              </div>

              {/* Load More Button */}
              {hasMoreProducts && (
                <div className="flex justify-center mb-12">
                  <Button
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                    size="lg"
                    className="bg-lolcow-blue hover:bg-lolcow-blue/80 text-white font-semibold px-8 py-3"
                  >
                    {isLoadingMore ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        Load More Products
                        <span className="ml-2 text-sm opacity-80">
                          ({filteredAndSortedProducts.length - visibleProductCount} remaining)
                        </span>
                      </>
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
            </div>
          </div>
          
          {/* Smart Product Recommendations */}
          {!isLoading && allProducts.length > 0 && (
            <div className="mt-16 max-w-6xl mx-auto">
              <ProductRecommendations
                allProducts={allProducts}
                maxRecommendations={3}
                title="Discover More LolCow Gear"
              />
            </div>
          )}
        </div>
      </main>

      {/* Recently Viewed Products */}
      <RecentlyViewed />

      <Footer />
      </div>
    </>
  );
};

export default Products;