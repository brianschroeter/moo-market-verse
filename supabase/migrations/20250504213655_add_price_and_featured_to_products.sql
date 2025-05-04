-- Add a numeric column for the product price. Consider precision and scale if needed.
ALTER TABLE featured_products
ADD COLUMN price NUMERIC;

-- Add a boolean column to mark products as featured, defaulting to false.
ALTER TABLE featured_products
ADD COLUMN is_featured BOOLEAN DEFAULT FALSE;
