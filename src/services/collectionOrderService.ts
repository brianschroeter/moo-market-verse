import { supabase } from "@/integrations/supabase/client";

export interface CollectionOrder {
  id: number;
  collection_handle: string;
  display_order: number;
  is_visible: boolean;
  featured: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface CreateCollectionOrderParams {
  collection_handle: string;
  display_order: number;
  is_visible?: boolean;
  featured?: boolean;
}

export interface UpdateCollectionOrderParams {
  display_order?: number;
  is_visible?: boolean;
  featured?: boolean;
}

/**
 * Get all collection orders (Admin only)
 */
export async function getAllCollectionOrders(): Promise<CollectionOrder[]> {
  const { data, error } = await supabase
    .from('collection_order')
    .select('*')
    .order('display_order', { ascending: true });

  if (error) {
    console.error("Error fetching collection orders:", error);
    throw new Error(error.message);
  }

  return data || [];
}

/**
 * Get visible collection orders for public display
 */
export async function getVisibleCollectionOrders(): Promise<CollectionOrder[]> {
  const { data, error } = await supabase
    .from('collection_order')
    .select('*')
    .eq('is_visible', true)
    .order('display_order', { ascending: true });

  if (error) {
    console.error("Error fetching visible collection orders:", error);
    return [];
  }

  return data || [];
}

/**
 * Create a new collection order (Admin only)
 */
export async function createCollectionOrder(params: CreateCollectionOrderParams): Promise<CollectionOrder> {
  const { data, error } = await supabase
    .from('collection_order')
    .insert([{
      ...params,
      created_by: (await supabase.auth.getUser()).data.user?.id
    }])
    .select()
    .single();

  if (error) {
    console.error("Error creating collection order:", error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * Update a collection order (Admin only)
 */
export async function updateCollectionOrder(id: number, params: UpdateCollectionOrderParams): Promise<CollectionOrder> {
  const { data, error } = await supabase
    .from('collection_order')
    .update(params)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error("Error updating collection order:", error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * Delete a collection order (Admin only)
 */
export async function deleteCollectionOrder(id: number): Promise<void> {
  const { error } = await supabase
    .from('collection_order')
    .delete()
    .eq('id', id);

  if (error) {
    console.error("Error deleting collection order:", error);
    throw new Error(error.message);
  }
}

/**
 * Bulk update collection order positions (Admin only)
 */
export async function bulkUpdateCollectionOrder(orders: { id: number; display_order: number }[]): Promise<void> {
  const updates = orders.map(async (order) => {
    return supabase
      .from('collection_order')
      .update({ display_order: order.display_order })
      .eq('id', order.id);
  });

  const results = await Promise.all(updates);
  
  // Check if any updates failed
  const errors = results.filter(result => result.error);
  if (errors.length > 0) {
    console.error("Error bulk updating collection orders:", errors);
    throw new Error("Failed to update collection orders");
  }
}

/**
 * Initialize collection orders from existing collections
 */
export async function initializeCollectionOrders(collections: { handle: string; title: string }[]): Promise<void> {
  // Get existing orders
  const existingOrders = await getAllCollectionOrders();
  const existingHandles = new Set(existingOrders.map(order => order.collection_handle));

  // Get current user ID
  const { data: { user } } = await supabase.auth.getUser();

  // Define featured collections (from previous hardcoded order)
  const featuredHandles = new Set([
    'lolcow-live',
    'lolcow-queen', 
    'lolcow-queens',
    'lolcow-rewind',
    'lolcow-nerd',
    'lolcow-test',
    'mafia-milkers',
    'lolcow-techtalk',
    'lolcow-tech-talk',
    'lolcow-cafe',
    'lolcow-aussy',
    'lolcow-aussie',
    'lolcow-ausi',
    'angry-grandpa'
  ]);

  // Create orders for collections that don't have them yet
  const newOrders = collections
    .filter(collection => !existingHandles.has(collection.handle))
    .map((collection, index) => ({
      collection_handle: collection.handle,
      display_order: existingOrders.length + index,
      is_visible: true,
      featured: featuredHandles.has(collection.handle),
      created_by: user?.id
    }));

  if (newOrders.length > 0) {
    const { error } = await supabase
      .from('collection_order')
      .insert(newOrders);

    if (error) {
      console.error("Error initializing collection orders:", error);
      throw new Error(error.message);
    }
  }
}