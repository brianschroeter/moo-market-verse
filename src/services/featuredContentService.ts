
import { supabase } from "@/integrations/supabase/client";

export interface FeaturedProduct {
  id: string;
  name: string;
  description: string;
  image_url: string;
  product_url: string;
  featured: boolean;
  created_at: string;
  updated_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  is_important: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export const fetchFeaturedProducts = async (): Promise<FeaturedProduct[]> => {
  try {
    // Use the generic typed version of from to specify the return type
    const { data, error } = await supabase
      .from('featured_products')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as FeaturedProduct[] || [];
  } catch (error) {
    console.error("Error fetching featured products:", error);
    throw error;
  }
};

export const fetchActiveProducts = async (): Promise<FeaturedProduct[]> => {
  try {
    const { data, error } = await supabase
      .from('featured_products')
      .select('*')
      .eq('featured', true)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as FeaturedProduct[] || [];
  } catch (error) {
    console.error("Error fetching active products:", error);
    throw error;
  }
};

export const createProduct = async (product: Omit<FeaturedProduct, 'id' | 'created_at' | 'updated_at'>): Promise<FeaturedProduct> => {
  try {
    const { data, error } = await supabase
      .from('featured_products')
      .insert({
        name: product.name,
        description: product.description,
        image_url: product.image_url,
        product_url: product.product_url,
        featured: product.featured
      })
      .select()
      .single();
    
    if (error) throw error;
    return data as FeaturedProduct;
  } catch (error) {
    console.error("Error creating product:", error);
    throw error;
  }
};

export const updateProduct = async (id: string, product: Partial<FeaturedProduct>): Promise<void> => {
  try {
    const { error } = await supabase
      .from('featured_products')
      .update({
        ...product,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
    
    if (error) throw error;
  } catch (error) {
    console.error("Error updating product:", error);
    throw error;
  }
};

export const toggleProductFeatured = async (id: string, featured: boolean): Promise<void> => {
  try {
    const { error } = await supabase
      .from('featured_products')
      .update({
        featured,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
    
    if (error) throw error;
  } catch (error) {
    console.error("Error toggling product featured status:", error);
    throw error;
  }
};

export const fetchAnnouncements = async (): Promise<Announcement[]> => {
  try {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as Announcement[] || [];
  } catch (error) {
    console.error("Error fetching announcements:", error);
    throw error;
  }
};

export const fetchActiveAnnouncements = async (): Promise<Announcement[]> => {
  try {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('active', true)
      .order('is_important', { ascending: false })
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as Announcement[] || [];
  } catch (error) {
    console.error("Error fetching active announcements:", error);
    throw error;
  }
};

export const createAnnouncement = async (announcement: Omit<Announcement, 'id' | 'created_at' | 'updated_at'>): Promise<Announcement> => {
  try {
    const { data, error } = await supabase
      .from('announcements')
      .insert({
        title: announcement.title,
        content: announcement.content,
        is_important: announcement.is_important,
        active: announcement.active
      })
      .select()
      .single();
    
    if (error) throw error;
    return data as Announcement;
  } catch (error) {
    console.error("Error creating announcement:", error);
    throw error;
  }
};

export const updateAnnouncement = async (id: string, announcement: Partial<Announcement>): Promise<void> => {
  try {
    const { error } = await supabase
      .from('announcements')
      .update({
        ...announcement,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
    
    if (error) throw error;
  } catch (error) {
    console.error("Error updating announcement:", error);
    throw error;
  }
};

export const toggleAnnouncementActive = async (id: string, active: boolean): Promise<void> => {
  try {
    const { error } = await supabase
      .from('announcements')
      .update({
        active,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
    
    if (error) throw error;
  } catch (error) {
    console.error("Error toggling announcement active status:", error);
    throw error;
  }
};
