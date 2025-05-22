CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- Table for storing main Printful order details
CREATE TABLE printful_orders (
    printful_internal_id BIGINT PRIMARY KEY,
    printful_external_id TEXT UNIQUE NOT NULL,
    recipient_name TEXT NOT NULL,
    status TEXT NOT NULL,
    total_amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    shipping_details JSONB NOT NULL,
    printful_created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    printful_updated_at TIMESTAMP WITH TIME ZONE,
    last_synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Table for storing individual line items for each Printful order
CREATE TABLE printful_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_printful_internal_id BIGINT NOT NULL,
    printful_line_item_id BIGINT NOT NULL,
    printful_external_line_item_id TEXT,
    product_name TEXT NOT NULL,
    variant_details JSONB,
    quantity INTEGER NOT NULL,
    item_retail_price NUMERIC(10, 2) NOT NULL,
    item_cost NUMERIC(10,2),
    item_currency VARCHAR(3) NOT NULL,
    sku TEXT,
    printful_product_id BIGINT,
    printful_variant_id BIGINT NOT NULL,
    CONSTRAINT fk_order
        FOREIGN KEY(order_printful_internal_id)
        REFERENCES printful_orders(printful_internal_id)
        ON DELETE CASCADE,
    UNIQUE (order_printful_internal_id, printful_line_item_id)
);

-- Suggested Initial Indexes
CREATE INDEX idx_printful_orders_recipient_name ON printful_orders USING GIN (recipient_name gin_trgm_ops);
CREATE INDEX idx_printful_orders_status ON printful_orders (status);
CREATE INDEX idx_printful_orders_printful_created_at ON printful_orders (printful_created_at DESC);
CREATE INDEX idx_printful_orders_total_amount ON printful_orders (total_amount);
CREATE INDEX idx_printful_orders_last_synced_at ON printful_orders (last_synced_at);
CREATE INDEX idx_printful_orders_printful_updated_at ON printful_orders (printful_updated_at);
CREATE INDEX idx_printful_orders_recipient_email_jsonb ON printful_orders USING GIN ((shipping_details -> 'email'));
CREATE INDEX idx_printful_order_items_order_id ON printful_order_items (order_printful_internal_id);
CREATE INDEX idx_printful_order_items_sku ON printful_order_items (sku);
CREATE INDEX idx_printful_order_items_printful_product_id ON printful_order_items (printful_product_id);
CREATE INDEX idx_printful_order_items_printful_variant_id ON printful_order_items (printful_variant_id);

-- Ensure pgcrypto and pg_trgm extensions are enabled if not already.
-- Supabase typically has them, but good to note.
-- CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;