-- Fix flash sales policies to support development mode

-- Drop existing admin policy
DROP POLICY IF EXISTS "Admins can manage flash sales" ON flash_sales;

-- Create new policy that supports both admin users and dev mode
CREATE POLICY "Admins can manage flash sales" ON flash_sales
  FOR ALL USING (
    -- Admin users
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
    OR
    -- Development mode user
    auth.uid()::text = 'dev-user-id'
  );