-- Table for storing Shopify order details, synced from Shopify
CREATE TABLE public.shopify_orders (
    id BIGINT PRIMARY KEY, -- Actual Shopify Order ID
    shopify_order_number TEXT NOT NULL UNIQUE, -- Human-readable order number like #1001, GID might be better if available
    order_date TIMESTAMPTZ NOT NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT NULL,
    total_amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    payment_status TEXT NOT NULL, -- e.g., 'paid', 'pending', 'refunded'
    fulfillment_status TEXT NULL, -- e.g., 'fulfilled', 'unfulfilled', 'partial'
    
    -- Optional: Store the full Shopify order payload for auditing or future use
    raw_shopify_data JSONB NULL, 
    
    last_shopify_sync_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- When this record was last synced/updated from Shopify
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX idx_shopify_orders_order_date ON public.shopify_orders (order_date DESC);
CREATE INDEX idx_shopify_orders_customer_email ON public.shopify_orders (customer_email);
CREATE INDEX idx_shopify_orders_payment_status ON public.shopify_orders (payment_status);
CREATE INDEX idx_shopify_orders_fulfillment_status ON public.shopify_orders (fulfillment_status);
CREATE INDEX idx_shopify_orders_last_shopify_sync_at ON public.shopify_orders (last_shopify_sync_at DESC);

-- Trigger to automatically update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_shopify_orders_updated_at
BEFORE UPDATE ON public.shopify_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON COLUMN public.shopify_orders.id IS 'Actual Shopify Order ID. Used as primary key.';
COMMENT ON COLUMN public.shopify_orders.shopify_order_number IS 'Human-readable order number from Shopify (e.g., #1001). Should be unique.';
COMMENT ON COLUMN public.shopify_orders.raw_shopify_data IS 'Full JSON payload from Shopify API for this order, for auditing or detailed views.';
COMMENT ON COLUMN public.shopify_orders.last_shopify_sync_at IS 'Timestamp of the last successful synchronization with Shopify for this order record.';