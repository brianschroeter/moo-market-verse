import { supabase } from "@/integrations/supabase/client";

export interface FlashSale {
  id: number;
  title: string;
  description?: string;
  discount_text?: string;
  start_date?: string;
  end_date?: string;
  is_active: boolean;
  priority: number;
  banner_color: string;
  text_color: string;
  action_url?: string;
  action_text: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface CreateFlashSaleParams {
  title: string;
  description?: string;
  discount_text?: string;
  start_date?: string;
  end_date?: string;
  priority?: number;
  banner_color?: string;
  text_color?: string;
  action_url?: string;
  action_text?: string;
}

/**
 * Get active flash sales from database
 */
export async function getActiveFlashSales(): Promise<FlashSale[]> {
  try {
    const { data, error } = await supabase
      .from('flash_sales')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching active flash sales:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error fetching flash sales:", error);
    return [];
  }
}

/**
 * Create a new flash sale (Admin only)
 */
export async function createFlashSale(params: CreateFlashSaleParams): Promise<FlashSale> {
  const { data, error } = await supabase
    .from('flash_sales')
    .insert([{
      ...params,
      created_by: (await supabase.auth.getUser()).data.user?.id
    }])
    .select()
    .single();

  if (error) {
    console.error("Error creating flash sale:", error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * Update a flash sale (Admin only)
 */
export async function updateFlashSale(id: number, params: Partial<CreateFlashSaleParams>): Promise<FlashSale> {
  const { data, error } = await supabase
    .from('flash_sales')
    .update(params)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error("Error updating flash sale:", error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * Delete a flash sale (Admin only)
 */
export async function deleteFlashSale(id: number): Promise<void> {
  const { error } = await supabase
    .from('flash_sales')
    .delete()
    .eq('id', id);

  if (error) {
    console.error("Error deleting flash sale:", error);
    throw new Error(error.message);
  }
}

/**
 * Get all flash sales for admin (Admin only)
 */
export async function getAllFlashSales(): Promise<FlashSale[]> {
  const { data, error } = await supabase
    .from('flash_sales')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching all flash sales:", error);
    throw new Error(error.message);
  }

  return data || [];
}

/**
 * Toggle flash sale active status (Admin only)
 */
export async function toggleFlashSaleStatus(id: number, isActive: boolean): Promise<FlashSale> {
  const { data, error } = await supabase
    .from('flash_sales')
    .update({ is_active: isActive })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error("Error toggling flash sale status:", error);
    throw new Error(error.message);
  }

  return data;
}