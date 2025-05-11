-- supabase/migrations/20250505000001_create_youtube_memberships_table.sql

CREATE TABLE public.youtube_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    youtube_channel_id TEXT NOT NULL, -- The channel they are a member of (e.g., YouTube's channel ID string)
    channel_name TEXT, -- Added this column, expected by unique constraint in 20250505013125
    youtube_connection_id UUID, -- Foreign key to public.youtube_connections table. Expected by 20250505004826
    member_level TEXT, -- e.g., "Tier 1", "VIP"
    started_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ, -- If memberships expire
    joined_at TIMESTAMPTZ, -- This column is expected to exist by migration 20250505003323 so it can be dropped.
    last_checked_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT, -- This column is expected to exist by migration 20250505003323 so it can be dropped.
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE (user_id, youtube_channel_id),
    CONSTRAINT youtube_memberships_youtube_connection_id_fkey FOREIGN KEY (youtube_connection_id) REFERENCES public.youtube_connections(id) ON DELETE SET NULL -- Or ON DELETE CASCADE
);

ALTER TABLE public.youtube_memberships ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own YouTube memberships."
    ON public.youtube_memberships FOR SELECT
    USING (auth.uid() = user_id);

-- Admins can view all memberships
CREATE POLICY "Admins can view all YouTube memberships."
    ON public.youtube_memberships FOR SELECT
    USING (public.is_admin());

-- Inserts/Updates/Deletes for memberships might be handled by backend processes syncing with YouTube API,
-- or specific admin interfaces, rather than direct user actions.
-- For now, let's assume admins manage these records if direct DB manipulation is needed.
CREATE POLICY "Admins can manage YouTube membership records."
    ON public.youtube_memberships FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Trigger for updated_at (reuses public.handle_updated_at function)
CREATE TRIGGER on_youtube_memberships_updated
  BEFORE UPDATE ON public.youtube_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_youtube_memberships_user_id ON public.youtube_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_youtube_memberships_channel_id ON public.youtube_memberships(youtube_channel_id); 