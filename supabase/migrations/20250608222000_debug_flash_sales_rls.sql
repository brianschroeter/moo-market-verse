-- Temporarily disable RLS for flash_sales to debug the issue

-- Drop existing policies
DROP POLICY IF EXISTS "Public can read active flash sales" ON flash_sales;
DROP POLICY IF EXISTS "Admins can manage flash sales" ON flash_sales;

-- Temporarily disable RLS for debugging
ALTER TABLE flash_sales DISABLE ROW LEVEL SECURITY;

-- We'll re-enable it after confirming it works