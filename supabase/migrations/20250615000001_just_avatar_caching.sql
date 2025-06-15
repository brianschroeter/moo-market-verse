-- Add avatar caching columns to youtube_channels table
ALTER TABLE public.youtube_channels
ADD COLUMN IF NOT EXISTS avatar_last_fetched_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS avatar_fetch_error TEXT;

-- Create index for finding channels with stale avatars
CREATE INDEX IF NOT EXISTS idx_youtube_channels_avatar_staleness 
ON public.youtube_channels(avatar_last_fetched_at) 
WHERE avatar_url IS NOT NULL;

-- Comment on new columns
COMMENT ON COLUMN public.youtube_channels.avatar_last_fetched_at IS 'Timestamp when avatar_url was last fetched from YouTube API';
COMMENT ON COLUMN public.youtube_channels.avatar_fetch_error IS 'Last error message if avatar fetch failed';

-- Create a function to check if avatar needs refresh (older than 7 days)
CREATE OR REPLACE FUNCTION public.avatar_needs_refresh(last_fetched TIMESTAMPTZ)
RETURNS BOOLEAN AS $$
BEGIN
    -- If never fetched, needs refresh
    IF last_fetched IS NULL THEN
        RETURN TRUE;
    END IF;
    
    -- If older than 7 days, needs refresh
    RETURN (NOW() - last_fetched) > INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create a view to easily find channels needing avatar refresh
CREATE OR REPLACE VIEW public.youtube_channels_needing_avatar_refresh AS
SELECT 
    id,
    youtube_channel_id,
    channel_name,
    avatar_url,
    avatar_last_fetched_at,
    avatar_fetch_error,
    CASE 
        WHEN avatar_last_fetched_at IS NULL THEN 'Never fetched'
        WHEN avatar_fetch_error IS NOT NULL THEN 'Last fetch failed'
        ELSE 'Stale (> 7 days)'
    END as refresh_reason
FROM public.youtube_channels
WHERE avatar_needs_refresh(avatar_last_fetched_at)
   OR avatar_fetch_error IS NOT NULL
ORDER BY avatar_last_fetched_at ASC NULLS FIRST;

COMMENT ON VIEW public.youtube_channels_needing_avatar_refresh IS 'Channels with stale or missing avatar URLs';