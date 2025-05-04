export interface FeaturedContent {
  id: string;
  name: string;
  description: string;
  image_url: string;
  link: string;
  featured: boolean;
  price?: number;
  created_at: string;
  updated_at: string;
}

export interface FeaturedProduct extends Omit<FeaturedContent, 'link'> {
  product_url: string;
  featured: boolean;
  price?: number;
  link?: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  is_important: boolean;
  active: boolean;
}
