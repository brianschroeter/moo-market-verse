import React from "react";
import { Link } from "react-router-dom";
import { Product } from "@/services/types/shopify-types";
import { formatPrice } from "@/services/shopify/shopifyStorefrontService";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, Star, ExternalLink, Eye, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductCardEnhancedProps {
  product: Product;
  className?: string;
  showUnavailable?: boolean;
  dimUnavailable?: boolean;
}

const ProductCardEnhanced: React.FC<ProductCardEnhancedProps> = ({ 
  product, 
  className = "",
  showUnavailable = true,
  dimUnavailable = true
}) => {
  const isAvailable = product.available;
  
  // Skip rendering if product is unavailable and showUnavailable is false
  if (!isAvailable && !showUnavailable) {
    return null;
  }

  const handleShopClick = () => {
    window.open(`https://lolcow.co/products/${product.handle}`, '_blank');
  };

  return (
    <div 
      className={cn(
        "group bg-gradient-to-br from-lolcow-darkgray to-lolcow-black rounded-xl overflow-hidden border border-lolcow-lightgray/20 hover:border-lolcow-blue/40 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-2xl hover:shadow-lolcow-blue/20",
        !isAvailable && dimUnavailable && "opacity-75 hover:opacity-90",
        className
      )}
    >
      {/* Image Section */}
      <Link to={`/shop/products/${product.handle}`} className="block relative aspect-[4/3] overflow-hidden">
        {product.featuredImageUrl ? (
          <img
            src={product.featuredImageUrl}
            alt={product.title}
            className={cn(
              "w-full h-full object-cover group-hover:scale-110 transition-transform duration-500",
              !isAvailable && "grayscale"
            )}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-lolcow-lightgray to-lolcow-darkgray flex items-center justify-center">
            <ShoppingBag className="h-24 w-24 text-lolcow-blue opacity-60" />
          </div>
        )}
        
        {/* Overlay Effects */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Best Seller Badge */}
        {isAvailable && (
          <Badge className="absolute top-4 left-4 bg-lolcow-red/90 hover:bg-lolcow-red text-white border-0 backdrop-blur-sm text-sm">
            <Star className="h-4 w-4 mr-1" />
            Best Seller
          </Badge>
        )}

        {/* Sold Out Overlay */}
        {!isAvailable && (
          <>
            <div className="absolute inset-0 bg-black/40" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Badge className="bg-gray-800/90 text-white border-0 backdrop-blur-sm text-lg px-6 py-2">
                <AlertCircle className="h-5 w-5 mr-2" />
                Sold Out
              </Badge>
            </div>
          </>
        )}
        
        {/* View Details Overlay on Hover */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none">
          <div className="text-white text-center">
            <Eye className="h-8 w-8 mx-auto mb-2" />
            <span className="text-sm font-medium">View Details</span>
          </div>
        </div>
      </Link>
      
      {/* Content Section */}
      <div className="p-8">
        <div className="min-h-[140px]">
          <Link to={`/shop/products/${product.handle}`}>
            <h3 className="font-fredoka font-bold text-2xl text-white group-hover:text-lolcow-blue transition-colors duration-300 mb-3 line-clamp-2">
              {product.title}
            </h3>
          </Link>
          
          {product.description && (
            <p className="text-gray-300 text-base leading-relaxed line-clamp-3 mb-6">
              {product.description}
            </p>
          )}
        </div>
        
        {/* Footer Section */}
        <div className="flex items-center justify-between mt-6">
          <span className={cn(
            "font-bold text-2xl",
            isAvailable ? "text-white" : "text-gray-400 line-through"
          )}>
            {formatPrice(product.priceRange.min, product.priceRange.currencyCode)}
          </span>
          
          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              asChild
              className="bg-lolcow-darkgray hover:bg-lolcow-lightgray text-white font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-lolcow-lightgray/25 px-4 py-3"
              size="default"
            >
              <Link to={`/shop/products/${product.handle}`}>
                <Eye className="h-4 w-4" />
              </Link>
            </Button>
            
            {/* Shop/Notify Button */}
            {isAvailable ? (
              <Button
                onClick={handleShopClick}
                className="bg-lolcow-blue hover:bg-lolcow-blue/80 text-white font-semibold transition-all duration-300 group/btn hover:shadow-lg hover:shadow-lolcow-blue/25 px-6 py-3"
                size="default"
              >
                Shop
                <ExternalLink className="h-4 w-4 ml-2 group-hover/btn:translate-x-1 transition-transform duration-300" />
              </Button>
            ) : (
              <Button
                disabled
                className="bg-gray-600 text-white font-semibold opacity-50 cursor-not-allowed px-6 py-3"
                size="default"
              >
                Sold Out
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCardEnhanced;