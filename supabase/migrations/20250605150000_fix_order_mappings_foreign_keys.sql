-- Fix missing foreign key constraint for shopify_order_id in order_mappings table
-- This constraint was missing which caused relationship queries to fail

-- Add foreign key constraint for shopify_order_id
ALTER TABLE order_mappings 
ADD CONSTRAINT fk_order_mappings_shopify_order 
FOREIGN KEY (shopify_order_id) 
REFERENCES shopify_orders(id) 
ON DELETE SET NULL;

-- Add comment to clarify the relationship
COMMENT ON COLUMN order_mappings.shopify_order_id IS 'Foreign key to shopify_orders.id. Can be null for corrective/gift orders that do not correspond to actual Shopify orders.';