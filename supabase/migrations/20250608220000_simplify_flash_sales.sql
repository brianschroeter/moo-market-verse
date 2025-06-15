-- Simplify flash_sales table by removing date requirements
-- Make start_date and end_date optional, remove from policies

-- Drop existing policies
DROP POLICY IF EXISTS "Public can read active flash sales" ON flash_sales;
DROP POLICY IF EXISTS "Admins can manage flash sales" ON flash_sales;

-- Drop existing index
DROP INDEX IF EXISTS idx_flash_sales_active_dates;

-- Alter table to make dates optional
ALTER TABLE flash_sales 
  ALTER COLUMN start_date DROP NOT NULL,
  ALTER COLUMN end_date DROP NOT NULL;

-- Create new simplified policies
-- Public can read active flash sales (no date restriction)
CREATE POLICY "Public can read active flash sales" ON flash_sales
  FOR SELECT USING (is_active = true);

-- Admins can manage all flash sales
CREATE POLICY "Admins can manage flash sales" ON flash_sales
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Create new simplified index
CREATE INDEX idx_flash_sales_active_priority ON flash_sales(is_active, priority);