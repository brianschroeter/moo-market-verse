import React, { useState, useEffect } from "react";
import { Product, ProductVariant } from "@/services/types/shopify-types";
import { formatPrice, getProductDetail } from "@/services/shopify/shopifyStorefrontService";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, X, Star, Sparkles, TrendingUp, Clock, Flame, Eye, User, Info, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface QuickViewModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  isHot?: boolean;
}

const QuickViewModal: React.FC<QuickViewModalProps> = ({ product, isOpen, onClose, isHot = false }) => {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [productDetail, setProductDetail] = useState<Product | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [personalizationEnabled, setPersonalizationEnabled] = useState(false);
  const [personalizationName, setPersonalizationName] = useState("");
  const { addItem } = useCart();

  // Fetch product details when modal opens
  useEffect(() => {
    if (isOpen && product.handle) {
      setIsLoadingDetails(true);
      getProductDetail(product.handle)
        .then((response) => {
          if (response?.product) {
            setProductDetail(response.product);
            // Set initial selected variant
            if (response.product.variants && response.product.variants.length > 0) {
              const availableVariant = response.product.variants.find(v => v.available) || response.product.variants[0];
              setSelectedVariant(availableVariant);
            }
          }
        })
        .catch((error) => {
          console.error('Error fetching product details:', error);
        })
        .finally(() => {
          setIsLoadingDetails(false);
        });
    }
  }, [isOpen, product.handle]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setQuantity(1);
      setPersonalizationEnabled(false);
      setPersonalizationName("");
    }
  }, [isOpen]);

  // Group variants by option type
  const groupedOptions = React.useMemo(() => {
    if (!productDetail?.variants) return [];
    
    const options: Record<string, Set<string>> = {};
    
    productDetail.variants.forEach(variant => {
      variant.selectedOptions.forEach(option => {
        if (!options[option.name]) {
          options[option.name] = new Set();
        }
        options[option.name].add(option.value);
      });
    });
    
    return Object.entries(options).map(([name, values]) => ({
      name,
      values: Array.from(values)
    }));
  }, [productDetail?.variants]);

  const handleVariantSelect = (optionName: string, optionValue: string) => {
    if (!productDetail?.variants) return;
    
    // Find variant that matches the selected option along with other currently selected options
    const matchingVariant = productDetail.variants.find(variant => {
      return variant.selectedOptions.every(opt => {
        if (opt.name === optionName) {
          return opt.value === optionValue;
        }
        // Keep other selected options the same
        return selectedVariant?.selectedOptions.find(selected => selected.name === opt.name)?.value === opt.value;
      });
    });
    
    if (matchingVariant) {
      setSelectedVariant(matchingVariant);
    }
  };

  const handleAddToCart = async () => {
    if (!selectedVariant) {
      toast.error("Please select product options");
      return;
    }
    
    setIsAddingToCart(true);
    try {
      const cartData = {
        variantId: selectedVariant.id,
        productId: product.id,
        title: product.title,
        variantTitle: selectedVariant.title,
        price: selectedVariant.price,
        quantity: quantity,
        imageUrl: product.featuredImageUrl,
        handle: product.handle,
        properties: personalizationEnabled && personalizationName.trim() 
          ? [{ key: 'Personalization', value: personalizationName.trim() }]
          : undefined
      };
      
      await addItem(cartData);
      
      // If personalization is enabled, also add the fee
      if (personalizationEnabled && personalizationName.trim() && product.tags?.includes('personalize')) {
        const feeData = {
          variantId: '50551599726871',
          productId: '9893779767575',
          title: 'Personalization Fee',
          variantTitle: '',
          price: 10,
          quantity: 1,
          handle: 'personalization-fee',
          properties: [
            { key: 'For', value: `${product.title} - ${personalizationName.trim()}` }
          ]
        };
        
        await addItem(feeData);
      }
      
      toast.success(`Added ${quantity} x ${product.title} to cart!`);
      onClose();
    } catch (error) {
      console.error('Add to cart error:', error);
      toast.error("Failed to add to cart. Please use the 'Details' or 'Shop Now' button to add this item.");
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleShopClick = () => {
    window.location.href = `/shop/products/${product.handle}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] bg-gradient-to-br from-lolcow-darkgray to-lolcow-black border-lolcow-lightgray/20 text-white p-0 overflow-hidden">
        <Button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full p-2"
          size="icon"
          variant="ghost"
        >
          <X className="h-5 w-5" />
        </Button>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 max-h-[90vh] overflow-hidden">
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
            <div className="absolute top-4 left-4 flex flex-wrap gap-2 max-w-[250px]">
              {isHot && (
                <Badge className="bg-orange-600/90 hover:bg-orange-600 text-white border-0 backdrop-blur-sm animate-pulse w-fit">
                  <Flame className="h-4 w-4 mr-1 flex-shrink-0" />
                  HOT
                </Badge>
              )}
              
              {product.tags.some(tag => tag.toLowerCase().includes('bestseller')) && (
                <Badge className="bg-lolcow-red/90 hover:bg-lolcow-red text-white border-0 backdrop-blur-sm w-fit">
                  <Star className="h-4 w-4 mr-1 flex-shrink-0" />
                  Best Seller
                </Badge>
              )}
              
              {(product.tags.some(tag => 
                tag.toLowerCase().includes('new') || 
                tag.toLowerCase().includes('just-arrived') ||
                tag.toLowerCase().includes('fresh') ||
                tag.toLowerCase().includes('latest')
              )) && (
                <Badge className="bg-lolcow-blue/90 hover:bg-lolcow-blue text-white border-0 backdrop-blur-sm w-fit">
                  <Sparkles className="h-4 w-4 mr-1 flex-shrink-0" />
                  NEW
                </Badge>
              )}
              
              {/* Sale Badge - if product has "sale" or "discount" tag */}
              {product.tags.some(tag => tag.toLowerCase().includes('sale') || tag.toLowerCase().includes('discount')) && (
                <Badge className="bg-green-600/90 hover:bg-green-600 text-white border-0 backdrop-blur-sm w-fit">
                  <TrendingUp className="h-4 w-4 mr-1 flex-shrink-0" />
                  Sale
                </Badge>
              )}
              
              {/* Limited Edition Badge - if product has "limited" tag */}
              {product.tags.some(tag => tag.toLowerCase().includes('limited')) && (
                <Badge className="bg-purple-600/90 hover:bg-purple-600 text-white border-0 backdrop-blur-sm w-fit">
                  <Clock className="h-4 w-4 mr-1 flex-shrink-0" />
                  Limited Edition
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
                .slice(0, 3)
                .map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs backdrop-blur-sm border-0 w-fit truncate max-w-[180px]">
                    {tag}
                  </Badge>
                ))}
            </div>
          </div>
          
          {/* Content Section */}
          <div className="p-6 flex flex-col max-h-[90vh] overflow-y-auto">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-2xl font-fredoka text-white">
                {product.title}
              </DialogTitle>
              {product.vendor && (
                <p className="text-gray-400 mt-1 text-sm">by {product.vendor}</p>
              )}
            </DialogHeader>
            
            <div className="flex-grow space-y-4">
              {/* Price */}
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-white">
                  {selectedVariant ? (
                    formatPrice(selectedVariant.price + (personalizationEnabled && product.tags?.includes('personalize') ? 10 : 0), product.priceRange.currencyCode)
                  ) : (
                    formatPrice(product.priceRange.min + (personalizationEnabled && product.tags?.includes('personalize') ? 10 : 0), product.priceRange.currencyCode)
                  )}
                </span>
                {personalizationEnabled && product.tags?.includes('personalize') && (
                  <span className="text-sm text-lolcow-blue">(+$10 personalization)</span>
                )}
              </div>
              
              {/* Description */}
              {product.description && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-300 text-sm">Description</h3>
                  <p className="text-gray-400 leading-relaxed text-sm line-clamp-3">
                    {product.description}
                  </p>
                </div>
              )}
              
              {/* Loading State for Variants */}
              {isLoadingDetails ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-lolcow-blue" />
                </div>
              ) : (
                <>
                  {/* Variant Options */}
                  {groupedOptions.length > 0 && 
                   !(groupedOptions.length === 1 && 
                     groupedOptions[0].name === "Title" && 
                     groupedOptions[0].values.length === 1 && 
                     groupedOptions[0].values[0] === "Default Title") && (
                    <div className="space-y-3">
                      {groupedOptions.map(option => (
                        <div key={option.name} className="space-y-2">
                          <label className="font-semibold text-gray-300 text-sm">
                            Select {option.name}
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {option.values.map(value => {
                              const isSelected = selectedVariant?.selectedOptions.find(
                                opt => opt.name === option.name
                              )?.value === value;
                              
                              // Check if this option value has any available variants
                              const hasAvailableVariant = productDetail?.variants.some(variant => {
                                if (!variant.available) return false;
                                
                                // Check if this variant has the current option value
                                const hasThisOption = variant.selectedOptions.some(opt => 
                                  opt.name === option.name && opt.value === value
                                );
                                
                                if (!hasThisOption) return false;
                                
                                // For multi-option products, check if other selected options match
                                if (selectedVariant && groupedOptions.length > 1) {
                                  return variant.selectedOptions.every(opt => {
                                    if (opt.name === option.name) {
                                      return opt.value === value;
                                    }
                                    const currentSelection = selectedVariant.selectedOptions.find(
                                      selected => selected.name === opt.name
                                    );
                                    return currentSelection ? currentSelection.value === opt.value : true;
                                  });
                                }
                                
                                return true;
                              });
                              
                              return (
                                <Button
                                  key={value}
                                  variant={isSelected ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => handleVariantSelect(option.name, value)}
                                  disabled={!hasAvailableVariant}
                                  className={
                                    !hasAvailableVariant 
                                      ? "opacity-40 cursor-not-allowed"
                                      : isSelected 
                                        ? "bg-lolcow-blue hover:bg-lolcow-blue/80" 
                                        : "border-lolcow-lightgray/50 text-gray-300 hover:text-white hover:border-white"
                                  }
                                >
                                  {value}
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Personalization Option */}
                  {product.tags && product.tags.includes('personalize') && (
                    <div className="space-y-3 p-3 bg-lolcow-darkgray/30 rounded-lg">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-lolcow-blue" />
                        <Label className="text-sm font-semibold text-white">Personalization</Label>
                      </div>
                      
                      <Select
                        value={personalizationEnabled ? "yes" : "no"}
                        onValueChange={(value) => {
                          setPersonalizationEnabled(value === "yes");
                          if (value === "no") {
                            setPersonalizationName("");
                          }
                        }}
                      >
                        <SelectTrigger className="w-full bg-lolcow-darkgray border-lolcow-lightgray/50 text-white">
                          <SelectValue placeholder="Add personalization?" />
                        </SelectTrigger>
                        <SelectContent className="bg-lolcow-darkgray border-lolcow-lightgray/50">
                          <SelectItem value="no" className="text-gray-300 hover:text-white">
                            No personalization
                          </SelectItem>
                          <SelectItem value="yes" className="text-gray-300 hover:text-white">
                            Add personalization (+$10.00)
                          </SelectItem>
                        </SelectContent>
                      </Select>

                      {personalizationEnabled && (
                        <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                          <Label htmlFor="modal-personalization-name" className="text-xs text-gray-300">
                            Enter name for personalization
                          </Label>
                          <Input
                            id="modal-personalization-name"
                            type="text"
                            placeholder="ENTER NAME HERE"
                            value={personalizationName}
                            onChange={(e) => setPersonalizationName(e.target.value.toUpperCase())}
                            className="bg-lolcow-darkgray border-lolcow-lightgray/50 text-white placeholder:text-gray-500 uppercase text-sm"
                            maxLength={50}
                          />
                          <div className="space-y-1">
                            <p className="text-xs text-gray-400">
                              {personalizationName.length}/50 characters
                            </p>
                            <p className="text-xs text-amber-400 flex items-center gap-1">
                              <Info className="h-3 w-3" />
                              Name will appear in ALL CAPS on the product
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
              
              {/* Quantity Selector */}
              <div className="space-y-2">
                <label className="font-semibold text-gray-300 text-sm">Quantity</label>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="bg-lolcow-lightgray hover:bg-lolcow-lightgray/80 w-8 h-8 p-0 text-lg"
                    size="icon"
                  >
                    -
                  </Button>
                  <span className="text-lg font-semibold w-8 text-center">{quantity}</span>
                  <Button
                    onClick={() => setQuantity(quantity + 1)}
                    className="bg-lolcow-lightgray hover:bg-lolcow-lightgray/80 w-8 h-8 p-0 text-lg"
                    size="icon"
                  >
                    +
                  </Button>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="space-y-3 pt-2">
                <Button
                  onClick={handleAddToCart}
                  disabled={!product.available || isAddingToCart || (personalizationEnabled && !personalizationName.trim())}
                  className="w-full bg-lolcow-blue hover:bg-lolcow-blue/80 text-white py-4 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  size="default"
                >
                  {isAddingToCart ? (
                    <span className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Adding...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <ShoppingBag className="h-4 w-4" />
                      {!product.available ? 'Sold Out' : 
                       personalizationEnabled && !personalizationName.trim() ? 'Enter Name for Personalization' : 
                       'Add to Cart'}
                    </span>
                  )}
                </Button>
                
                <div className="flex gap-3">
                  <Button
                    asChild
                    variant="outline"
                    className="flex-1 border-lolcow-lightgray hover:bg-lolcow-lightgray/20 py-2"
                    size="sm"
                  >
                    <Link to={`/shop/products/${product.handle}`}>
                      <Eye className="h-4 w-4 mr-2" />
                      Details
                    </Link>
                  </Button>
                  
                  <Button
                    onClick={handleShopClick}
                    variant="outline"
                    className="flex-1 border-lolcow-lightgray hover:bg-lolcow-lightgray/20 py-2"
                    size="sm"
                  >
                    View Full Details
                  </Button>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuickViewModal;