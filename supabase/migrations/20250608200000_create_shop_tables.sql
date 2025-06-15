-- Shop functionality: Collections and Products tables
-- Created: 2024-08-06
-- Purpose: Support Shopify integration for shop section

-- Collections cache table
CREATE TABLE shopify_collections (
  id BIGINT PRIMARY KEY,
  handle TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  products_count INTEGER DEFAULT 0,
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products cache table
CREATE TABLE shopify_products (
  id BIGINT PRIMARY KEY,
  handle TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  vendor TEXT,
  product_type TEXT,
  tags TEXT[],
  status TEXT DEFAULT 'active',
  featured_image_url TEXT,
  price_min DECIMAL(10,2),
  price_max DECIMAL(10,2),
  available BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Collection-Product relationship
CREATE TABLE collection_products (
  collection_id BIGINT REFERENCES shopify_collections(id) ON DELETE CASCADE,
  product_id BIGINT REFERENCES shopify_products(id) ON DELETE CASCADE,
  position INTEGER,
  PRIMARY KEY (collection_id, product_id)
);

-- Enable RLS
ALTER TABLE shopify_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_products ENABLE ROW LEVEL SECURITY;

-- Public read access (shop is public)
CREATE POLICY "Public read access to collections" ON shopify_collections
FOR SELECT USING (true);

CREATE POLICY "Public read access to products" ON shopify_products
FOR SELECT USING (true);

CREATE POLICY "Public read access to collection products" ON collection_products
FOR SELECT USING (true);

-- Admin write access for sync operations
CREATE POLICY "Admin write access to collections" ON shopify_collections
FOR ALL USING (is_admin());

CREATE POLICY "Admin write access to products" ON shopify_products
FOR ALL USING (is_admin());

CREATE POLICY "Admin write access to collection products" ON collection_products
FOR ALL USING (is_admin());

-- Indexes for performance
CREATE INDEX idx_shopify_collections_handle ON shopify_collections(handle);
CREATE INDEX idx_shopify_products_handle ON shopify_products(handle);
CREATE INDEX idx_shopify_products_available ON shopify_products(available) WHERE available = true;
CREATE INDEX idx_collection_products_collection_id ON collection_products(collection_id);
CREATE INDEX idx_collection_products_position ON collection_products(collection_id, position);

-- Add shop menu item
INSERT INTO menu_items (item_key, is_enabled) 
VALUES ('shop', true)
ON CONFLICT (item_key) DO UPDATE SET is_enabled = true;