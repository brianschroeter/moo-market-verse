import { supabase } from "@/integrations/supabase/client";

export async function syncShopifyProducts() {
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

    return response.data;
  } catch (error) {
    console.error('Error syncing Shopify products:', error);
    throw error;
  }
}