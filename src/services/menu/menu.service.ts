import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/database.types";

export type MenuItem = Database["public"]["Tables"]["menu_items"]["Row"];

/**
 * Fetches all menu items and their enabled status.
 * Assumes RLS allows public read access.
 */
export const getMenuItems = async (): Promise<MenuItem[]> => {
  const { data, error } = await supabase
    .from("menu_items")
    .select("*")
    .order("item_key", { ascending: true }); // Optional: order for consistency

  if (error) {
    console.error("Error fetching menu items:", error);
    throw error;
  }

  return data || [];
};

/**
 * Updates the enabled status of a specific menu item.
 * Requires admin privileges (enforced by RLS).
 * @param itemKey - The key of the menu item to update (e.g., 'schedule').
 * @param isEnabled - The new enabled status (true or false).
 */
export const updateMenuItemStatus = async (
  itemKey: string,
  isEnabled: boolean
): Promise<MenuItem | null> => {
  const { data, error } = await supabase
    .from("menu_items")
    .update({ is_enabled: isEnabled, updated_at: new Date().toISOString() }) // Explicitly update updated_at
    .eq("item_key", itemKey)
    .select()
    .single(); // Expecting a single row back

  if (error) {
    console.error(`Error updating menu item ${itemKey}:`, error);
    // Consider more specific error handling based on RLS failures etc.
    throw error;
  }

  return data;
}; 