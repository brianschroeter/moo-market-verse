import React, { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductCard from "@/components/shop/ProductCard";
import ProductSkeleton from "@/components/shop/ProductSkeleton";
import { getCollections, getCollectionProducts } from "@/services/shopify/shopifyStorefrontService";
import { Product, Collection } from "@/services/types/shopify-types";
import { Loader2, ChevronLeft, ChevronRight, Filter, X, Search, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import "@/styles/products.css";

// Enhanced product type that includes collection information
interface ProductWithCollections extends Product {
  collectionHandles: string[];
  collectionTitles: string[];
}

enum SortOption {
  NAME_AZ = "name-asc",
  NAME_ZA = "name-desc",
  PRICE_LOW_HIGH = "price-asc",
  PRICE_HIGH_LOW = "price-desc",
}

interface FilterState {
  collections: string[];
  priceRange: [number, number];
  availability: "all" | "in-stock" | "out-of-stock";
  search: string;
}

const ITEMS_PER_PAGE = 24;
const INITIAL_LOAD_LIMIT = 48; // Load fewer products initially
const LOAD_MORE_COUNT = 24; // Load this many more when "Load More" is clicked

const Products: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOption, setSortOption] = useState<SortOption>(SortOption.NAME_AZ);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    collections: [],
    priceRange: [0, 500],
    availability: "all",
    search: "",
  });
  const [maxPrice, setMaxPrice] = useState(500);
  const [allProducts, setAllProducts] = useState<ProductWithCollections[]>([]);
  const [isLoadingAllProducts, setIsLoadingAllProducts] = useState(true);
  const [visibleProductCount, setVisibleProductCount] = useState(INITIAL_LOAD_LIMIT);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Fetch all collections
  const { data: collectionsResponse, isLoading: collectionsLoading } = useQuery({
    queryKey: ["collections"],
    queryFn: () => getCollections({ limit: 50 }),
    staleTime: 5 * 60 * 1000,
  });

  const collections = collectionsResponse?.data || [];

  // Fetch products from all collections
  useEffect(() => {
    const fetchAllProducts = async () => {
      if (!collections.length) return;
      
      setIsLoadingAllProducts(true);
      try {
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
        const prices = uniqueProducts.map(p => p.priceRange.max);
        const calculatedMaxPrice = Math.ceil(Math.max(...prices, 100));
        setMaxPrice(calculatedMaxPrice);
        setFilters(prev => ({ ...prev, priceRange: [0, calculatedMaxPrice] }));
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

    // Apply availability filter
    if (filters.availability === "in-stock") {
      filtered = filtered.filter(product => product.available);
    } else if (filters.availability === "out-of-stock") {
      filtered = filtered.filter(product => !product.available);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortOption) {
        case SortOption.NAME_AZ:
          return a.title.localeCompare(b.title);
        case SortOption.NAME_ZA:
          return b.title.localeCompare(a.title);
        case SortOption.PRICE_LOW_HIGH:
          return parseFloat(a.price.replace(/[^0-9.]/g, "")) - parseFloat(b.price.replace(/[^0-9.]/g, ""));
        case SortOption.PRICE_HIGH_LOW:
          return parseFloat(b.price.replace(/[^0-9.]/g, "")) - parseFloat(a.price.replace(/[^0-9.]/g, ""));
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
      availability: "all",
      search: "",
    });
    setCurrentPage(1);
    setVisibleProductCount(INITIAL_LOAD_LIMIT);
  };

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleProductCount(INITIAL_LOAD_LIMIT);
  }, [filters]);

  const isLoading = collectionsLoading || isLoadingAllProducts;

  return (
    <div className="flex flex-col min-h-screen bg-lolcow-black">
      <Navbar />
      
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative py-16 bg-gradient-to-br from-lolcow-darkgray via-lolcow-black to-lolcow-darkgray overflow-hidden">
          {/* Animated background elements */}
          <div className="absolute inset-0">
            <div className="absolute top-0 left-0 w-72 h-72 bg-lolcow-blue/20 rounded-full blur-3xl animate-float" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-lolcow-red/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
          </div>
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl md:text-6xl font-fredoka text-white mb-4 animate-fadeInUp">
              All Products
            </h1>
            <p className="text-lg md:text-xl text-gray-300 mb-6 animate-fadeInUp" style={{ animationDelay: '100ms' }}>
              Browse our complete collection of LolCow merchandise
            </p>
            <div className="flex justify-center gap-4 animate-fadeInUp" style={{ animationDelay: '200ms' }}>
              <Badge variant="secondary" className="text-sm px-3 py-1">
                <Package className="h-4 w-4 mr-2" />
                {allProducts.length} Products
              </Badge>
              <Badge variant="secondary" className="text-sm px-3 py-1">
                {collections.length} Collections
              </Badge>
            </div>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            {/* Left side - Filter button and search */}
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 transition-all duration-300 ${
                  showFilters ? 'bg-lolcow-blue text-white hover:bg-lolcow-blue/80 border-lolcow-blue' : ''
                }`}
              >
                <Filter className={`h-4 w-4 ${showFilters ? 'animate-spin' : ''}`} />
                Filters
                {(filters.collections.length > 0 || 
                  filters.availability !== "all" || 
                  filters.priceRange[0] > 0 || 
                  filters.priceRange[1] < maxPrice) && (
                  <Badge variant="destructive" className="ml-2 text-xs animate-pulse">
                    {filters.collections.length + 
                     (filters.availability !== "all" ? 1 : 0) + 
                     (filters.priceRange[0] > 0 || filters.priceRange[1] < maxPrice ? 1 : 0)}
                  </Badge>
                )}
              </Button>
              
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search products..."
                  value={filters.search}
                  onChange={(e) => {
                    setFilters(prev => ({ ...prev, search: e.target.value }));
                    setCurrentPage(1);
                  }}
                  className="pl-10 pr-4 py-2 w-full sm:w-64"
                />
              </div>
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
                  <SelectItem value={SortOption.NAME_AZ}>Name: A to Z</SelectItem>
                  <SelectItem value={SortOption.NAME_ZA}>Name: Z to A</SelectItem>
                  <SelectItem value={SortOption.PRICE_LOW_HIGH}>Price: Low to High</SelectItem>
                  <SelectItem value={SortOption.PRICE_HIGH_LOW}>Price: High to Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="bg-gradient-to-br from-lolcow-darkgray to-lolcow-black rounded-xl p-6 mb-8 border border-lolcow-lightgray/20 animate-fadeIn">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-fredoka text-white mb-1">Filter Products</h3>
                  <p className="text-sm text-gray-400">Narrow down your search</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilters}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="h-4 w-4 mr-1" />
                  Reset All
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Price Range */}
                <div>
                  <Label className="text-gray-300 mb-2 block">Price Range</Label>
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
                    <div className="flex justify-between text-sm text-gray-400">
                      <span>${filters.priceRange[0]}</span>
                      <span>${filters.priceRange[1]}</span>
                    </div>
                  </div>
                </div>

                {/* Availability */}
                <div>
                  <Label className="text-gray-300 mb-2 block">Availability</Label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="availability"
                        checked={filters.availability === "all"}
                        onChange={() => {
                          setFilters(prev => ({ ...prev, availability: "all" }));
                          setCurrentPage(1);
                        }}
                        className="text-lolcow-blue"
                      />
                      <span className="text-gray-300">All Products</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="availability"
                        checked={filters.availability === "in-stock"}
                        onChange={() => {
                          setFilters(prev => ({ ...prev, availability: "in-stock" }));
                          setCurrentPage(1);
                        }}
                        className="text-lolcow-blue"
                      />
                      <span className="text-gray-300">In Stock</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="availability"
                        checked={filters.availability === "out-of-stock"}
                        onChange={() => {
                          setFilters(prev => ({ ...prev, availability: "out-of-stock" }));
                          setCurrentPage(1);
                        }}
                        className="text-lolcow-blue"
                      />
                      <span className="text-gray-300">Out of Stock</span>
                    </label>
                  </div>
                </div>

                {/* Collections */}
                <div>
                  <Label className="text-gray-300 mb-3 block font-semibold">Collections</Label>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                    {collections.map((collection) => {
                      const productCount = allProducts.filter(p => p.collectionHandles.includes(collection.handle)).length;
                      const isChecked = filters.collections.includes(collection.handle);
                      
                      return (
                        <label 
                          key={collection.handle} 
                          className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all duration-200 ${
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
                          <span className={`text-sm flex-1 ${isChecked ? 'text-white font-medium' : 'text-gray-300'}`}>
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
              </div>
            </div>
          )}

          {/* Products Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
                {visibleProducts.map((product, index) => (
                  <div
                    key={product.id}
                    className="animate-fadeIn"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <ProductCard product={product} />
                  </div>
                ))}
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
      </main>

      <Footer />
    </div>
  );
};

export default Products;