CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY, -- Usually references auth.users(id)
  updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  discord_id TEXT UNIQUE,
  discord_username TEXT,
  discord_avatar TEXT,
  -- Add other columns as needed, e.g., username, full_name, website
  username TEXT,
  CONSTRAINT username_length CHECK (char_length(username) >= 3)
);

-- Optional: Link to auth.users if you have user sign-ups managed by Supabase Auth
-- If you don't have auth.users yet or manage users differently, you might omit this
-- or adjust the foreign key relationship.
-- Ensure auth.users table exists before adding this constraint.
-- For now, this ALTER TABLE is commented out. If auth.users exists and you want to link,
-- you would uncomment this and potentially put it in a separate, later migration,
-- or ensure auth schema migrations run first.
/*
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
*/

-- Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone."
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile."
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id); -- auth.uid() refers to the currently authenticated user

CREATE POLICY "Users can update their own profile."
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete their own profile."
  ON public.profiles FOR DELETE
  USING (auth.uid() = id);

-- Optional: Indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_profiles_discord_id ON public.profiles(discord_id);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- Trigger to automatically update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profiles_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Note: If your Supabase project was created recently, the auth.users table
-- and the auth.uid() function are standard. If it's an older project or
-- has a custom auth setup, these might need adjustment.
-- The policies assume you want users to manage their own profiles.
-- Adjust as per your application's requirements. 