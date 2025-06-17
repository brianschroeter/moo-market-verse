import { supabase } from "@/integrations/supabase/client";
import { Product } from "@/services/types/shopify-types";
import { getFeaturedProducts as getShopifyFeaturedProducts } from "@/services/shopify/shopifyStorefrontService";

export interface FeaturedProductConfig {
  id: string;
  product_handle: string;
  display_order: number;
  is_active: boolean;
  force_show_if_sold_out: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Get featured products with advanced filtering options
 */
export async function getFeaturedProductsWithOptions(options: {
  limit?: number;
  includeUnavailable?: boolean;
  minAvailableCount?: number;
  fallbackToAllIfNeeded?: boolean;
}): Promise<{
  products: Product[];
  metadata: {
    totalFetched: number;
    availableCount: number;
    unavailableCount: number;
    hasMinimumProducts: boolean;
  };
}> {
  const { 
    limit = 6, 
    includeUnavailable = false,
    minAvailableCount = 3,
    fallbackToAllIfNeeded = true
  } = options;

  try {
    // First, try to get products with availability filter
    let products = await getShopifyFeaturedProducts(limit);
    
    // Count available products
    const availableProducts = products.filter(p => p.available);
    const availableCount = availableProducts.length;
    
    // If we don't have enough available products and fallback is enabled
    if (availableCount < minAvailableCount && fallbackToAllIfNeeded && !includeUnavailable) {
      // Fetch more products to find additional available ones
      const additionalProducts = await getShopifyFeaturedProducts(limit * 2);
      const additionalAvailable = additionalProducts.filter(p => p.available);
      
      // If we still don't have enough, include some sold out items
      if (additionalAvailable.length < limit) {
        const soldOutToInclude = additionalProducts
          .filter(p => !p.available)
          .slice(0, limit - additionalAvailable.length);
        
        products = [...additionalAvailable, ...soldOutToInclude].slice(0, limit);
      } else {
        products = additionalAvailable.slice(0, limit);
      }
    } else if (!includeUnavailable) {
      // Filter to only available products
      products = availableProducts.slice(0, limit);
    }

    return {
      products,
      metadata: {
        totalFetched: products.length,
        availableCount: products.filter(p => p.available).length,
        unavailableCount: products.filter(p => !p.available).length,
        hasMinimumProducts: products.filter(p => p.available).length >= minAvailableCount,
      },
    };
  } catch (error) {
    console.error('Error fetching featured products:', error);
    throw error;
  }
}

/**
 * Get admin-configured featured products
 * This would be used if you want manual control over which products are featured
 */
export async function getAdminFeaturedProducts(): Promise<FeaturedProductConfig[]> {
  const { data, error } = await supabase
    .from('featured_products_config')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching featured products config:', error);
    return [];
  }

  return data || [];
}

/**
 * Update featured product configuration (Admin only)
 */
export async function updateFeaturedProductConfig(
  productHandle: string,
  config: Partial<FeaturedProductConfig>
): Promise<FeaturedProductConfig | null> {
  const { data, error } = await supabase
    .from('featured_products_config')
    .upsert({
      product_handle: productHandle,
      ...config,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error updating featured product config:', error);
    throw error;
  }

  return data;
}

/**
 * Strategy pattern for different display modes
 */
export enum FeaturedProductsDisplayMode {
  AVAILABLE_ONLY = 'available_only',
  MIXED_PRIORITIZE_AVAILABLE = 'mixed_prioritize_available',
  ALL_WITH_SOLD_OUT_LAST = 'all_with_sold_out_last',
  ADMIN_CONFIGURED = 'admin_configured',
}

export async function getFeaturedProductsByMode(
  mode: FeaturedProductsDisplayMode,
  limit: number = 6
): Promise<Product[]> {
  switch (mode) {
    case FeaturedProductsDisplayMode.AVAILABLE_ONLY:
      const { products: availableOnly } = await getFeaturedProductsWithOptions({
        limit,
        includeUnavailable: false,
        fallbackToAllIfNeeded: false,
      });
      return availableOnly;

    case FeaturedProductsDisplayMode.MIXED_PRIORITIZE_AVAILABLE:
      const { products: mixed } = await getFeaturedProductsWithOptions({
        limit,
        includeUnavailable: false,
        fallbackToAllIfNeeded: true,
        minAvailableCount: Math.floor(limit / 2),
      });
      return mixed;

    case FeaturedProductsDisplayMode.ALL_WITH_SOLD_OUT_LAST:
      const allProducts = await getShopifyFeaturedProducts(limit);
      // Sort: available products first, then sold out
      return allProducts.sort((a, b) => {
        if (a.available === b.available) return 0;
        return a.available ? -1 : 1;
      });

    case FeaturedProductsDisplayMode.ADMIN_CONFIGURED:
      // This would use the admin configuration table
      // For now, fall back to default behavior
      return getShopifyFeaturedProducts(limit);

    default:
      return getShopifyFeaturedProducts(limit);
  }
}