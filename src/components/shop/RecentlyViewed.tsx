import React, { useState, useEffect } from "react";
import { Product } from "@/services/types/shopify-types";
import { formatPrice } from "@/services/shopify/shopifyStorefrontService";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, History, X } from "lucide-react";

interface RecentlyViewedProps {
  currentProductId?: string; // To exclude current product from the list
}

const STORAGE_KEY = "lolcow_recently_viewed";
const MAX_ITEMS = 10;

export const trackProductView = (product: Product) => {
  const stored = localStorage.getItem(STORAGE_KEY);
  const recentlyViewed: Product[] = stored ? JSON.parse(stored) : [];
  
  // Remove if already exists to avoid duplicates
  const filtered = recentlyViewed.filter(p => p.id !== product.id);
  
  // Add to beginning of array
  const updated = [product, ...filtered].slice(0, MAX_ITEMS);
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

const RecentlyViewed: React.FC<RecentlyViewedProps> = ({ currentProductId }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [showScroll, setShowScroll] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadRecentlyViewed = () => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const recentlyViewed: Product[] = JSON.parse(stored);
        // Filter out current product if provided
        const filtered = currentProductId 
          ? recentlyViewed.filter(p => p.id !== currentProductId)
          : recentlyViewed;
        setProducts(filtered);
      }
    };

    loadRecentlyViewed();
    
    // Listen for storage changes from other tabs
    window.addEventListener("storage", loadRecentlyViewed);
    return () => window.removeEventListener("storage", loadRecentlyViewed);
  }, [currentProductId]);

  useEffect(() => {
    const checkScroll = () => {
      if (scrollRef.current) {
        const { scrollWidth, clientWidth } = scrollRef.current;
        setShowScroll(scrollWidth > clientWidth);
      }
    };

    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [products]);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const clearHistory = () => {
    localStorage.removeItem(STORAGE_KEY);
    setProducts([]);
  };

  if (products.length === 0) return null;

  return (
    <div className={`fixed bottom-0 left-0 right-0 bg-gradient-to-t from-lolcow-black via-lolcow-darkgray to-transparent backdrop-blur-lg border-t border-lolcow-lightgray/20 z-40 transition-all duration-300 ${
      isMinimized ? "translate-y-[calc(100%-3rem)]" : ""
    }`}>
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-lolcow-lightgray/10">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-lolcow-blue" />
          <span className="text-sm font-medium text-white">Recently Viewed</span>
          <span className="text-xs text-gray-400">({products.length})</span>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={clearHistory}
            size="sm"
            variant="ghost"
            className="text-gray-400 hover:text-white h-7 px-2"
          >
            Clear
          </Button>
          <Button
            onClick={() => setIsMinimized(!isMinimized)}
            size="sm"
            variant="ghost"
            className="text-gray-400 hover:text-white h-7 w-7 p-0"
          >
            {isMinimized ? "▲" : "▼"}
          </Button>
        </div>
      </div>

      {/* Products Carousel */}
      <div className={`relative ${isMinimized ? "hidden" : ""}`}>
        {showScroll && (
          <>
            <Button
              onClick={() => scroll("left")}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-lolcow-black/80 hover:bg-lolcow-black rounded-full p-2 h-10 w-10"
              size="icon"
              variant="ghost"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              onClick={() => scroll("right")}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-lolcow-black/80 hover:bg-lolcow-black rounded-full p-2 h-10 w-10"
              size="icon"
              variant="ghost"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </>
        )}

        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide px-4 py-4"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {products.map((product) => (
            <Link
              key={product.id}
              to={`/shop/products/${product.handle}`}
              className="flex-shrink-0 group"
            >
              <div className="bg-gradient-to-br from-lolcow-darkgray to-lolcow-black rounded-lg overflow-hidden border border-lolcow-lightgray/20 hover:border-lolcow-blue/40 transition-all duration-300 w-40">
                {/* Image */}
                <div className="aspect-square relative overflow-hidden bg-lolcow-lightgray/10">
                  {product.featuredImageUrl ? (
                    <img
                      src={product.featuredImageUrl}
                      alt={product.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-4xl">🛍️</span>
                    </div>
                  )}
                </div>
                
                {/* Info */}
                <div className="p-3">
                  <h4 className="text-sm font-medium text-white line-clamp-1 group-hover:text-lolcow-blue transition-colors">
                    {product.title}
                  </h4>
                  <p className="text-sm font-bold text-gray-300 mt-1">
                    {formatPrice(product.priceRange.min, product.priceRange.currencyCode)}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RecentlyViewed;