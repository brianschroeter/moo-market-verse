import React from "react";
import { Product } from "@/services/types/shopify-types";
import ProductCard from "./ProductCard";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProductGridProps {
  products: Product[];
  loading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  shopDomain?: string;
}

const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  loading = false,
  onLoadMore,
  hasMore = false,
  shopDomain,
}) => {
  if (loading && products.length === 0) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-lolcow-darkgray rounded-lg overflow-hidden animate-pulse">
            <div className="aspect-square bg-lolcow-lightgray" />
            <div className="p-4 space-y-3">
              <div className="h-4 bg-lolcow-lightgray rounded w-3/4" />
              <div className="h-3 bg-lolcow-lightgray rounded w-full" />
              <div className="h-3 bg-lolcow-lightgray rounded w-2/3" />
              <div className="h-8 bg-lolcow-lightgray rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <ShoppingCart className="h-16 w-16 text-lolcow-blue opacity-50 mx-auto mb-4" />
        <h3 className="text-xl font-fredoka text-white mb-2">No products found</h3>
        <p className="text-gray-300">Try browsing a different collection or check back later.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            hideQuickView={true}
          />
        ))}
      </div>
      
      {hasMore && onLoadMore && (
        <div className="load-more-section text-center">
          <Button
            onClick={onLoadMore}
            disabled={loading}
            className="relative z-10 bg-lolcow-darkgray hover:bg-lolcow-lightgray text-white font-semibold px-8 py-3 rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-lolcow-blue/20"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Loading...
              </span>
            ) : (
              'Load More Products'
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default ProductGrid;