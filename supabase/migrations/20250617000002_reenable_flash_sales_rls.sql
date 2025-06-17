-- Re-enable RLS for flash_sales table (was disabled for debugging)
ALTER TABLE flash_sales ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public can read active flash sales" ON flash_sales;
DROP POLICY IF EXISTS "Admins can manage flash sales" ON flash_sales;

-- Recreate the policies
CREATE POLICY "Public can read active flash sales" ON flash_sales
  FOR SELECT 
  USING (is_active = true);

CREATE POLICY "Admins can manage flash sales" ON flash_sales
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
    OR auth.uid()::text = '00000000-0000-0000-0000-000000000001'
  );

-- Add comment explaining the change
COMMENT ON TABLE flash_sales IS 'Flash sales for special promotions. RLS re-enabled after debugging phase.';