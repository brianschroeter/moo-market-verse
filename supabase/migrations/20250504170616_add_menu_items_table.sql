-- Create the menu_items table
CREATE TABLE public.menu_items (
    item_key TEXT PRIMARY KEY NOT NULL,  -- e.g., 'schedule', 'leaderboard', 'profile'
    is_enabled BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

-- Policies for menu_items:
-- Allow public read access
CREATE POLICY "Allow public read access" ON public.menu_items
    FOR SELECT USING (true);

-- Allow admin users to manage menu items
CREATE POLICY "Allow admin write access" ON public.menu_items
    FOR ALL USING (public.has_role(auth.uid(), 'admin')) -- Assuming you have a has_role function like in database.types.ts
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Optional: Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on row update
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.menu_items
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Optional: Seed initial menu items (adjust keys as needed for your app)
INSERT INTO public.menu_items (item_key) VALUES
    ('profile'),
    ('schedule'),
    ('leaderboard'),
    ('support'),
    ('admin'); -- Add other known menu item keys
