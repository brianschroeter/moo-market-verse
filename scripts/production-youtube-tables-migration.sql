-- Complete migration for YouTube schedule tables in production
-- Run this in the Supabase SQL Editor

-- First check if tables already exist
DO $$ 
BEGIN
    -- Check if youtube_channels exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'youtube_channels') THEN
        -- Table to store configured YouTube channels
        CREATE TABLE public.youtube_channels (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            youtube_channel_id TEXT NOT NULL UNIQUE,
            channel_name TEXT,
            custom_display_name TEXT,
            avatar_url TEXT,
            created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
            updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
        );

        COMMENT ON TABLE public.youtube_channels IS 'Stores configured YouTube channels for the schedule.';
        COMMENT ON COLUMN public.youtube_channels.youtube_channel_id IS 'YouTube''s unique channel ID (e.g., UCxxxxxxxxxxxxxxx)';
        COMMENT ON COLUMN public.youtube_channels.avatar_url IS 'High-resolution avatar image URL from YouTube.';
    END IF;

    -- Check if schedule_slots exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'schedule_slots') THEN
        -- Table to define schedule slots
        CREATE TABLE public.schedule_slots (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            youtube_channel_id UUID NOT NULL REFERENCES public.youtube_channels(id) ON DELETE CASCADE,
            day_of_week SMALLINT[], -- Array for Mon-Fri patterns
            default_start_time_utc TIME,
            specific_date DATE,
            is_recurring BOOLEAN DEFAULT FALSE NOT NULL,
            fallback_title TEXT,
            notes TEXT,
            created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
            updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
        );

        COMMENT ON TABLE public.schedule_slots IS 'Defines the structure of the daily/weekly schedule.';
        COMMENT ON COLUMN public.schedule_slots.day_of_week IS 'Array of days (0=Sunday, 1=Monday, ..., 6=Saturday) for recurring slots.';
    END IF;

    -- Check if live_streams exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'live_streams') THEN
        -- Table to cache data about YouTube live streams
        CREATE TABLE public.live_streams (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            video_id TEXT NOT NULL UNIQUE,
            youtube_channel_id UUID NOT NULL REFERENCES public.youtube_channels(id) ON DELETE CASCADE,
            title TEXT,
            thumbnail_url TEXT,
            stream_url TEXT,
            scheduled_start_time_utc TIMESTAMPTZ,
            actual_start_time_utc TIMESTAMPTZ,
            actual_end_time_utc TIMESTAMPTZ,
            status TEXT,
            description TEXT,
            view_count INTEGER,
            duration_minutes INTEGER,
            privacy_status TEXT DEFAULT 'public',
            fetched_at TIMESTAMPTZ DEFAULT NOW(),
            scheduled_vs_actual_diff INTERVAL,
            matched_slot_id UUID REFERENCES public.schedule_slots(id),
            last_checked_at TIMESTAMPTZ DEFAULT now() NOT NULL,
            created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
            updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
        );

        COMMENT ON TABLE public.live_streams IS 'Caches data about YouTube live streams pulled via API.';
        COMMENT ON COLUMN public.live_streams.video_id IS 'Unique YouTube video ID.';
        COMMENT ON COLUMN public.live_streams.status IS 'Status of the stream: upcoming, live, completed.';
    END IF;

    -- Check if youtube_api_usage exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'youtube_api_usage') THEN
        CREATE TABLE public.youtube_api_usage (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            endpoint TEXT NOT NULL,
            units_used INTEGER NOT NULL,
            request_timestamp TIMESTAMPTZ DEFAULT NOW(),
            channel_ids TEXT[],
            response_cached BOOLEAN DEFAULT FALSE,
            quota_exceeded BOOLEAN DEFAULT FALSE,
            error_message TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );

        COMMENT ON TABLE public.youtube_api_usage IS 'Tracks YouTube API usage for quota management';
    END IF;

    -- Check if youtube_api_cache exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'youtube_api_cache') THEN
        CREATE TABLE public.youtube_api_cache (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            cache_key TEXT NOT NULL UNIQUE,
            endpoint TEXT NOT NULL,
            response_data JSONB NOT NULL,
            fetched_at TIMESTAMPTZ DEFAULT NOW(),
            expires_at TIMESTAMPTZ NOT NULL,
            channel_id TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );

        COMMENT ON TABLE public.youtube_api_cache IS 'Caches YouTube API responses to minimize quota usage';
    END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_schedule_slots_channel_id ON public.schedule_slots(youtube_channel_id);
CREATE INDEX IF NOT EXISTS idx_schedule_slots_specific_date ON public.schedule_slots(specific_date);
CREATE INDEX IF NOT EXISTS idx_schedule_slots_start_time ON public.schedule_slots(default_start_time_utc);
CREATE INDEX IF NOT EXISTS idx_schedule_slots_day_of_week_gin ON public.schedule_slots USING gin(day_of_week);
CREATE INDEX IF NOT EXISTS idx_schedule_slots_recurring ON public.schedule_slots(is_recurring);

CREATE INDEX IF NOT EXISTS idx_live_streams_channel_id ON public.live_streams(youtube_channel_id);
CREATE INDEX IF NOT EXISTS idx_live_streams_scheduled_start ON public.live_streams(scheduled_start_time_utc);
CREATE INDEX IF NOT EXISTS idx_live_streams_status ON public.live_streams(status);
CREATE INDEX IF NOT EXISTS idx_live_streams_fetched_at ON public.live_streams(fetched_at);
CREATE INDEX IF NOT EXISTS idx_live_streams_matched_slot ON public.live_streams(matched_slot_id);
CREATE INDEX IF NOT EXISTS idx_live_streams_channel_scheduled ON public.live_streams(youtube_channel_id, scheduled_start_time_utc);

CREATE INDEX IF NOT EXISTS idx_youtube_api_usage_timestamp ON public.youtube_api_usage(request_timestamp);
CREATE INDEX IF NOT EXISTS idx_youtube_api_usage_endpoint ON public.youtube_api_usage(endpoint);
CREATE INDEX IF NOT EXISTS idx_youtube_api_usage_quota ON public.youtube_api_usage(quota_exceeded, request_timestamp);

CREATE INDEX IF NOT EXISTS idx_youtube_api_cache_key ON public.youtube_api_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_youtube_api_cache_expires ON public.youtube_api_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_youtube_api_cache_channel ON public.youtube_api_cache(channel_id, endpoint);

-- Create or replace the update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handle_youtube_channels_updated_at') THEN
        CREATE TRIGGER handle_youtube_channels_updated_at 
        BEFORE UPDATE ON public.youtube_channels 
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handle_schedule_slots_updated_at') THEN
        CREATE TRIGGER handle_schedule_slots_updated_at 
        BEFORE UPDATE ON public.schedule_slots 
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handle_live_streams_updated_at') THEN
        CREATE TRIGGER handle_live_streams_updated_at 
        BEFORE UPDATE ON public.live_streams 
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;

-- Enable RLS
ALTER TABLE public.youtube_api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.youtube_api_cache ENABLE ROW LEVEL SECURITY;

-- Create RLS policies if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'youtube_api_usage' AND policyname = 'admin_all_youtube_api_usage') THEN
        CREATE POLICY admin_all_youtube_api_usage ON public.youtube_api_usage
            FOR ALL TO authenticated
            USING (public.is_admin());
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'youtube_api_cache' AND policyname = 'service_role_youtube_api_cache') THEN
        CREATE POLICY service_role_youtube_api_cache ON public.youtube_api_cache
            FOR ALL TO service_role
            USING (true);
    END IF;
END $$;

-- Verify tables were created
SELECT 
    'Tables created:' as status,
    COUNT(*) as table_count,
    string_agg(table_name, ', ' ORDER BY table_name) as tables
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('youtube_channels', 'schedule_slots', 'live_streams', 'youtube_api_usage', 'youtube_api_cache');