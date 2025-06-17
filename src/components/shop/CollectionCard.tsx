import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Collection } from "@/services/types/shopify-types";
import { ShoppingBag, ArrowRight, Package, Sparkles, Clock, Star, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { getCollectionProducts } from "@/services/shopify/shopifyStorefrontService";

interface CollectionCardProps extends Collection {
  className?: string;
  isNew?: boolean;
  isFeatured?: boolean;
  hasDiscount?: boolean;
}

const CollectionCard: React.FC<CollectionCardProps> = ({
  handle,
  title,
  description,
  imageUrl,
  productCount,
  className = "",
  isNew = false,
  isFeatured = false,
  hasDiscount = false,
}) => {
  const isListView = className.includes('flex-row');
  const [showPreview, setShowPreview] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  // Fetch collection products on hover for preview
  const { data: collectionData, isLoading: previewLoading } = useQuery({
    queryKey: ["collection-preview", handle],
    queryFn: () => getCollectionProducts({ handle, limit: 4 }),
    enabled: showPreview,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
  
  const previewProducts = collectionData?.products || [];
  
  // Calculate price range from preview products
  const priceRange = previewProducts.length > 0 ? {
    min: Math.min(...previewProducts.map(p => parseFloat(p.price.replace(/[^0-9.]/g, "")))),
    max: Math.max(...previewProducts.map(p => parseFloat(p.price.replace(/[^0-9.]/g, "")))),
  } : null;
  
  return (
    <div 
      className={`group relative bg-gradient-to-br from-lolcow-darkgray to-lolcow-black rounded-xl overflow-hidden border border-lolcow-lightgray/20 hover:border-lolcow-blue/40 transition-all duration-300 ${
        isListView ? 'flex gap-6 p-6 transform hover:scale-[1.02] hover:shadow-xl hover:shadow-lolcow-blue/10' : 'flex flex-col transform hover:scale-105 hover:shadow-2xl hover:shadow-lolcow-blue/20'
      } ${className}`}
      onMouseEnter={() => {
        setShowPreview(true);
        setIsHovered(true);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
      }}
    >
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-lolcow-blue/20 to-lolcow-red/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl" />
      
      {/* Shimmer effect overlay */}
      <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
        <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>
      {/* Image Section */}
      <div className={`relative overflow-hidden ${
        isListView ? 'w-32 h-32 rounded-lg flex-shrink-0' : 'aspect-square'
      }`}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-lolcow-lightgray to-lolcow-darkgray flex items-center justify-center">
            <ShoppingBag className={`text-lolcow-blue opacity-60 ${isListView ? 'h-10 w-10' : 'h-20 w-20'}`} />
          </div>
        )}
        
        {/* Overlay Effects */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2 z-10">
          {isNew && (
            <Badge className="bg-lolcow-red/90 text-white border-0 backdrop-blur-sm animate-pulse">
              <Sparkles className="h-3 w-3 mr-1" />
              NEW
            </Badge>
          )}
          {isFeatured && (
            <Badge className="bg-gradient-to-r from-lolcow-blue to-lolcow-red text-white border-0 backdrop-blur-sm">
              <Star className="h-3 w-3 mr-1" />
              Featured
            </Badge>
          )}
          {hasDiscount && (
            <Badge className="bg-green-600/90 text-white border-0 backdrop-blur-sm">
              <TrendingUp className="h-3 w-3 mr-1" />
              SALE
            </Badge>
          )}
        </div>
        
        {/* Product Count Badge */}
        <Badge className={`absolute top-3 right-3 bg-lolcow-blue/90 hover:bg-lolcow-blue text-white border-0 backdrop-blur-sm ${
          isListView ? 'text-xs' : 'text-sm'
        }`}>
          <Package className="h-3 w-3 mr-1" />
          {productCount}
        </Badge>
      </div>
      
      {/* Content Section */}
      <div className={`${isListView ? 'flex-1 flex flex-col justify-between' : 'p-6 flex flex-col flex-1'}`}>
        <div className="flex-1">
          <h3 className={`font-fredoka font-bold text-white group-hover:text-lolcow-blue transition-colors duration-300 ${
            isListView ? 'text-xl mb-2' : 'text-xl mb-3'
          }`}>
            {title}
          </h3>
          
          <div className={`${isListView ? 'min-h-[2.5rem]' : 'min-h-[2.5rem]'}`}>
            {description && (
              <p className={`text-gray-300 leading-relaxed line-clamp-2 ${
                isListView ? 'text-sm' : 'text-sm'
              }`}>
                {description}
              </p>
            )}
          </div>
        </div>
        
        {/* Price Range and Stats */}
        {priceRange && isHovered && (
          <div className="mt-3 text-sm text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <span className="font-medium">
              ${priceRange.min.toFixed(0)} - ${priceRange.max.toFixed(0)}
            </span>
          </div>
        )}
        
        {/* Footer Section - Always at bottom */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-lolcow-blue">
              <span className="text-sm font-semibold">
                {productCount} {productCount === 1 ? 'product' : 'products'}
              </span>
            </div>
          </div>
          
          {/* Enhanced Shop Button */}
          <Button
            asChild
            className="bg-lolcow-blue hover:bg-lolcow-blue/80 text-white font-semibold transition-all duration-300 group/btn hover:shadow-lg hover:shadow-lolcow-blue/25"
            size={isListView ? "sm" : "default"}
          >
            <Link to={`/shop/collections/${handle}`}>
              Shop Now
              <ArrowRight className="h-4 w-4 ml-2 group-hover/btn:translate-x-1 transition-transform duration-300" />
            </Link>
          </Button>
        </div>
      </div>
      
      {/* Product Preview on Hover (Desktop only) */}
      {!isListView && showPreview && previewProducts.length > 0 && (
        <div className="hidden lg:block absolute inset-x-0 bottom-0 bg-black/95 backdrop-blur-sm p-4 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300 rounded-b-xl z-20">
          <div className="grid grid-cols-4 gap-2">
            {previewProducts.slice(0, 4).map((product, idx) => (
              <div 
                key={product.id} 
                className="relative group/preview opacity-0 animate-[fadeInUp_0.3s_ease-out_forwards]"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <img 
                  src={product.featuredImageUrl || '/placeholder.svg'} 
                  alt={product.title}
                  className="w-full h-16 object-cover rounded-md group-hover/preview:scale-110 transition-transform" 
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/preview:opacity-100 transition-opacity rounded-md flex items-center justify-center">
                  <p className="text-xs text-white text-center px-1 line-clamp-2">
                    {product.title}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CollectionCard;