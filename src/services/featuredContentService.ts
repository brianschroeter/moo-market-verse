import { supabase } from "@/integrations/supabase/client";
import { FeaturedContent, FeaturedProduct, Announcement } from "./types/featuredContent-types";
import { PostgrestError } from '@supabase/supabase-js';

export const getFeaturedContent = async (): Promise<FeaturedContent[]> => {
  const { data, error } = await supabase
    .from('featured_products')
    .select('*')
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error("Error fetching featured content:", error);
    throw error;
  }
  
  if (!data) {
    return [];
  }
  
  return data.map((product: any): FeaturedContent => ({
    id: product.id,
    name: product.name,
    description: product.description,
    image_url: product.image_url,
    link: product.product_url,
    featured: product.featured ?? false,
    price: product.price,
    created_at: product.created_at,
    updated_at: product.updated_at
  }));
};

export const fetchActiveProducts = async (): Promise<FeaturedProduct[]> => {
  const { data, error } = await supabase
    .from('featured_products')
    .select('id, name, description, image_url, product_url, featured, price, created_at, updated_at')
    .eq('featured', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching featured products:", error);
    throw error;
  }

  if (!data) {
    return [];
  }

  return data.map((product: any): FeaturedProduct => ({
    id: product.id,
    name: product.name,
    description: product.description,
    image_url: product.image_url,
    product_url: product.product_url,
    link: product.product_url,
    featured: product.featured,
    price: product.price ?? undefined,
    created_at: product.created_at,
    updated_at: product.updated_at
  }));
};

export const fetchActiveAnnouncements = async (): Promise<Announcement[]> => {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .eq('active', true)
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error("Error fetching announcements:", error);
    throw error;
  }
  
  return data || [];
};

export interface CreateFeaturedContentParams {
  name: string;
  description: string;
  image_url: string;
  link: string;
  featured?: boolean;
  price?: number;
}

export const createFeaturedContent = async (content: CreateFeaturedContentParams): Promise<FeaturedContent> => {
  const { data, error } = await supabase
    .from('featured_products')
    .insert({
      name: content.name,
      description: content.description,
      image_url: content.image_url,
      product_url: content.link,
      featured: content.featured ?? false,
      price: content.price
    })
    .select()
    .single();
    
  if (error) {
    console.error("Error creating featured content:", error);
    throw error;
  }
  
  return {
    id: data.id,
    name: data.name,
    description: data.description,
    image_url: data.image_url,
    link: data.product_url,
    featured: data.featured,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
};

export interface UpdateFeaturedContentParams {
  id: string;
  name?: string;
  description?: string;
  image_url?: string;
  link?: string;
  featured?: boolean;
  price?: number;
}

export const updateFeaturedContent = async (content: UpdateFeaturedContentParams): Promise<FeaturedContent> => {
  const { id, ...updateData } = content;
  
  const dbUpdateData: { [key: string]: any } = { ...updateData };
  if (updateData.link !== undefined) {
      dbUpdateData.product_url = updateData.link;
      delete dbUpdateData.link;
  }
  if (updateData.price !== undefined) {
      dbUpdateData.price = updateData.price;
  }

  const { data, error } = await supabase
    .from('featured_products')
    .update(dbUpdateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error("Error updating featured content:", error);
    throw error;
  }

  return {
    id: data.id,
    name: data.name,
    description: data.description,
    image_url: data.image_url,
    link: data.product_url,
    featured: data.featured,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
};

export const deleteFeaturedContent = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('featured_products')
    .delete()
    .eq('id', id);
    
  if (error) {
    console.error("Error deleting featured content:", error);
    throw error;
  }
};

export const createAnnouncement = async (data: Omit<Announcement, 'id' | 'created_at' | 'updated_at'>): Promise<Announcement> => {
  const { data: result, error } = await supabase
    .from('announcements')
    .insert(data)
    .select()
    .single();
    
  if (error) {
    console.error("Error creating announcement:", error);
    throw error;
  }
  
  return result;
};

export const updateFeaturedProductStatus = async (id: string, featured: boolean): Promise<void> => {
  const { error } = await supabase
    .from('featured_products')
    .update({ featured })
    .eq('id', id);
    
  if (error) {
    console.error("Error updating product featured status:", error);
    throw error;
  }
};

export const getAnnouncements = async (): Promise<Announcement[]> => {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error("Error fetching all announcements:", error);
    throw error;
  }
  
  return data || [];
};

export interface UpdateAnnouncementParams extends Partial<Omit<Announcement, 'id' | 'created_at' | 'updated_at'>> {
  id: string;
}

export const updateAnnouncement = async (params: UpdateAnnouncementParams): Promise<Announcement> => {
  const { id, ...updateData } = params;
  
  const { data, error } = await supabase
    .from('announcements')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();
    
  if (error) {
    console.error("Error updating announcement:", error);
    throw error;
  }
  
  return data;
};

export const deleteAnnouncement = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('announcements')
    .delete()
    .eq('id', id);
    
  if (error) {
    console.error("Error deleting announcement:", error);
    throw error;
  }
};
