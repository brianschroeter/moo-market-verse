import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Product } from "@/services/types/shopify-types";
import { formatPrice } from "@/services/shopify/shopifyStorefrontService";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, Star, ExternalLink, Eye, Sparkles, TrendingUp, Clock, Flame, Zap } from "lucide-react";
import QuickViewModal from "./QuickViewModal";
import SocialProofBadges from "./SocialProofBadges";
import { trackProductView } from "./RecentlyViewed";

interface ProductCardProps {
  product: Product;
  className?: string;
  isHot?: boolean; // For top 6 products
}

const ProductCard: React.FC<ProductCardProps> = ({ product, className = "", isHot = false }) => {
  const [showQuickView, setShowQuickView] = useState(false);
  
  const handleProductClick = () => {
    trackProductView(product);
  };
  
  const handleShopClick = () => {
    trackProductView(product);
    // Open Shopify store product page in new tab
    window.open(`https://lolcow.co/products/${product.handle}`, '_blank');
  };

  return (
    <>
      <div className={`group relative bg-gradient-to-br from-lolcow-darkgray to-lolcow-black rounded-2xl overflow-hidden border border-lolcow-lightgray/20 hover:border-lolcow-blue/40 transition-all duration-500 transform hover:scale-[1.03] hover:shadow-2xl hover:shadow-lolcow-blue/30 ${className}`}>
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-lolcow-blue/10 to-lolcow-red/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-2xl" />
      
      {/* Shimmer effect */}
      <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
        <div className="absolute inset-0 -translate-x-full group-hover:animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>
      {/* Image Section - Clickable to go to product detail */}
      <Link to={`/shop/products/${product.handle}`} onClick={handleProductClick} className="block relative aspect-[4/3] overflow-hidden">
        {product.featuredImageUrl ? (
          <img
            src={product.featuredImageUrl}
            alt={product.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-lolcow-lightgray to-lolcow-darkgray flex items-center justify-center">
            <ShoppingBag className="h-24 w-24 text-lolcow-blue opacity-60" />
          </div>
        )}
        
        {/* Overlay Effects */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Product Badges */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          {/* HOT Badge - for top 6 products */}
          {isHot && (
            <Badge className="bg-orange-600/90 hover:bg-orange-600 text-white border-0 backdrop-blur-sm text-sm animate-pulse">
              <Flame className="h-4 w-4 mr-1" />
              HOT
            </Badge>
          )}
          
          {/* Best Seller Badge - only if product has "bestseller" tag */}
          {product.tags.some(tag => tag.toLowerCase().includes('bestseller')) && (
            <Badge className="bg-lolcow-red/90 hover:bg-lolcow-red text-white border-0 backdrop-blur-sm text-sm">
              <Star className="h-4 w-4 mr-1" />
              Best Seller
            </Badge>
          )}
          
          {/* New Product Badge - if product has "new" tag or date-based new tags */}
          {(product.tags.some(tag => 
            tag.toLowerCase().includes('new') || 
            tag.toLowerCase().includes('just-arrived') ||
            tag.toLowerCase().includes('fresh') ||
            tag.toLowerCase().includes('latest')
          )) && (
            <Badge className="bg-lolcow-blue/90 hover:bg-lolcow-blue text-white border-0 backdrop-blur-sm text-sm">
              <Sparkles className="h-4 w-4 mr-1" />
              NEW
            </Badge>
          )}
          
          {/* Sale Badge - if product has "sale" or "discount" tag */}
          {product.tags.some(tag => tag.toLowerCase().includes('sale') || tag.toLowerCase().includes('discount')) && (
            <Badge className="bg-green-600/90 hover:bg-green-600 text-white border-0 backdrop-blur-sm text-sm">
              <TrendingUp className="h-4 w-4 mr-1" />
              Sale
            </Badge>
          )}
          
          {/* Limited Edition Badge - if product has "limited" tag */}
          {product.tags.some(tag => tag.toLowerCase().includes('limited')) && (
            <Badge className="bg-purple-600/90 hover:bg-purple-600 text-white border-0 backdrop-blur-sm text-sm">
              <Clock className="h-4 w-4 mr-1" />
              Limited Edition
            </Badge>
          )}
        </div>

        {/* Social Proof Badges */}
        <div className="absolute top-4 right-4">
          {!product.available ? (
            <Badge className="bg-gray-600/90 text-white border-0 backdrop-blur-sm">
              Sold Out
            </Badge>
          ) : (
            <SocialProofBadges productId={product.id} isHot={isHot} />
          )}
        </div>
        
        {/* View Details Overlay on Hover */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="text-white text-center">
            <Eye className="h-8 w-8 mx-auto mb-2" />
            <span className="text-sm font-medium">View Details</span>
          </div>
        </div>
      </Link>
      
      {/* Content Section */}
      <div className="p-8">
        <div className="min-h-[140px]">
          <Link to={`/shop/products/${product.handle}`} onClick={handleProductClick}>
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
        
        {/* Footer Section - Consistent positioning */}
        <div className="flex items-center justify-between mt-6">
          <span className="text-white font-bold text-2xl">
            {formatPrice(product.priceRange.min, product.priceRange.currencyCode)}
          </span>
          
          {/* Action Buttons */}
          <div className="flex gap-2">
            {/* Quick View Button */}
            <Button
              onClick={() => setShowQuickView(true)}
              className="bg-lolcow-darkgray hover:bg-lolcow-lightgray text-white font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-lolcow-lightgray/25 px-4 py-3"
              size="default"
              title="Quick View"
            >
              <Zap className="h-4 w-4" />
              <span className="sr-only">Quick View</span>
            </Button>
            
            {/* Shop Button */}
            <Button
              onClick={handleShopClick}
              disabled={!product.available}
              className="bg-lolcow-blue hover:bg-lolcow-blue/80 text-white font-semibold transition-all duration-300 group/btn hover:shadow-lg hover:shadow-lolcow-blue/25 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 flex-1"
              size="default"
            >
              {product.available ? 'Shop' : 'Sold Out'}
              {product.available && (
                <ExternalLink className="h-4 w-4 ml-2 group-hover/btn:translate-x-1 transition-transform duration-300" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
    
    {/* Quick View Modal */}
    <QuickViewModal
      product={product}
      isOpen={showQuickView}
      onClose={() => setShowQuickView(false)}
      isHot={isHot}
    />
    </>
  );
};

export default ProductCard;