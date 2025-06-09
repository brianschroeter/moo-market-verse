-- Fix RLS policies for collection_order table to match development user ID

-- Drop existing policies
DROP POLICY IF EXISTS "Public can read collection order" ON collection_order;
DROP POLICY IF EXISTS "Admins can view all collection orders" ON collection_order;
DROP POLICY IF EXISTS "Admins can insert collection orders" ON collection_order;
DROP POLICY IF EXISTS "Admins can update collection orders" ON collection_order;
DROP POLICY IF EXISTS "Admins can delete collection orders" ON collection_order;

-- Recreate policies with correct dev user ID

-- Public can read visible collection orders
CREATE POLICY "Public can read collection order" ON collection_order
  FOR SELECT USING (is_visible = true);

-- Admins can view all collection orders
CREATE POLICY "Admins can view all collection orders" ON collection_order
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
    OR
    -- Development mode user with correct ID
    auth.uid()::text = '00000000-0000-0000-0000-000000000001'
  );

-- Admins can insert collection orders
CREATE POLICY "Admins can insert collection orders" ON collection_order
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
    OR
    -- Development mode user with correct ID
    auth.uid()::text = '00000000-0000-0000-0000-000000000001'
  );

-- Admins can update collection orders
CREATE POLICY "Admins can update collection orders" ON collection_order
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
    OR
    -- Development mode user with correct ID
    auth.uid()::text = '00000000-0000-0000-0000-000000000001'
  );

-- Admins can delete collection orders
CREATE POLICY "Admins can delete collection orders" ON collection_order
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
    OR
    -- Development mode user with correct ID
    auth.uid()::text = '00000000-0000-0000-0000-000000000001'
  );