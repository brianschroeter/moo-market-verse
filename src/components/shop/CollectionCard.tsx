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
  
  
  return (
    <div 
      className={`collection-card group ${
        isListView ? 'flex gap-6 p-6' : 'flex flex-col'
      } ${className}`}
      onMouseEnter={() => {
        setShowPreview(true);
        setIsHovered(true);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
      }}
    >
      {/* Image Section */}
      <div className={`collection-card-image ${
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
        
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2 z-10">
          {isNew && (
            <Badge className="bg-lolcow-red/90 text-white border-0 backdrop-blur-sm animate-slow-pulse">
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
        <Badge className={`collection-card-badge ${
          isListView ? 'text-xs' : 'text-sm'
        }`}>
          <Package className="h-3 w-3 mr-1" />
          {productCount}
        </Badge>
      </div>
      
      {/* Content Section */}
      <div className={`collection-card-content ${isListView ? 'flex-1 flex flex-col justify-between' : 'flex flex-col flex-1'}`}>
        <div className="flex-1">
          <h3 className={`font-fredoka font-bold text-white group-hover:text-lolcow-blue transition-colors duration-300 ${
            isListView ? 'text-xl mb-2' : 'text-xl mb-3'
          }`}>
            {title}
          </h3>
          
          <div className={`${isListView ? 'min-h-[2.5rem]' : 'min-h-[2.5rem]'}`}>
            {description && (
              <div 
                className={`text-gray-300 leading-relaxed line-clamp-2 ${
                  isListView ? 'text-sm' : 'text-sm'
                } [&_p]:mb-0 [&_strong]:font-semibold [&_em]:italic`}
                dangerouslySetInnerHTML={{ __html: description }}
              />
            )}
          </div>
        </div>
        
        
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
            className="relative z-40 bg-lolcow-blue hover:bg-lolcow-blue/80 text-white font-semibold transition-all duration-300 group/btn hover:shadow-lg hover:shadow-lolcow-blue/25"
            size={isListView ? "sm" : "default"}
          >
            <Link to={`/shop/collections/${handle}`}>
              Shop Now
              <ArrowRight className="h-4 w-4 ml-2 group-hover/btn:translate-x-1 transition-transform duration-300" />
            </Link>
          </Button>
        </div>
      </div>
      
      {/* Product Preview on Hover (Desktop only) - Positioned above button */}
      {!isListView && showPreview && previewProducts.length > 0 && (
        <div className="hidden lg:block absolute inset-x-0 top-full mt-2 bg-black/95 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 ease-out rounded-xl z-30 pointer-events-none p-4 shadow-2xl">
          <div className="mb-2">
            <p className="text-xs text-gray-300 uppercase tracking-wider font-semibold">
              Featured Products
            </p>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {previewProducts.slice(0, 4).map((product, idx) => (
              <div 
                key={product.id} 
                className="relative group/preview opacity-0 translate-y-2 transition-all duration-200 ease-out"
                style={{ 
                  animationDelay: `${idx * 50}ms`,
                  animation: isHovered ? `fadeInUp 0.3s ease-out ${idx * 50}ms forwards` : 'none'
                }}
              >
                <div className="aspect-square relative overflow-hidden rounded-lg">
                  <img 
                    src={product.featuredImageUrl || '/placeholder.svg'} 
                    alt={product.title}
                    className="w-full h-full object-cover" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent">
                    <div className="absolute bottom-1 left-1 right-1">
                      <p className="text-xs text-white font-medium line-clamp-1 leading-tight">
                        {product.title}
                      </p>
                      <p className="text-xs text-gray-300">
                        ${product.priceRange.min.toFixed(0)}
                      </p>
                    </div>
                  </div>
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