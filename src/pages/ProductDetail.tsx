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
import { ChevronLeft, ShoppingCart, Package, Star, Info, Truck, Shield, RefreshCw, ZoomIn, Share2, Heart, Facebook, Twitter, Copy, Check, Ruler, Clock, Award } from "lucide-react";
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
  const [isFavorited, setIsFavorited] = useState(false);

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

  const handleShare = async (platform: string) => {
    const url = window.location.href;
    const text = `Check out ${product?.title} at LolCow Shop!`;
    
    switch (platform) {
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
        break;
      case 'copy':
        await navigator.clipboard.writeText(url);
        setCopiedLink(true);
        toast.success('Link copied to clipboard!');
        setTimeout(() => setCopiedLink(false), 2000);
        break;
    }
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
        {/* Breadcrumb */}
        <div className="bg-lolcow-darkgray border-b border-lolcow-lightgray/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <nav className="flex items-center space-x-2 text-sm">
              <Button
                variant="ghost"
                onClick={() => navigate('/shop')}
                className="text-gray-300 hover:text-white p-0"
              >
                Shop
              </Button>
              <span className="text-gray-500">/</span>
              <span className="text-white">{product.title}</span>
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
                  className="aspect-square rounded-lg overflow-hidden bg-lolcow-darkgray relative cursor-zoom-in"
                  onMouseEnter={() => setIsZoomed(true)}
                  onMouseLeave={() => setIsZoomed(false)}
                  onMouseMove={handleMouseMove}
                >
                  {product.images && product.images.length > 0 ? (
                    <>
                      <img
                        src={product.images[selectedImage].url}
                        alt={product.images[selectedImage].altText || product.title}
                        className="w-full h-full object-cover"
                      />
                      {/* Zoom indicator */}
                      <div className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
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
                  <div className="grid grid-cols-4 gap-2">
                    {product.images.map((image, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImage(index)}
                        className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                          selectedImage === index 
                            ? 'border-lolcow-blue' 
                            : 'border-transparent hover:border-lolcow-lightgray/50'
                        }`}
                      >
                        <img
                          src={image.url}
                          alt={image.altText || `${product.title} ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="space-y-8">
                <div>
                  <h1 className="text-3xl md:text-4xl font-fredoka text-white mb-2">
                    {product.title}
                  </h1>
                  {product.vendor && (
                    <p className="text-gray-300">by {product.vendor}</p>
                  )}
                </div>

                {/* Price and Share */}
                <div className="flex items-center justify-between">
                  <div className="text-3xl font-bold text-white">
                    {selectedVariant ? (
                      formatPrice(selectedVariant.price, product.priceRange.currencyCode)
                    ) : (
                      formatPrice(product.priceRange.min, product.priceRange.currencyCode)
                    )}
                  </div>
                  
                  {/* Share and Favorite Buttons */}
                  <div className="flex gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      className="border-lolcow-lightgray hover:bg-lolcow-lightgray"
                      onClick={() => setIsFavorited(!isFavorited)}
                    >
                      <Heart className={`h-4 w-4 ${isFavorited ? 'fill-red-500 text-red-500' : ''}`} />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="border-lolcow-lightgray hover:bg-lolcow-lightgray"
                      onClick={() => handleShare('facebook')}
                    >
                      <Facebook className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="border-lolcow-lightgray hover:bg-lolcow-lightgray"
                      onClick={() => handleShare('twitter')}
                    >
                      <Twitter className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="border-lolcow-lightgray hover:bg-lolcow-lightgray"
                      onClick={() => handleShare('copy')}
                    >
                      {copiedLink ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {/* Product Type & Tags */}
                <div className="flex flex-wrap gap-2">
                  {product.productType && (
                    <Badge variant="secondary" className="bg-lolcow-darkgray text-white">
                      {product.productType}
                    </Badge>
                  )}
                  {product.tags.slice(0, 3).map((tag, index) => (
                    <Badge key={index} variant="outline" className="border-lolcow-lightgray text-gray-300">
                      {tag}
                    </Badge>
                  ))}
                </div>

                {/* Description with Tabs */}
                <Tabs defaultValue="description" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 bg-lolcow-darkgray">
                    <TabsTrigger value="description">Description</TabsTrigger>
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="shipping">Shipping</TabsTrigger>
                  </TabsList>
                  <TabsContent value="description" className="mt-6">
                    {(product.descriptionHtml || product.description) && (
                      <div 
                        className="prose prose-invert max-w-none text-gray-300 
                          prose-headings:text-white prose-headings:font-fredoka
                          prose-p:mb-6 prose-p:leading-relaxed
                          prose-a:text-lolcow-blue prose-a:no-underline hover:prose-a:underline 
                          prose-strong:text-white prose-strong:font-semibold
                          prose-ul:list-disc prose-ul:ml-6 prose-ul:mb-6
                          prose-ol:list-decimal prose-ol:ml-6 prose-ol:mb-6
                          prose-li:mb-2
                          prose-table:w-full prose-table:border-collapse prose-table:my-8
                          prose-th:bg-lolcow-darkgray prose-th:border prose-th:border-lolcow-lightgray/30 
                          prose-th:px-6 prose-th:py-4 prose-th:text-left prose-th:font-semibold prose-th:text-white
                          prose-th:text-sm prose-th:uppercase prose-th:tracking-wider
                          prose-td:border prose-td:border-lolcow-lightgray/30 prose-td:px-6 prose-td:py-4
                          prose-td:text-gray-300
                          prose-tbody:bg-lolcow-darkgray/50
                          prose-tr:transition-colors hover:prose-tr:bg-lolcow-lightgray/10
                          prose-thead:border-b-2 prose-thead:border-lolcow-lightgray/40
                          [&_table]:rounded-lg [&_table]:overflow-hidden [&_table]:shadow-lg"
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
                  <TabsContent value="shipping" className="mt-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <Truck className="h-5 w-5 text-lolcow-blue" />
                      <div>
                        <p className="text-sm font-medium text-white">Standard Shipping</p>
                        <p className="text-xs text-gray-400">5-7 business days • Free on orders over $50</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-orange-400" />
                      <div>
                        <p className="text-sm font-medium text-white">Express Shipping</p>
                        <p className="text-xs text-gray-400">2-3 business days • Additional charges apply</p>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

                {/* Variant Options */}
                {groupedOptions.length > 0 && (
                  <div className="space-y-4">
                    {groupedOptions.map(option => (
                      <div key={option.name}>
                        <label className="block text-sm font-medium text-white mb-2">
                          {option.name}
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {option.values.map(value => {
                            const isSelected = selectedVariant?.selectedOptions.find(
                              opt => opt.name === option.name
                            )?.value === value;
                            
                            return (
                              <Button
                                key={value}
                                variant={isSelected ? "default" : "outline"}
                                size="sm"
                                onClick={() => handleVariantSelect(option.name, value)}
                                className={isSelected 
                                  ? "bg-lolcow-blue hover:bg-lolcow-blue/80" 
                                  : "border-lolcow-lightgray text-gray-300 hover:text-white hover:border-white"
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

                {/* Add to Cart Button */}
                <div className="flex flex-col gap-4">
                  <Button
                    size="lg"
                    className="w-full bg-lolcow-blue hover:bg-lolcow-blue/80 text-white font-semibold py-6 text-lg"
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
                </div>


                {/* Additional Info */}
                <div className="space-y-2 text-sm text-gray-400">
                  <p className="flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Product availability and pricing may vary
                  </p>
                </div>
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