import { supabase } from "@/integrations/supabase/client";

export interface SyncProductsResponse {
  success: boolean;
  products_synced: number;
  products_found: number;
  products_excluded: number;
  products_failed: number;
  collections_synced: number;
  collection_products_synced: number;
  timestamp: string;
  excluded_products: Array<{
    id: string;
    title: string;
    handle: string;
    reason: string;
  }>;
  errors: string[];
}

export async function syncShopifyProducts(): Promise<SyncProductsResponse> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Not authenticated');
    }

    const response = await supabase.functions.invoke('sync-shopify-products', {
      method: 'POST',
    });

    if (response.error) {
      throw response.error;
    }

    return response.data as SyncProductsResponse;
  } catch (error) {
    console.error('Error syncing Shopify products:', error);
    throw error;
  }
}