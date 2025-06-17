import React, { useMemo } from "react";
import { Product } from "@/services/types/shopify-types";
import { formatPrice } from "@/services/shopify/shopifyStorefrontService";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Sparkles } from "lucide-react";

interface ProductRecommendationsProps {
  currentProduct?: Product;
  allProducts: Product[];
  maxRecommendations?: number;
  title?: string;
  className?: string;
}

interface ProductWithScore extends Product {
  score: number;
}

const calculateSimilarityScore = (product1: Product, product2: Product): number => {
  let score = 0;
  
  // Same vendor gets high score
  if (product1.vendor && product2.vendor && product1.vendor === product2.vendor) {
    score += 40;
  }
  
  // Same product type gets medium score
  if (product1.productType && product2.productType && product1.productType === product2.productType) {
    score += 30;
  }
  
  // Shared tags get points (more shared tags = higher score)
  const sharedTags = product1.tags.filter(tag => 
    product2.tags.some(tag2 => tag.toLowerCase() === tag2.toLowerCase())
  ).length;
  score += sharedTags * 10;
  
  // Similar price range gets points
  const priceDiff = Math.abs(product1.priceRange.min - product2.priceRange.min);
  const maxPrice = Math.max(product1.priceRange.min, product2.priceRange.min);
  const pricePercent = priceDiff / maxPrice;
  
  if (pricePercent < 0.3) score += 20; // Within 30% price range
  else if (pricePercent < 0.5) score += 10; // Within 50% price range
  
  return score;
};

const getSmartRecommendations = (
  currentProduct: Product | undefined,
  allProducts: Product[],
  maxRecommendations: number
): Product[] => {
  if (!currentProduct) {
    // If no current product, return random popular items
    return allProducts
      .filter(p => p.available)
      .sort(() => 0.5 - Math.random())
      .slice(0, maxRecommendations);
  }
  
  // Calculate similarity scores for all other products
  const scored: ProductWithScore[] = allProducts
    .filter(p => p.id !== currentProduct.id && p.available)
    .map(p => ({
      ...p,
      score: calculateSimilarityScore(currentProduct, p)
    }))
    .sort((a, b) => b.score - a.score);
  
  return scored.slice(0, maxRecommendations);
};

const ProductRecommendations: React.FC<ProductRecommendationsProps> = ({
  currentProduct,
  allProducts,
  maxRecommendations = 4,
  title = "You might also like",
  className = ""
}) => {
  const recommendations = useMemo(() => {
    return getSmartRecommendations(currentProduct, allProducts, maxRecommendations);
  }, [currentProduct, allProducts, maxRecommendations]);

  if (recommendations.length === 0) return null;

  return (
    <div className={`bg-gradient-to-br from-lolcow-darkgray to-lolcow-black rounded-xl p-6 border border-lolcow-lightgray/20 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-fredoka text-white flex items-center">
          <Sparkles className="h-5 w-5 mr-2 text-lolcow-blue" />
          {title}
        </h3>
        <Link 
          to="/shop/products" 
          className="text-lolcow-blue hover:text-white transition-colors text-sm flex items-center"
        >
          View All
          <ChevronRight className="h-4 w-4 ml-1" />
        </Link>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {recommendations.map((product) => (
          <Link
            key={product.id}
            to={`/shop/products/${product.handle}`}
            className="group block"
          >
            <div className="bg-gradient-to-br from-lolcow-lightgray/20 to-lolcow-darkgray/20 rounded-lg overflow-hidden border border-lolcow-lightgray/10 hover:border-lolcow-blue/40 transition-all duration-300">
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
                    <span className="text-2xl">🛍️</span>
                  </div>
                )}
                
                {/* Badges */}
                <div className="absolute top-2 left-2">
                  {product.tags.some(tag => tag.toLowerCase().includes('new')) && (
                    <Badge className="bg-lolcow-blue/90 text-white border-0 backdrop-blur-sm text-xs">
                      NEW
                    </Badge>
                  )}
                </div>
              </div>
              
              {/* Content */}
              <div className="p-3">
                <h4 className="text-sm font-medium text-white line-clamp-2 group-hover:text-lolcow-blue transition-colors mb-2">
                  {product.title}
                </h4>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-300">
                    {formatPrice(product.priceRange.min, product.priceRange.currencyCode)}
                  </span>
                  {product.vendor && (
                    <span className="text-xs text-gray-500">
                      {product.vendor}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
      
      {/* Additional Info */}
      <div className="mt-4 text-center">
        <p className="text-xs text-gray-400">
          Recommendations based on{" "}
          {currentProduct ? (
            <>style, price, and category</>
          ) : (
            <>popular items and new arrivals</>
          )}
        </p>
      </div>
    </div>
  );
};

export default ProductRecommendations;