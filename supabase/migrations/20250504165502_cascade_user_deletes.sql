-- 1. Ensure profiles cascade when auth.users is deleted.
-- Assuming the constraint name follows Supabase defaults (tablename_colname_fkey)
-- You might need to inspect your DB or previous migrations if the name differs.
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_id_fkey, -- Drop the existing constraint if it exists
ADD CONSTRAINT profiles_id_fkey -- Re-add it with ON DELETE CASCADE
  FOREIGN KEY (id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

-- 2. Ensure related tables cascade when profiles is deleted.
ALTER TABLE public.user_roles
DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey,
ADD CONSTRAINT user_roles_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;

ALTER TABLE public.discord_connections
DROP CONSTRAINT IF EXISTS discord_connections_user_id_fkey,
ADD CONSTRAINT discord_connections_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;

ALTER TABLE public.discord_guilds
DROP CONSTRAINT IF EXISTS discord_guilds_user_id_fkey,
ADD CONSTRAINT discord_guilds_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;

ALTER TABLE public.youtube_connections
DROP CONSTRAINT IF EXISTS youtube_connections_user_id_fkey,
ADD CONSTRAINT youtube_connections_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;

-- Also consider support_tickets if user_id references profiles.id
-- Assuming support_tickets.user_id references profiles.id
ALTER TABLE public.support_tickets
DROP CONSTRAINT IF EXISTS support_tickets_user_id_fkey, -- Assuming default name
ADD CONSTRAINT support_tickets_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;

-- Note: Tables like ticket_messages, ticket_attachments, youtube_memberships
-- reference tables that *now* cascade from profiles, so they should be handled correctly.
