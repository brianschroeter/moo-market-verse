-- Add collection ordering functionality

-- Create collection_order table to manage display order
CREATE TABLE collection_order (
  id BIGSERIAL PRIMARY KEY,
  collection_handle TEXT NOT NULL UNIQUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Add RLS policies
ALTER TABLE collection_order ENABLE ROW LEVEL SECURITY;

-- Public can read visible collection orders
CREATE POLICY "Public can read collection order" ON collection_order
  FOR SELECT USING (is_visible = true);

-- Admins can manage all collection orders
CREATE POLICY "Admins can manage collection order" ON collection_order
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
    OR
    -- Development mode user
    auth.uid()::text = 'dev-user-id'
  );

-- Create index for performance
CREATE INDEX idx_collection_order_display_order ON collection_order(display_order, is_visible);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_collection_order_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER collection_order_updated_at
  BEFORE UPDATE ON collection_order
  FOR EACH ROW
  EXECUTE FUNCTION update_collection_order_updated_at();