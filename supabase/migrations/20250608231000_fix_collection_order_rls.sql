-- Fix RLS policies for collection_order table

-- Drop existing policy
DROP POLICY IF EXISTS "Admins can manage collection order" ON collection_order;

-- Create separate policies for each operation
-- Admins can view all collection orders
CREATE POLICY "Admins can view all collection orders" ON collection_order
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
    OR
    -- Development mode user
    auth.uid()::text = 'dev-user-id'
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
    -- Development mode user
    auth.uid()::text = 'dev-user-id'
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
    -- Development mode user
    auth.uid()::text = 'dev-user-id'
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
    -- Development mode user
    auth.uid()::text = 'dev-user-id'
  );