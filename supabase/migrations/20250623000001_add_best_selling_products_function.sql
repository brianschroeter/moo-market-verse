-- Create RPC function to get best selling products based on actual sales data
CREATE OR REPLACE FUNCTION get_best_selling_products(limit_count INT DEFAULT 6)
RETURNS TABLE (
  id TEXT,
  title TEXT,
  handle TEXT,
  description TEXT,
  published_at TIMESTAMPTZ,
  images JSON,
  price_range JSON,
  tags TEXT[],
  vendor TEXT,
  product_type TEXT,
  seo JSON,
  total_sold INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH product_sales AS (
    -- Extract product sales data from Shopify orders
    SELECT 
      line_item->>'product_id' AS product_id,
      line_item->>'title' AS product_title,
      (line_item->>'quantity')::INT AS quantity,
      line_item->>'vendor' AS vendor
    FROM 
      shopify_orders so,
      jsonb_array_elements(so.raw_shopify_data->'line_items') AS line_item
    WHERE 
      so.raw_shopify_data IS NOT NULL
      AND so.raw_shopify_data->'line_items' IS NOT NULL
      AND line_item->>'product_id' IS NOT NULL
  ),
  aggregated_sales AS (
    -- Aggregate sales by product
    SELECT 
      product_id,
      MAX(product_title) AS product_title,
      MAX(vendor) AS vendor,
      SUM(quantity) AS total_quantity_sold
    FROM 
      product_sales
    GROUP BY 
      product_id
    ORDER BY 
      total_quantity_sold DESC
    LIMIT limit_count * 2  -- Get extra to account for products that might not be in database
  )
  -- Join with products table to get full product details
  SELECT 
    p.id,
    p.title,
    p.handle,
    p.description,
    p.published_at,
    p.images,
    p.price_range,
    p.tags,
    p.vendor,
    p.product_type,
    p.seo,
    COALESCE(a.total_quantity_sold, 0)::INT AS total_sold
  FROM 
    shopify_products p
  INNER JOIN 
    aggregated_sales a ON p.id = a.product_id
  WHERE 
    p.published_at IS NOT NULL
    AND p.status = 'active'
  ORDER BY 
    a.total_quantity_sold DESC
  LIMIT limit_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_best_selling_products(INT) TO authenticated;

-- Add a comment to the function
COMMENT ON FUNCTION get_best_selling_products(INT) IS 'Get best selling products based on actual sales data from Shopify orders';