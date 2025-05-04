
import { supabase } from "@/integrations/supabase/client";
import { FeaturedContent, FeaturedProduct, Announcement } from "./types/featuredContent-types";

export const getFeaturedContent = async (): Promise<FeaturedContent[]> => {
  const { data, error } = await supabase
    .from('featured_products')
    .select('*')
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error("Error fetching featured content:", error);
    throw error;
  }
  
  return data.map(product => ({
    id: product.id,
    name: product.name,
    description: product.description,
    image_url: product.image_url,
    link: product.product_url,
    created_at: product.created_at,
    updated_at: product.updated_at
  })) || [];
};

export const fetchActiveProducts = async (): Promise<FeaturedProduct[]> => {
  const { data, error } = await supabase
    .from('featured_products')
    .select('*')
    .eq('featured', true)
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error("Error fetching featured products:", error);
    throw error;
  }
  
  // Transform the data to match the FeaturedProduct interface
  return data.map(product => ({
    id: product.id,
    name: product.name,
    description: product.description,
    image_url: product.image_url,
    product_url: product.product_url,
    featured: product.featured,
    created_at: product.created_at,
    updated_at: product.updated_at
  })) || [];
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
}

export const createFeaturedContent = async (content: CreateFeaturedContentParams): Promise<FeaturedContent> => {
  const { data, error } = await supabase
    .from('featured_products')
    .insert({
      name: content.name,
      description: content.description,
      image_url: content.image_url,
      product_url: content.link
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
    created_at: data.created_at,
    updated_at: data.updated_at
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
