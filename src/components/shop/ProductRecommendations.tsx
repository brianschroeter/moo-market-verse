import React, { useMemo } from "react";
import { Product } from "@/services/types/shopify-types";
import { formatPrice } from "@/services/shopify/shopifyStorefrontService";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Sparkles, Star, TrendingUp, Clock, ShoppingBag } from "lucide-react";

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
      
      <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-4">
        {recommendations.map((product) => (
          <Link
            key={product.id}
            to={`/shop/products/${product.handle}`}
            className="group block"
          >
            <div className="group relative bg-gradient-to-br from-lolcow-darkgray to-lolcow-black rounded-2xl overflow-hidden border border-lolcow-lightgray/20 hover:border-lolcow-blue/40 transition-all duration-500 transform hover:scale-[1.03] hover:shadow-2xl hover:shadow-lolcow-blue/30">
              {/* Animated gradient background */}
              <div className="absolute inset-0 bg-gradient-to-br from-lolcow-blue/10 to-lolcow-red/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-2xl" />
              
              {/* Shimmer effect */}
              <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                <div className="absolute inset-0 -translate-x-full group-hover:animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              </div>
              
              {/* Image */}
              <div className="relative aspect-square overflow-hidden bg-lolcow-lightgray/10">
                {product.featuredImageUrl ? (
                  <img
                    src={product.featuredImageUrl}
                    alt={product.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-lolcow-lightgray to-lolcow-darkgray flex items-center justify-center">
                    <ShoppingBag className="h-16 w-16 text-lolcow-blue opacity-60" />
                  </div>
                )}
                
                {/* Overlay Effects */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Badges */}
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                  {product.tags.some(tag => tag.toLowerCase().includes('bestseller')) && (
                    <Badge className="bg-lolcow-red/90 hover:bg-lolcow-red text-white border-0 backdrop-blur-sm text-xs">
                      <Star className="h-3 w-3 mr-1" />
                      Best Seller
                    </Badge>
                  )}
                  
                  {(product.tags.some(tag => 
                    tag.toLowerCase().includes('new') || 
                    tag.toLowerCase().includes('just-arrived') ||
                    tag.toLowerCase().includes('fresh') ||
                    tag.toLowerCase().includes('latest')
                  )) && (
                    <Badge className="bg-lolcow-blue/90 hover:bg-lolcow-blue text-white border-0 backdrop-blur-sm text-xs">
                      <Sparkles className="h-3 w-3 mr-1" />
                      NEW
                    </Badge>
                  )}
                  
                  {product.tags.some(tag => tag.toLowerCase().includes('sale') || tag.toLowerCase().includes('discount')) && (
                    <Badge className="bg-green-600/90 hover:bg-green-600 text-white border-0 backdrop-blur-sm text-xs">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Sale
                    </Badge>
                  )}
                  
                  {product.tags.some(tag => tag.toLowerCase().includes('limited')) && (
                    <Badge className="bg-purple-600/90 hover:bg-purple-600 text-white border-0 backdrop-blur-sm text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      Limited
                    </Badge>
                  )}
                  
                  {/* Additional Product Tags */}
                  {product.tags
                    .filter(tag => 
                      !tag.toLowerCase().includes('bestseller') &&
                      !tag.toLowerCase().includes('new') &&
                      !tag.toLowerCase().includes('just-arrived') &&
                      !tag.toLowerCase().includes('fresh') &&
                      !tag.toLowerCase().includes('latest') &&
                      !tag.toLowerCase().includes('sale') &&
                      !tag.toLowerCase().includes('discount') &&
                      !tag.toLowerCase().includes('limited') &&
                      !tag.toLowerCase().includes('shop-all') &&
                      !tag.toLowerCase().includes('printful') &&
                      !tag.toLowerCase().includes('personalize')
                    )
                    .slice(0, 2)
                    .map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs backdrop-blur-sm border-0">
                        {tag}
                      </Badge>
                    ))}
                </div>
                
                {/* Availability Badge */}
                {!product.available && (
                  <Badge className="absolute top-2 right-2 bg-gray-600/90 text-white border-0 backdrop-blur-sm text-xs">
                    Sold Out
                  </Badge>
                )}
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