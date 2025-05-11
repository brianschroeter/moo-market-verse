CREATE TABLE public.discord_guilds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- Will add FK to profiles below
    guild_id TEXT NOT NULL,
    guild_name TEXT,
    owner_id TEXT, -- Discord user ID of the guild owner
    permissions TEXT, -- User's permissions in that guild
    icon_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, guild_id)
);

-- Add foreign key constraint to public.profiles
-- This assumes public.profiles table and its id column exist.
ALTER TABLE public.discord_guilds
  ADD CONSTRAINT discord_guilds_user_id_fkey FOREIGN KEY (user_id)
  REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Enable Row Level Security
-- Note: The actual RLS policies are in a later migration (20250504043254_add_discord_guilds_write_rls.sql)
-- So we just enable RLS here. The later migration will fail if RLS is not enabled first.
ALTER TABLE public.discord_guilds ENABLE ROW LEVEL SECURITY;

-- Optional: Indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_discord_guilds_user_id ON public.discord_guilds(user_id);
CREATE INDEX IF NOT EXISTS idx_discord_guilds_guild_id ON public.discord_guilds(guild_id);

-- Trigger to automatically update 'updated_at' timestamp
-- This reuses the function created in the profiles table migration (20250504000000_create_profiles_table.sql)
-- Ensure that migration has run and the function public.handle_updated_at() exists.
CREATE TRIGGER on_discord_guilds_updated
  BEFORE UPDATE ON public.discord_guilds
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Comment about RLS policies:
-- The migration 20250504043254_add_discord_guilds_write_rls.sql
-- is responsible for defining the specific RLS policies for this table.
-- This current migration (20250504024134_create_discord_guilds_table.sql)
-- only creates the table and enables RLS. This separation is fine,
-- as long as this creation script runs before the policy definition script. 