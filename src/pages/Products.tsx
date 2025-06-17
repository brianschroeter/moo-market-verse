import React, { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductCard from "@/components/shop/ProductCard";
import { getCollections, getCollectionProducts } from "@/services/shopify/shopifyStorefrontService";
import { Product, Collection } from "@/services/types/shopify-types";
import { Loader2, ChevronLeft, ChevronRight, Filter, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

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
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [isLoadingAllProducts, setIsLoadingAllProducts] = useState(true);

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
        const productMap = new Map<string, Product>();
        
        // Fetch products from each collection
        await Promise.all(
          collections.map(async (collection) => {
            try {
              const response = await getCollectionProducts({
                handle: collection.handle,
                limit: 250, // Get all products from collection
              });
              
              response.products.forEach(product => {
                // Use product ID as key to avoid duplicates
                productMap.set(product.id, product);
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
      // Since we don't have collection info on products, we'll need to track this differently
      // For now, we'll skip this filter
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

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = filteredAndSortedProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleResetFilters = () => {
    setFilters({
      collections: [],
      priceRange: [0, maxPrice],
      availability: "all",
      search: "",
    });
    setCurrentPage(1);
  };

  const isLoading = collectionsLoading || isLoadingAllProducts;

  return (
    <div className="flex flex-col min-h-screen bg-lolcow-black">
      <Navbar />
      
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="py-8 bg-gradient-to-r from-lolcow-darkgray to-lolcow-black">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl md:text-4xl font-fredoka text-white mb-2">All Products</h1>
            <p className="text-gray-300">
              Browse our complete collection of LolCow merchandise
            </p>
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
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Filters
                {(filters.collections.length > 0 || 
                  filters.availability !== "all" || 
                  filters.priceRange[0] > 0 || 
                  filters.priceRange[1] < maxPrice) && (
                  <span className="ml-1 bg-lolcow-blue text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">
                    •
                  </span>
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
            <div className="bg-lolcow-darkgray rounded-lg p-6 mb-8">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">Filters</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilters}
                  className="text-gray-400 hover:text-white"
                >
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
              </div>
            </div>
          )}

          {/* Products Grid */}
          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-lolcow-blue" />
            </div>
          ) : filteredAndSortedProducts.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-300 text-lg mb-4">No products found matching your criteria.</p>
              <Button onClick={handleResetFilters} variant="outline">
                Clear Filters
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
                {paginatedProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(pageNum)}
                        className="w-10"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
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