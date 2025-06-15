import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductCard from "@/components/shop/ProductCard";
import { getProductDetail, getFeaturedProducts } from "@/services/shopify/shopifyStorefrontService";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ShoppingCart, Package, Star, Info, ZoomIn, Copy, Check, Ruler, Clock, Award } from "lucide-react";
import { ProductVariant } from "@/services/types/shopify-types";
import { toast } from "sonner";

const ProductDetail: React.FC = () => {
  const { handle } = useParams<{ handle: string }>();
  const navigate = useNavigate();
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [copiedLink, setCopiedLink] = useState(false);

  const {
    data: productData,
    isLoading,
    error
  } = useQuery({
    queryKey: ["product-detail", handle],
    queryFn: () => getProductDetail(handle!),
    enabled: !!handle,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const product = productData?.product;

  // Fetch related products (featured products for now)
  const { data: relatedProducts = [] } = useQuery({
    queryKey: ["related-products", handle],
    queryFn: () => getFeaturedProducts(4),
    enabled: !!handle,
    staleTime: 5 * 60 * 1000,
  });

  // Initialize selected variant when product loads
  React.useEffect(() => {
    if (product?.variants && product.variants.length > 0 && !selectedVariant) {
      // Select first available variant or just first variant
      const availableVariant = product.variants.find(v => v.available) || product.variants[0];
      setSelectedVariant(availableVariant);
    }
  }, [product, selectedVariant]);

  // Update selected image when color variant changes
  React.useEffect(() => {
    if (selectedVariant && product?.images && product.images.length > 0) {
      // Find color option in selected variant
      const colorOption = selectedVariant.selectedOptions.find(opt => 
        opt.name.toLowerCase() === 'color' || opt.name.toLowerCase() === 'colour'
      );
      
      if (colorOption) {
        // Try to find an image that matches the color
        const colorValue = colorOption.value.toLowerCase().replace(/\s+/g, '-'); // Convert "Team Purple" to "team-purple"
        const colorSearchTerms = [
          colorValue,
          colorOption.value.toLowerCase(),
          colorOption.value.toLowerCase().replace('team ', ''), // "team purple" -> "purple"
          colorOption.value.toLowerCase().replace(/\s+/g, '_'), // "team purple" -> "team_purple"
        ];
        
        const matchingImageIndex = product.images.findIndex(img => {
          const altText = (img.altText || '').toLowerCase();
          const imageUrl = (img.url || '').toLowerCase();
          
          // Check if any search term appears in alt text or URL
          return colorSearchTerms.some(term => 
            altText.includes(term) || imageUrl.includes(term)
          );
        });
        
        if (matchingImageIndex >= 0) {
          setSelectedImage(matchingImageIndex);
        }
      }
    }
  }, [selectedVariant, product]);

  // Track recently viewed products
  useEffect(() => {
    if (product) {
      const recentlyViewed = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
      const filtered = recentlyViewed.filter((p: any) => p.handle !== product.handle);
      const updated = [{ 
        handle: product.handle, 
        title: product.title, 
        image: product.featuredImageUrl,
        price: product.priceRange.min
      }, ...filtered].slice(0, 6);
      localStorage.setItem('recentlyViewed', JSON.stringify(updated));
    }
  }, [product]);

  const formatPrice = (price: number, currencyCode: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(price);
  };

  // Group variants by option type
  const groupedOptions = React.useMemo(() => {
    if (!product?.variants) return {};
    
    const options: Record<string, Set<string>> = {};
    
    product.variants.forEach(variant => {
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
  }, [product?.variants]);

  const handleVariantSelect = (optionName: string, optionValue: string) => {
    if (!product?.variants) return;
    
    // Find variant that matches the selected option along with other currently selected options
    const matchingVariant = product.variants.find(variant => {
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

  const handleCopyLink = async () => {
    const url = window.location.href;
    await navigator.clipboard.writeText(url);
    setCopiedLink(true);
    toast.success('Link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePosition({ x, y });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow bg-lolcow-black py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="space-y-4">
                <Skeleton className="aspect-square w-full rounded-lg" />
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map(i => (
                    <Skeleton key={i} className="aspect-square rounded-lg" />
                  ))}
                </div>
              </div>
              <div className="space-y-6">
                <Skeleton className="h-12 w-3/4" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-20 w-1/3" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow bg-lolcow-black py-12">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h1 className="text-3xl font-fredoka text-white mb-4">Product Not Found</h1>
            <p className="text-gray-300 mb-8">Sorry, we couldn't find the product you're looking for.</p>
            <Button onClick={() => navigate('/shop')} className="bg-lolcow-blue hover:bg-lolcow-blue/80">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to Shop
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className="flex-grow bg-lolcow-black">
        {/* Enhanced Breadcrumb */}
        <div className="bg-lolcow-darkgray/50 border-b border-lolcow-lightgray/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <nav className="flex items-center space-x-3 text-sm">
              <button
                onClick={() => navigate('/shop')}
                className="text-gray-400 hover:text-white transition-colors duration-200 font-medium"
              >
                Shop
              </button>
              <span className="text-gray-600">/</span>
              {product.productType && (
                <>
                  <span className="text-gray-400">{product.productType}</span>
                  <span className="text-gray-600">/</span>
                </>
              )}
              <span className="text-white font-semibold">{product.title}</span>
            </nav>
          </div>
        </div>

        {/* Product Detail */}
        <section className="py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Image Gallery */}
              <div className="space-y-4">
                <div 
                  className="aspect-square rounded-xl overflow-hidden bg-lolcow-darkgray relative cursor-zoom-in shadow-2xl group"
                  onMouseEnter={() => setIsZoomed(true)}
                  onMouseLeave={() => setIsZoomed(false)}
                  onMouseMove={handleMouseMove}
                >
                  {product.images && product.images.length > 0 ? (
                    <>
                      <img
                        src={product.images[selectedImage].url}
                        alt={product.images[selectedImage].altText || product.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      {/* Zoom indicator */}
                      <div className="absolute top-4 right-4 bg-black/70 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                        <ZoomIn className="h-4 w-4" />
                      </div>
                      {/* Zoomed image */}
                      {isZoomed && (
                        <div 
                          className="absolute inset-0 overflow-hidden"
                          style={{
                            backgroundImage: `url(${product.images[selectedImage].url})`,
                            backgroundPosition: `${mousePosition.x}% ${mousePosition.y}%`,
                            backgroundSize: '200%',
                            backgroundRepeat: 'no-repeat'
                          }}
                        />
                      )}
                    </>
                  ) : product.featuredImageUrl ? (
                    <img
                      src={product.featuredImageUrl}
                      alt={product.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-24 w-24 text-lolcow-lightgray" />
                    </div>
                  )}
                </div>
                
                {/* Thumbnail Grid */}
                {product.images && product.images.length > 1 && (
                  <div className="grid grid-cols-4 gap-3">
                    {product.images.map((image, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImage(index)}
                        className={`aspect-square rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                          selectedImage === index 
                            ? 'border-lolcow-blue shadow-lg scale-105' 
                            : 'border-transparent hover:border-lolcow-lightgray/50 hover:shadow-md'
                        }`}
                      >
                        <img
                          src={image.url}
                          alt={image.altText || `${product.title} ${index + 1}`}
                          className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="space-y-6">
                <div>
                  <h1 className="text-3xl md:text-4xl font-fredoka text-white mb-3">
                    {product.title}
                  </h1>
                  {product.vendor && (
                    <p className="text-gray-400 text-lg">by {product.vendor}</p>
                  )}
                </div>

                {/* Price and Copy Link */}
                <div className="flex items-center justify-between p-4 bg-lolcow-darkgray/50 rounded-lg">
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-400">Price</span>
                    <span className="text-3xl font-bold text-white">
                      {selectedVariant ? (
                        formatPrice(selectedVariant.price, product.priceRange.currencyCode)
                      ) : (
                        formatPrice(product.priceRange.min, product.priceRange.currencyCode)
                      )}
                    </span>
                  </div>
                  
                  {/* Copy Link Button */}
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-lolcow-lightgray hover:bg-lolcow-lightgray text-gray-300 hover:text-white transition-all duration-200"
                    onClick={handleCopyLink}
                  >
                    {copiedLink ? (
                      <>
                        <Check className="h-4 w-4 mr-2 text-green-500" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Share
                      </>
                    )}
                  </Button>
                </div>

                {/* Product Type Badge */}
                {product.productType && (
                  <div>
                    <Badge variant="secondary" className="bg-lolcow-darkgray text-white">
                      {product.productType}
                    </Badge>
                  </div>
                )}

                {/* Variant Options */}
                {groupedOptions.length > 0 && (
                  <div className="space-y-4">
                    {groupedOptions.map(option => (
                      <div key={option.name} className="bg-lolcow-darkgray/30 p-4 rounded-lg">
                        <label className="block text-sm font-semibold text-white mb-3">
                          Select {option.name}
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {option.values.map(value => {
                            const isSelected = selectedVariant?.selectedOptions.find(
                              opt => opt.name === option.name
                            )?.value === value;
                            
                            // Check if this option value has any available variants considering other selected options
                            const hasAvailableVariant = product.variants.some(variant => {
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
                                  // Check if other options match current selection
                                  const currentSelection = selectedVariant.selectedOptions.find(
                                    selected => selected.name === opt.name
                                  );
                                  return currentSelection ? currentSelection.value === opt.value : true;
                                });
                              }
                              
                              return true;
                            });
                            
                            return (
                              <div key={value} className="relative group">
                                <Button
                                  variant={isSelected ? "default" : "outline"}
                                  size="default"
                                  onClick={() => handleVariantSelect(option.name, value)}
                                  disabled={!hasAvailableVariant}
                                  className={
                                    !hasAvailableVariant 
                                      ? "opacity-40 cursor-not-allowed bg-lolcow-darkgray/30 border-lolcow-lightgray/10 text-gray-600 line-through hover:bg-lolcow-darkgray/30 hover:border-lolcow-lightgray/10 hover:text-gray-600"
                                      : isSelected 
                                        ? "bg-lolcow-blue hover:bg-lolcow-blue/80 shadow-lg border-lolcow-blue" 
                                        : "border-lolcow-lightgray/50 text-gray-300 hover:text-white hover:border-white hover:bg-lolcow-lightgray/20"
                                  }
                                >
                                  {value}
                                </Button>
                                {!hasAvailableVariant && (
                                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black/90 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                                    Out of stock
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add to Cart Button */}
                <div className="flex flex-col gap-4 pt-4 border-t border-lolcow-lightgray/20">
                  <Button
                    size="lg"
                    className="w-full bg-lolcow-blue hover:bg-lolcow-blue/80 text-white font-semibold py-6 text-lg shadow-lg hover:shadow-xl transition-all duration-300"
                    disabled={!selectedVariant?.available}
                    asChild
                  >
                    <a 
                      href={`https://lolcow.co/products/${handle}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      <ShoppingCart className="h-5 w-5 mr-2" />
                      {selectedVariant?.available ? 'Add to Cart' : 'Out of Stock'}
                    </a>
                  </Button>
                  
                  {!selectedVariant?.available && (
                    <p className="text-center text-red-400 text-sm">
                      This variant is currently out of stock
                    </p>
                  )}
                  
                  {/* Additional Info */}
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                    <Info className="h-3 w-3" />
                    <span>Product availability and pricing may vary</span>
                  </div>
                </div>

                {/* Description with Tabs */}
                <Tabs defaultValue="description" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-lolcow-darkgray">
                    <TabsTrigger value="description">Description</TabsTrigger>
                    <TabsTrigger value="details">Details</TabsTrigger>
                  </TabsList>
                  <TabsContent value="description" className="mt-6">
                    {(product.descriptionHtml || product.description) && (
                      <div 
                        className="space-y-6 text-gray-300
                          [&_h1]:text-2xl [&_h1]:font-fredoka [&_h1]:font-semibold [&_h1]:text-white [&_h1]:mb-6 [&_h1]:mt-8
                          [&_h2]:text-xl [&_h2]:font-fredoka [&_h2]:font-semibold [&_h2]:text-white [&_h2]:mb-4 [&_h2]:mt-8
                          [&_h3]:text-lg [&_h3]:font-fredoka [&_h3]:font-medium [&_h3]:text-white [&_h3]:mb-3 [&_h3]:mt-6
                          [&_p]:mb-6 [&_p]:leading-loose [&_p]:text-gray-300
                          [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:mb-6 [&_ul]:space-y-3
                          [&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:mb-6 [&_ol]:space-y-3
                          [&_li]:text-gray-300 [&_li]:leading-relaxed
                          [&_strong]:text-white [&_strong]:font-semibold
                          [&_a]:text-lolcow-blue [&_a]:no-underline hover:[&_a]:underline
                          [&_table]:w-full [&_table]:my-10
                          [&_table]:bg-lolcow-darkgray/30 [&_table]:rounded-lg [&_table]:overflow-hidden
                          [&_thead]:bg-lolcow-darkgray/50
                          [&_th]:px-6 [&_th]:py-4 [&_th]:text-left [&_th]:font-medium [&_th]:text-gray-400 
                          [&_th]:text-sm [&_th]:uppercase [&_th]:tracking-wider
                          [&_td]:px-6 [&_td]:py-4 [&_td]:text-gray-300
                          [&_tbody_tr]:border-t [&_tbody_tr]:border-lolcow-lightgray/10
                          [&_tbody_tr:hover]:bg-lolcow-lightgray/5 [&_tbody_tr]:transition-colors
                          [&>*:first-child]:mt-0"
                        dangerouslySetInnerHTML={{ __html: product.descriptionHtml || product.description }}
                      />
                    )}
                  </TabsContent>
                  <TabsContent value="details" className="mt-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <Award className="h-5 w-5 text-lolcow-blue" />
                        <div>
                          <p className="text-sm font-medium text-white">Premium Quality</p>
                          <p className="text-xs text-gray-400">100% authentic merchandise</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Ruler className="h-5 w-5 text-green-400" />
                        <div>
                          <p className="text-sm font-medium text-white">True to Size</p>
                          <p className="text-xs text-gray-400">Check our size guide below</p>
                        </div>
                      </div>
                    </div>
                    {product.productType && (
                      <div className="border-t border-lolcow-lightgray/20 pt-4">
                        <p className="text-sm text-gray-400">Product Type</p>
                        <p className="text-white">{product.productType}</p>
                      </div>
                    )}
                    {product.vendor && (
                      <div className="border-t border-lolcow-lightgray/20 pt-4">
                        <p className="text-sm text-gray-400">Brand</p>
                        <p className="text-white">{product.vendor}</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        </section>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section className="py-16 bg-lolcow-darkgray">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-2xl font-fredoka text-white mb-8">You May Also Like</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {relatedProducts
                  .filter(p => p.handle !== handle)
                  .slice(0, 4)
                  .map((relatedProduct) => (
                    <ProductCard key={relatedProduct.id} product={relatedProduct} />
                  ))}
              </div>
            </div>
          </section>
        )}

        {/* Recently Viewed */}
        <section className="py-16 bg-lolcow-black">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-fredoka text-white mb-8">Recently Viewed</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {JSON.parse(localStorage.getItem('recentlyViewed') || '[]')
                .filter((item: any) => item.handle !== handle)
                .slice(0, 6)
                .map((item: any, index: number) => (
                  <Link
                    key={index}
                    to={`/shop/products/${item.handle}`}
                    className="group bg-lolcow-darkgray rounded-lg overflow-hidden hover:bg-lolcow-lightgray transition-all duration-300"
                  >
                    <div className="aspect-square">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-lolcow-lightgray">
                          <Package className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="text-sm font-medium text-white line-clamp-1 group-hover:text-lolcow-blue transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-sm text-lolcow-blue font-bold mt-1">
                        ${item.price}
                      </p>
                    </div>
                  </Link>
                ))}
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default ProductDetail;