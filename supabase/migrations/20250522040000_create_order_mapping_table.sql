-- Create enum type for order classifications
CREATE TYPE order_classification AS ENUM ('normal', 'corrective', 'gift');

-- Create order mapping table
CREATE TABLE IF NOT EXISTS order_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    printful_order_id BIGINT NOT NULL REFERENCES printful_orders(printful_internal_id) ON DELETE CASCADE,
    shopify_order_id BIGINT NULL, -- Can be null for corrective/gift orders
    classification order_classification NOT NULL DEFAULT 'normal',
    mapped_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    mapped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure each printful order is only mapped once
    UNIQUE(printful_order_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_order_mappings_printful_id ON order_mappings(printful_order_id);
CREATE INDEX IF NOT EXISTS idx_order_mappings_shopify_id ON order_mappings(shopify_order_id);
CREATE INDEX IF NOT EXISTS idx_order_mappings_classification ON order_mappings(classification);
CREATE INDEX IF NOT EXISTS idx_order_mappings_mapped_by ON order_mappings(mapped_by);

-- Create partial unique index to ensure each shopify order is only mapped once (when not null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_shopify_mapping 
    ON order_mappings(shopify_order_id) 
    WHERE shopify_order_id IS NOT NULL;

-- Add RLS policies
ALTER TABLE order_mappings ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admin full access to order mappings" ON order_mappings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role = 'admin'
        )
    );

-- Users can only view mappings (read-only for non-admins)
CREATE POLICY "Users can view order mappings" ON order_mappings
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_order_mappings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_order_mappings_updated_at
    BEFORE UPDATE ON order_mappings
    FOR EACH ROW
    EXECUTE FUNCTION update_order_mappings_updated_at();

-- Function to get mapping statistics
CREATE OR REPLACE FUNCTION get_order_mapping_stats()
RETURNS TABLE (
    total_printful_orders BIGINT,
    mapped_orders BIGINT,
    unmapped_orders BIGINT,
    normal_orders BIGINT,
    corrective_orders BIGINT,
    gift_orders BIGINT,
    mapping_percentage NUMERIC(5,2)
) AS $$
BEGIN
    RETURN QUERY
    WITH stats AS (
        SELECT 
            (SELECT COUNT(*) FROM printful_orders) as total_printful,
            (SELECT COUNT(*) FROM order_mappings) as total_mapped,
            (SELECT COUNT(*) FROM order_mappings WHERE classification = 'normal') as normal_count,
            (SELECT COUNT(*) FROM order_mappings WHERE classification = 'corrective') as corrective_count,
            (SELECT COUNT(*) FROM order_mappings WHERE classification = 'gift') as gift_count
    )
    SELECT 
        s.total_printful,
        s.total_mapped,
        s.total_printful - s.total_mapped,
        s.normal_count,
        s.corrective_count,
        s.gift_count,
        CASE 
            WHEN s.total_printful > 0 THEN 
                ROUND((s.total_mapped::NUMERIC / s.total_printful::NUMERIC) * 100, 2)
            ELSE 0
        END
    FROM stats s;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;