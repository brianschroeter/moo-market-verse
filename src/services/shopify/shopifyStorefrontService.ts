import { supabase } from "@/integrations/supabase/client";
import {
  Collection,
  Product,
  ProductDetail,
  CollectionsResponse,
  CollectionProductsResponse,
  ProductDetailResponse,
  GetCollectionsParams,
  GetCollectionProductsParams,
  ShopifyApiError,
} from "@/services/types/shopify-types";

const SHOPIFY_STOREFRONT_FUNCTION = "shopify-storefront";

// Helper function to make requests to the Shopify Storefront edge function
async function makeStorefrontRequest<T>(
  path: string,
  params?: Record<string, string>
): Promise<T> {
  try {
    // Always use production for Shopify API calls since the function only exists there
    const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL?.includes('localhost') 
      ? 'https://dlmbqojnhjsecajxltzj.supabase.co'
      : supabase.supabaseUrl;
    
    const url = new URL(`${supabaseUrl}/functions/v1/${SHOPIFY_STOREFRONT_FUNCTION}/${path}`);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData: ShopifyApiError = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Shopify Storefront API error for ${path}:`, error);
    throw error instanceof Error ? error : new Error("Unknown error occurred");
  }
}

/**
 * Get all collections from Shopify
 */
export async function getCollections(params: GetCollectionsParams = {}): Promise<CollectionsResponse> {
  const queryParams: Record<string, string> = {};
  
  if (params.limit) {
    queryParams.limit = params.limit.toString();
  }
  
  if (params.cursor) {
    queryParams.cursor = params.cursor;
  }

  return await makeStorefrontRequest<CollectionsResponse>("collections", queryParams);
}

/**
 * Get a specific collection with its products
 */
export async function getCollectionProducts(params: GetCollectionProductsParams): Promise<CollectionProductsResponse> {
  const queryParams: Record<string, string> = {};
  
  if (params.limit) {
    queryParams.limit = params.limit.toString();
  }
  
  if (params.cursor) {
    queryParams.cursor = params.cursor;
  }

  return await makeStorefrontRequest<CollectionProductsResponse>(
    `collections/${params.handle}`,
    queryParams
  );
}

/**
 * Get a specific product by handle
 */
export async function getProduct(handle: string): Promise<ProductDetailResponse> {
  return await makeStorefrontRequest<ProductDetailResponse>(`products/${handle}`);
}

/**
 * Get product detail (alias for getProduct for consistency)
 */
export async function getProductDetail(handle: string): Promise<ProductDetailResponse> {
  return getProduct(handle);
}

/**
 * Get featured products (best selling)
 */
export async function getFeaturedProducts(limit: number = 6): Promise<Product[]> {
  // Request more products to account for filtering
  const requestLimit = Math.max(limit + 3, 10); // Get extra products to ensure we have enough after filtering
  const params: Record<string, string> = {
    limit: requestLimit.toString()
  };
  
  const response = await makeStorefrontRequest<{data: Product[], pageInfo: any}>("featured-products", params);
  const products = response.data || [];
  
  // Return only the requested number of products
  return products.slice(0, limit);
}

/**
 * Search products across the store
 * Note: This will be implemented in a later phase
 */
export async function searchProducts(query: string): Promise<Product[]> {
  // Placeholder implementation - will be enhanced in later phases
  console.warn("Search products not yet implemented");
  return [];
}

/**
 * Sync collections from Shopify (Admin only)
 */
export async function syncCollectionsFromShopify(): Promise<{ message: string; status: string }> {
  try {
    const { data: session } = await supabase.auth.getSession();
    
    if (!session?.session?.access_token) {
      throw new Error("Authentication required for sync operations");
    }

    // Always use production for Shopify API calls since the function only exists there
    const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL?.includes('localhost') 
      ? 'https://dlmbqojnhjsecajxltzj.supabase.co'
      : supabase.supabaseUrl;

    const response = await fetch(
      `${supabaseUrl}/functions/v1/${SHOPIFY_STOREFRONT_FUNCTION}/sync-collections`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.session.access_token}`,
        },
      }
    );

    if (!response.ok) {
      const errorData: ShopifyApiError = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error syncing collections:", error);
    throw error instanceof Error ? error : new Error("Unknown sync error occurred");
  }
}

/**
 * Helper function to format price for display
 */
export function formatPrice(amount: number, currencyCode: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
  }).format(amount);
}

/**
 * Helper function to get product URL for Shopify store
 */
export function getProductUrl(handle: string, shopDomain?: string): string {
  // For now, return a placeholder - this would be configured based on your Shopify store
  const domain = shopDomain || "lolcow.co";
  return `https://${domain}/products/${handle}`;
}

/**
 * Helper function to check if product has multiple variants
 */
export function hasMultipleVariants(product: ProductDetail): boolean {
  return product.variants && product.variants.length > 1;
}

/**
 * Helper function to get the best available image for a product
 */
export function getProductImage(product: Product | ProductDetail, size?: string): string {
  const imageUrl = product.featuredImageUrl;
  
  if (!imageUrl) {
    return "/placeholder.svg"; // Use your existing placeholder
  }

  // Shopify CDN image transformations
  if (size && imageUrl.includes("cdn.shopify.com")) {
    const url = new URL(imageUrl);
    url.searchParams.set("width", size);
    return url.toString();
  }

  return imageUrl;
}