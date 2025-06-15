-- Add shop menu item if it doesn't exist
INSERT INTO public.menu_items (item_key, is_enabled)
VALUES ('shop', true)
ON CONFLICT (item_key) DO NOTHING;