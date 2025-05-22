-- Create ENUM types for link_type and link_status
CREATE TYPE public.link_type_enum AS ENUM (
    'automatic',
    'manual_system',
    'manual_user_override'
);

CREATE TYPE public.link_status_enum AS ENUM (
    'active',
    'archived',
    'broken_printful_deleted',
    'broken_shopify_deleted',
    'pending_verification'
);

-- Table for linking Shopify orders to Printful orders
CREATE TABLE public.shopify_printful_order_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shopify_order_id BIGINT NOT NULL,
    printful_order_internal_id BIGINT NULL, -- Can be NULL if Printful order is deleted
    link_type public.link_type_enum NOT NULL,
    link_status public.link_status_enum NOT NULL,
    link_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    linked_by_user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_printful_order
        FOREIGN KEY(printful_order_internal_id)
        REFERENCES public.printful_orders(printful_internal_id)
        ON DELETE SET NULL, -- Set to NULL if the linked Printful order is deleted

    CONSTRAINT unique_shopify_printful_pair UNIQUE (shopify_order_id, printful_order_internal_id)
);

-- Optional: Index for frequently queried columns
CREATE INDEX idx_shopify_printful_links_shopify_order_id ON public.shopify_printful_order_links (shopify_order_id);
CREATE INDEX idx_shopify_printful_links_printful_order_id ON public.shopify_printful_order_links (printful_order_internal_id);
CREATE INDEX idx_shopify_printful_links_link_status ON public.shopify_printful_order_links (link_status);

-- Trigger to automatically update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_shopify_printful_order_links_updated_at
BEFORE UPDATE ON public.shopify_printful_order_links
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();