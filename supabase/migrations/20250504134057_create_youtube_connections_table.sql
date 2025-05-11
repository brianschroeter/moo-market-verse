CREATE TABLE public.youtube_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- Will add FK to profiles below
    youtube_channel_id TEXT NOT NULL,
    youtube_channel_name TEXT,
    youtube_channel_avatar_url TEXT,
    refresh_token TEXT, -- Should be encrypted in a real application
    access_token TEXT,  -- Should be encrypted and managed carefully (short-lived)
    expires_at TIMESTAMPTZ,
    scopes TEXT[], -- Array of granted scopes, e.g., {'https://www.googleapis.com/auth/youtube.readonly'}
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE (user_id, youtube_channel_id)
);

-- Foreign key to public.profiles
ALTER TABLE public.youtube_connections
  ADD CONSTRAINT youtube_connections_user_id_fkey FOREIGN KEY (user_id)
  REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.youtube_connections ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own YouTube connections."
    ON public.youtube_connections FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Admin policy (requires is_admin function from 20250504124541_create_is_admin_function.sql)
CREATE POLICY "Admins can view all YouTube connections."
    ON public.youtube_connections FOR SELECT
    USING (public.is_admin());

-- Trigger for updated_at (reuses public.handle_updated_at function)
CREATE TRIGGER on_youtube_connections_updated
  BEFORE UPDATE ON public.youtube_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Optional: Indexes
CREATE INDEX IF NOT EXISTS idx_youtube_connections_user_id ON public.youtube_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_youtube_connections_youtube_channel_id ON public.youtube_connections(youtube_channel_id); 