import React from "react";
import { Link } from "react-router-dom";
import { Collection } from "@/services/types/shopify-types";
import { ShoppingBag, ArrowRight, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface CollectionCardProps extends Collection {
  className?: string;
}

const CollectionCard: React.FC<CollectionCardProps> = ({
  handle,
  title,
  description,
  imageUrl,
  productCount,
  className = "",
}) => {
  const isListView = className.includes('flex-row');
  
  return (
    <div className={`group bg-gradient-to-br from-lolcow-darkgray to-lolcow-black rounded-xl overflow-hidden border border-lolcow-lightgray/20 hover:border-lolcow-blue/40 transition-all duration-300 ${
      isListView ? 'flex gap-6 p-6 transform hover:scale-[1.02] hover:shadow-xl hover:shadow-lolcow-blue/10' : 'flex flex-col transform hover:scale-105 hover:shadow-2xl hover:shadow-lolcow-blue/20'
    } ${className}`}>
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
        
        {/* Footer Section - Always at bottom */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2 text-lolcow-blue">
            <span className="text-sm font-semibold">
              {productCount} {productCount === 1 ? 'product' : 'products'}
            </span>
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
    </div>
  );
};

export default CollectionCard;