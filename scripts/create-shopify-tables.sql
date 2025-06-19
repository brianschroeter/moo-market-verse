-- This script creates the necessary tables for Shopify product sync
-- Run this in your Supabase SQL Editor if the tables don't exist

-- Create shopify_products table
CREATE TABLE IF NOT EXISTS public.shopify_products (
    id TEXT PRIMARY KEY,
    handle TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    vendor TEXT,
    product_type TEXT,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    image_url TEXT,
    tags TEXT[] DEFAULT '{}',
    status TEXT DEFAULT 'active',
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create shopify_collections table
CREATE TABLE IF NOT EXISTS public.shopify_collections (
    id TEXT PRIMARY KEY,
    handle TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    sort_order TEXT DEFAULT 'manual',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create collection_products junction table
CREATE TABLE IF NOT EXISTS public.collection_products (
    collection_id TEXT REFERENCES public.shopify_collections(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES public.shopify_products(id) ON DELETE CASCADE,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (collection_id, product_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_shopify_products_handle ON public.shopify_products(handle);
CREATE INDEX IF NOT EXISTS idx_shopify_products_status ON public.shopify_products(status);
CREATE INDEX IF NOT EXISTS idx_shopify_products_vendor ON public.shopify_products(vendor);
CREATE INDEX IF NOT EXISTS idx_shopify_products_product_type ON public.shopify_products(product_type);
CREATE INDEX IF NOT EXISTS idx_shopify_collections_handle ON public.shopify_collections(handle);
CREATE INDEX IF NOT EXISTS idx_collection_products_product_id ON public.collection_products(product_id);

-- Enable Row Level Security
ALTER TABLE public.shopify_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopify_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_products ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for shopify_products
-- Everyone can read products
CREATE POLICY "Enable read access for all users" ON public.shopify_products
    FOR SELECT USING (true);

-- Only admins can insert/update/delete products
CREATE POLICY "Enable insert for admin users only" ON public.shopify_products
    FOR INSERT WITH CHECK (auth.uid() IN (
        SELECT user_id FROM public.user_roles WHERE role = 'admin'
    ));

CREATE POLICY "Enable update for admin users only" ON public.shopify_products
    FOR UPDATE USING (auth.uid() IN (
        SELECT user_id FROM public.user_roles WHERE role = 'admin'
    ));

CREATE POLICY "Enable delete for admin users only" ON public.shopify_products
    FOR DELETE USING (auth.uid() IN (
        SELECT user_id FROM public.user_roles WHERE role = 'admin'
    ));

-- Create RLS policies for shopify_collections
-- Everyone can read collections
CREATE POLICY "Enable read access for all users" ON public.shopify_collections
    FOR SELECT USING (true);

-- Only admins can insert/update/delete collections
CREATE POLICY "Enable insert for admin users only" ON public.shopify_collections
    FOR INSERT WITH CHECK (auth.uid() IN (
        SELECT user_id FROM public.user_roles WHERE role = 'admin'
    ));

CREATE POLICY "Enable update for admin users only" ON public.shopify_collections
    FOR UPDATE USING (auth.uid() IN (
        SELECT user_id FROM public.user_roles WHERE role = 'admin'
    ));

CREATE POLICY "Enable delete for admin users only" ON public.shopify_collections
    FOR DELETE USING (auth.uid() IN (
        SELECT user_id FROM public.user_roles WHERE role = 'admin'
    ));

-- Create RLS policies for collection_products
-- Everyone can read collection_products
CREATE POLICY "Enable read access for all users" ON public.collection_products
    FOR SELECT USING (true);

-- Only admins can insert/update/delete collection_products
CREATE POLICY "Enable insert for admin users only" ON public.collection_products
    FOR INSERT WITH CHECK (auth.uid() IN (
        SELECT user_id FROM public.user_roles WHERE role = 'admin'
    ));

CREATE POLICY "Enable update for admin users only" ON public.collection_products
    FOR UPDATE USING (auth.uid() IN (
        SELECT user_id FROM public.user_roles WHERE role = 'admin'
    ));

CREATE POLICY "Enable delete for admin users only" ON public.collection_products
    FOR DELETE USING (auth.uid() IN (
        SELECT user_id FROM public.user_roles WHERE role = 'admin'
    ));

-- Verify tables were created
SELECT 'Tables created successfully!' as message
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'shopify_products')
  AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'shopify_collections')
  AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'collection_products');