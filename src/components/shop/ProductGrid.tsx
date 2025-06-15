import React from "react";
import { Link } from "react-router-dom";
import { Product } from "@/services/types/shopify-types";
import { formatPrice, getProductImage } from "@/services/shopify/shopifyStorefrontService";
import { ExternalLink, ShoppingCart, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProductGridProps {
  products: Product[];
  loading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  shopDomain?: string;
}

interface ShopProductCardProps extends Product {
  shopDomain?: string;
}

const ShopProductCard: React.FC<ShopProductCardProps> = ({
  handle,
  title,
  description,
  priceRange,
  featuredImageUrl,
  available,
  vendor,
  shopDomain,
}) => {
  const productUrl = shopDomain ? `https://${shopDomain}/products/${handle}` : `https://lolcow.co/products/${handle}`;
  const imageUrl = getProductImage({ 
    handle, 
    title, 
    description, 
    priceRange, 
    featuredImageUrl, 
    available,
    vendor,
    id: "",
    productType: "",
    tags: []
  }, "400");

  const handleBuyClick = (e: React.MouseEvent) => {
    e.preventDefault();
    window.open(productUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="group bg-lolcow-darkgray rounded-lg overflow-hidden hover:bg-lolcow-lightgray transition-all duration-300 transform hover:scale-105">
      <Link to={`/shop/products/${handle}`} className="block aspect-square relative overflow-hidden">
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
        />
        {!available && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <span className="text-white font-semibold">Out of Stock</span>
          </div>
        )}
        {/* View Details Overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="text-white text-center">
            <Eye className="h-6 w-6 mx-auto mb-1" />
            <span className="text-xs font-medium">View Details</span>
          </div>
        </div>
      </Link>
      
      <div className="p-4">
        <div className="mb-2">
          {vendor && (
            <span className="text-lolcow-blue text-xs font-medium uppercase tracking-wide">
              {vendor}
            </span>
          )}
        </div>
        
        <Link to={`/shop/products/${handle}`}>
          <h3 className="text-lg font-semibold text-white group-hover:text-lolcow-blue transition-colors line-clamp-2 mb-2">
            {title}
          </h3>
        </Link>
        
        {description && (
          <p className="text-gray-300 text-sm line-clamp-2 mb-3">
            {description}
          </p>
        )}
        
        <div className="flex items-center justify-between mb-3">
          <div className="text-lolcow-blue font-bold">
            {priceRange.min === priceRange.max ? (
              formatPrice(priceRange.min, priceRange.currencyCode)
            ) : (
              `${formatPrice(priceRange.min, priceRange.currencyCode)} - ${formatPrice(priceRange.max, priceRange.currencyCode)}`
            )}
          </div>
        </div>
        
        <Button 
          onClick={handleBuyClick}
          disabled={!available}
          className="w-full btn-primary flex items-center justify-center space-x-2"
        >
          <ShoppingCart className="h-4 w-4" />
          <span>{available ? 'Shop Now' : 'Out of Stock'}</span>
          <ExternalLink className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};

const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  loading = false,
  onLoadMore,
  hasMore = false,
  shopDomain,
}) => {
  if (loading && products.length === 0) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-lolcow-darkgray rounded-lg overflow-hidden animate-pulse">
            <div className="aspect-square bg-lolcow-lightgray" />
            <div className="p-4 space-y-3">
              <div className="h-4 bg-lolcow-lightgray rounded w-3/4" />
              <div className="h-3 bg-lolcow-lightgray rounded w-full" />
              <div className="h-3 bg-lolcow-lightgray rounded w-2/3" />
              <div className="h-8 bg-lolcow-lightgray rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <ShoppingCart className="h-16 w-16 text-lolcow-blue opacity-50 mx-auto mb-4" />
        <h3 className="text-xl font-fredoka text-white mb-2">No products found</h3>
        <p className="text-gray-300">Try browsing a different collection or check back later.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map((product) => (
          <ShopProductCard
            key={product.id}
            {...product}
            shopDomain={shopDomain}
          />
        ))}
      </div>
      
      {hasMore && onLoadMore && (
        <div className="text-center">
          <Button
            onClick={onLoadMore}
            disabled={loading}
            className="btn-outline"
          >
            {loading ? 'Loading...' : 'Load More Products'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default ProductGrid;