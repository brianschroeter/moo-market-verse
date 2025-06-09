-- Create flash_sales table for special announcements and flash sales
CREATE TABLE flash_sales (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  discount_text TEXT, -- e.g., "50% OFF", "BOGO", "Free Shipping"
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 1, -- Higher priority shows first
  banner_color TEXT DEFAULT '#ef4444', -- Hex color for banner
  text_color TEXT DEFAULT '#ffffff', -- Hex color for text
  action_url TEXT, -- Optional URL for CTA button
  action_text TEXT DEFAULT 'Shop Now', -- Text for CTA button
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Add RLS policies
ALTER TABLE flash_sales ENABLE ROW LEVEL SECURITY;

-- Public can read active flash sales
CREATE POLICY "Public can read active flash sales" ON flash_sales
  FOR SELECT USING (
    is_active = true 
    AND start_date <= now() 
    AND end_date >= now()
  );

-- Admins can manage all flash sales
CREATE POLICY "Admins can manage flash sales" ON flash_sales
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Create index for performance
CREATE INDEX idx_flash_sales_active_dates ON flash_sales(is_active, start_date, end_date, priority);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_flash_sales_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER flash_sales_updated_at
  BEFORE UPDATE ON flash_sales
  FOR EACH ROW
  EXECUTE FUNCTION update_flash_sales_updated_at();