import React, { useState } from "react";
import { Product } from "@/services/types/shopify-types";
import { formatPrice } from "@/services/shopify/shopifyStorefrontService";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, ExternalLink, X, Star, Sparkles, TrendingUp, Clock, Flame, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";

interface QuickViewModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  isHot?: boolean;
}

const QuickViewModal: React.FC<QuickViewModalProps> = ({ product, isOpen, onClose, isHot = false }) => {
  const [selectedVariant, setSelectedVariant] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const { addItem } = useCart();

  const handleAddToCart = async () => {
    setIsAddingToCart(true);
    try {
      // Simulate adding to cart
      await new Promise(resolve => setTimeout(resolve, 500));
      
      addItem({
        id: product.id,
        name: product.title,
        price: product.priceRange.min,
        quantity: quantity,
        imageUrl: product.featuredImageUrl,
        handle: product.handle,
      });
      
      toast.success(`Added ${quantity} x ${product.title} to cart!`);
      onClose();
    } catch (error) {
      toast.error("Failed to add to cart");
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleShopClick = () => {
    window.open(`https://lolcow.co/products/${product.handle}`, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl bg-gradient-to-br from-lolcow-darkgray to-lolcow-black border-lolcow-lightgray/20 text-white p-0 overflow-hidden">
        <Button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full p-2"
          size="icon"
          variant="ghost"
        >
          <X className="h-5 w-5" />
        </Button>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
          {/* Image Section */}
          <div className="relative aspect-square overflow-hidden bg-lolcow-lightgray">
            {product.featuredImageUrl ? (
              <img
                src={product.featuredImageUrl}
                alt={product.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ShoppingBag className="h-32 w-32 text-lolcow-blue/50" />
              </div>
            )}
            
            {/* Badges */}
            <div className="absolute top-4 left-4 flex flex-col gap-2">
              {isHot && (
                <Badge className="bg-orange-600/90 hover:bg-orange-600 text-white border-0 backdrop-blur-sm animate-pulse">
                  <Flame className="h-4 w-4 mr-1" />
                  HOT
                </Badge>
              )}
              
              {product.tags.some(tag => tag.toLowerCase().includes('bestseller')) && (
                <Badge className="bg-lolcow-red/90 hover:bg-lolcow-red text-white border-0 backdrop-blur-sm">
                  <Star className="h-4 w-4 mr-1" />
                  Best Seller
                </Badge>
              )}
              
              {(product.tags.some(tag => 
                tag.toLowerCase().includes('new') || 
                tag.toLowerCase().includes('just-arrived') ||
                tag.toLowerCase().includes('fresh') ||
                tag.toLowerCase().includes('latest')
              )) && (
                <Badge className="bg-lolcow-blue/90 hover:bg-lolcow-blue text-white border-0 backdrop-blur-sm">
                  <Sparkles className="h-4 w-4 mr-1" />
                  NEW
                </Badge>
              )}
            </div>
          </div>
          
          {/* Content Section */}
          <div className="p-8 flex flex-col">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-3xl font-fredoka text-white">
                {product.title}
              </DialogTitle>
              {product.vendor && (
                <p className="text-gray-400 mt-2">by {product.vendor}</p>
              )}
            </DialogHeader>
            
            <div className="flex-grow space-y-6">
              {/* Price */}
              <div className="flex items-baseline gap-4">
                <span className="text-4xl font-bold text-white">
                  {formatPrice(product.priceRange.min, product.priceRange.currencyCode)}
                </span>
                {product.priceRange.min !== product.priceRange.max && (
                  <span className="text-gray-400">
                    - {formatPrice(product.priceRange.max, product.priceRange.currencyCode)}
                  </span>
                )}
              </div>
              
              {/* Description */}
              {product.description && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-300">Description</h3>
                  <p className="text-gray-400 leading-relaxed">
                    {product.description}
                  </p>
                </div>
              )}
              
              {/* Quantity Selector */}
              <div className="space-y-2">
                <label className="font-semibold text-gray-300">Quantity</label>
                <div className="flex items-center gap-4">
                  <Button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="bg-lolcow-lightgray hover:bg-lolcow-lightgray/80 w-10 h-10 p-0"
                    size="icon"
                  >
                    -
                  </Button>
                  <span className="text-xl font-semibold w-12 text-center">{quantity}</span>
                  <Button
                    onClick={() => setQuantity(quantity + 1)}
                    className="bg-lolcow-lightgray hover:bg-lolcow-lightgray/80 w-10 h-10 p-0"
                    size="icon"
                  >
                    +
                  </Button>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="space-y-3 pt-4">
                <Button
                  onClick={handleAddToCart}
                  disabled={!product.available || isAddingToCart}
                  className="w-full bg-lolcow-blue hover:bg-lolcow-blue/80 text-white py-6 text-lg font-semibold"
                  size="lg"
                >
                  {isAddingToCart ? (
                    <span className="flex items-center gap-2">
                      <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Adding to Cart...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <ShoppingBag className="h-5 w-5" />
                      {product.available ? 'Add to Cart' : 'Sold Out'}
                    </span>
                  )}
                </Button>
                
                <div className="flex gap-3">
                  <Button
                    asChild
                    variant="outline"
                    className="flex-1 border-lolcow-lightgray hover:bg-lolcow-lightgray/20"
                  >
                    <Link to={`/shop/products/${product.handle}`}>
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Link>
                  </Button>
                  
                  <Button
                    onClick={handleShopClick}
                    variant="outline"
                    className="flex-1 border-lolcow-lightgray hover:bg-lolcow-lightgray/20"
                  >
                    Shop Now
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Tags */}
            {product.tags.length > 0 && (
              <div className="mt-6 pt-6 border-t border-lolcow-lightgray/20">
                <div className="flex flex-wrap gap-2">
                  {product.tags.slice(0, 5).map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuickViewModal;