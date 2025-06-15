// Shopify Storefront API Types

export interface Collection {
  id: string;
  handle: string;
  title: string;
  description?: string;
  imageUrl?: string;
  productCount: number;
}

export interface CollectionDetail extends Collection {
  products: Product[];
}

export interface Product {
  id: string;
  handle: string;
  title: string;
  description: string;
  vendor?: string;
  productType?: string;
  tags: string[];
  featuredImageUrl?: string;
  priceRange: {
    min: number;
    max: number;
    currencyCode: string;
  };
  available: boolean;
}

export interface ProductImage {
  url: string;
  altText?: string;
}

export interface ProductVariant {
  id: string;
  title: string;
  price: number;
  available: boolean;
  selectedOptions: Array<{
    name: string;
    value: string;
  }>;
}

export interface ProductDetail extends Product {
  descriptionHtml?: string;
  images: ProductImage[];
  variants: ProductVariant[];
}

export interface PaginationInfo {
  hasNextPage: boolean;
  endCursor?: string;
}

export interface CollectionsResponse {
  data: Collection[];
  pageInfo: PaginationInfo;
}

export interface CollectionProductsResponse {
  collection: {
    id: string;
    title: string;
    description?: string;
    imageUrl?: string;
  };
  products: Product[];
  pageInfo: PaginationInfo;
}

export interface ProductDetailResponse {
  product: ProductDetail;
}

export interface ShopifyApiError {
  error: string;
  details?: any;
}

// Service layer types
export interface GetCollectionsParams {
  limit?: number;
  cursor?: string;
}

export interface GetCollectionProductsParams {
  handle: string;
  limit?: number;
  cursor?: string;
}

export interface SearchProductsParams {
  query: string;
  limit?: number;
  cursor?: string;
}

// Database types for cached data
export interface ShopifyCollectionRecord {
  id: number;
  handle: string;
  title: string;
  description?: string;
  image_url?: string;
  products_count: number;
  last_synced_at: string;
  created_at: string;
  updated_at: string;
}

export interface ShopifyProductRecord {
  id: number;
  handle: string;
  title: string;
  description?: string;
  vendor?: string;
  product_type?: string;
  tags: string[];
  status: string;
  featured_image_url?: string;
  price_min: number;
  price_max: number;
  available: boolean;
  last_synced_at: string;
  created_at: string;
  updated_at: string;
}

export interface CollectionProductRecord {
  collection_id: number;
  product_id: number;
  position?: number;
}