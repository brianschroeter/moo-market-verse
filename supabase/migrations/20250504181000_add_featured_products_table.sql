
-- Create the featured_products table
CREATE TABLE IF NOT EXISTS public.featured_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT NOT NULL,
  product_url TEXT NOT NULL,
  featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create trigger to update updated_at on change
CREATE TRIGGER update_featured_products_updated_at
BEFORE UPDATE ON public.featured_products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS on the table
ALTER TABLE public.featured_products ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow anonymous users to view featured products"
ON public.featured_products
FOR SELECT
USING (true);

CREATE POLICY "Allow admins to manage featured products"
ON public.featured_products
USING (public.is_admin());
