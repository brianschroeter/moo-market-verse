-- Ensure all default menu items exist in the database
-- This prevents issues where missing items default to being shown

-- Insert all default menu items if they don't exist
INSERT INTO public.menu_items (item_key, is_enabled) VALUES
    ('home', true),
    ('shop', true),
    ('schedule', true),
    ('leaderboard', true),
    ('profile', true),
    ('support', true)
ON CONFLICT (item_key) DO NOTHING;

-- Add a comment explaining the behavior
COMMENT ON COLUMN public.menu_items.is_enabled IS 'When false, the menu item will not appear in the navigation bar for regular users. Admins can always access all pages regardless of this setting.';