-- Phase 1: Enhance schedule tables for YouTube API sync and caching

-- First, alter schedule_slots to support day_of_week as array for Mon-Fri patterns
ALTER TABLE public.schedule_slots 
DROP COLUMN day_of_week,
ADD COLUMN day_of_week SMALLINT[] DEFAULT NULL;

COMMENT ON COLUMN public.schedule_slots.day_of_week IS 'Array of days (0=Sunday, 1=Monday, ..., 6=Saturday) for recurring slots. Null if specific_date is set.';

-- Add fields to live_streams table for better tracking and caching
ALTER TABLE public.live_streams 
ADD COLUMN fetched_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN scheduled_vs_actual_diff INTERVAL,
ADD COLUMN matched_slot_id UUID REFERENCES public.schedule_slots(id),
ADD COLUMN description TEXT,
ADD COLUMN view_count INTEGER,
ADD COLUMN duration_minutes INTEGER,
ADD COLUMN privacy_status TEXT DEFAULT 'public';

COMMENT ON COLUMN public.live_streams.fetched_at IS 'When this data was last fetched from YouTube API';
COMMENT ON COLUMN public.live_streams.scheduled_vs_actual_diff IS 'Difference between scheduled slot time and actual stream time';
COMMENT ON COLUMN public.live_streams.matched_slot_id IS 'Reference to the schedule slot this stream matches (if any)';
COMMENT ON COLUMN public.live_streams.description IS 'Stream description from YouTube';
COMMENT ON COLUMN public.live_streams.view_count IS 'Current view count for completed streams';
COMMENT ON COLUMN public.live_streams.duration_minutes IS 'Stream duration in minutes for completed streams';
COMMENT ON COLUMN public.live_streams.privacy_status IS 'YouTube privacy status: public, unlisted, private';

-- Create API usage tracking table
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
COMMENT ON COLUMN public.youtube_api_usage.endpoint IS 'YouTube API endpoint called (search, videos, channels)';
COMMENT ON COLUMN public.youtube_api_usage.units_used IS 'API quota units consumed by this request';
COMMENT ON COLUMN public.youtube_api_usage.channel_ids IS 'Channel IDs involved in this request';
COMMENT ON COLUMN public.youtube_api_usage.response_cached IS 'Whether this request used cached data';

-- Create cache table for YouTube API responses
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
COMMENT ON COLUMN public.youtube_api_cache.cache_key IS 'Unique identifier for this cached response';
COMMENT ON COLUMN public.youtube_api_cache.response_data IS 'Raw API response stored as JSON';
COMMENT ON COLUMN public.youtube_api_cache.expires_at IS 'When this cache entry expires';

-- Add indexes for performance
CREATE INDEX idx_live_streams_fetched_at ON public.live_streams(fetched_at);
CREATE INDEX idx_live_streams_matched_slot ON public.live_streams(matched_slot_id);
CREATE INDEX idx_live_streams_channel_scheduled ON public.live_streams(youtube_channel_id, scheduled_start_time_utc);

CREATE INDEX idx_schedule_slots_day_of_week_gin ON public.schedule_slots USING gin(day_of_week);
CREATE INDEX idx_schedule_slots_recurring ON public.schedule_slots(is_recurring);

CREATE INDEX idx_youtube_api_usage_timestamp ON public.youtube_api_usage(request_timestamp);
CREATE INDEX idx_youtube_api_usage_endpoint ON public.youtube_api_usage(endpoint);
CREATE INDEX idx_youtube_api_usage_quota ON public.youtube_api_usage(quota_exceeded, request_timestamp);

CREATE INDEX idx_youtube_api_cache_key ON public.youtube_api_cache(cache_key);
CREATE INDEX idx_youtube_api_cache_expires ON public.youtube_api_cache(expires_at);
CREATE INDEX idx_youtube_api_cache_channel ON public.youtube_api_cache(channel_id, endpoint);

-- Function to clean up expired cache entries
CREATE OR REPLACE FUNCTION public.cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.youtube_api_cache 
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.cleanup_expired_cache() IS 'Removes expired cache entries and returns count of deleted rows';

-- Function to get API usage for the current day
CREATE OR REPLACE FUNCTION public.get_daily_api_usage(target_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  endpoint TEXT,
  total_units INTEGER,
  request_count BIGINT,
  cached_requests BIGINT,
  quota_exceeded_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    yau.endpoint,
    SUM(yau.units_used)::INTEGER as total_units,
    COUNT(*)::BIGINT as request_count,
    COUNT(*) FILTER (WHERE yau.response_cached = true)::BIGINT as cached_requests,
    COUNT(*) FILTER (WHERE yau.quota_exceeded = true)::BIGINT as quota_exceeded_count
  FROM public.youtube_api_usage yau
  WHERE DATE(yau.request_timestamp) = target_date
  GROUP BY yau.endpoint
  ORDER BY total_units DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.get_daily_api_usage(DATE) IS 'Returns API usage statistics for a specific date';

-- Add trigger for auto-cleanup on youtube_api_cache table
CREATE OR REPLACE FUNCTION public.trigger_cleanup_cache()
RETURNS TRIGGER AS $$
BEGIN
  -- Every 100th insert, clean up expired entries
  IF (SELECT COUNT(*) FROM public.youtube_api_cache) % 100 = 0 THEN
    PERFORM public.cleanup_expired_cache();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_cleanup_cache 
  AFTER INSERT ON public.youtube_api_cache
  FOR EACH ROW EXECUTE FUNCTION public.trigger_cleanup_cache();

-- RLS Policies
ALTER TABLE public.youtube_api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.youtube_api_cache ENABLE ROW LEVEL SECURITY;

-- Admin can see all API usage data
CREATE POLICY admin_all_youtube_api_usage ON public.youtube_api_usage
  FOR ALL TO authenticated
  USING (public.is_admin());

-- Cache is system-internal, only service role access
CREATE POLICY service_role_youtube_api_cache ON public.youtube_api_cache
  FOR ALL TO service_role;

-- Update existing indexes to be more efficient
DROP INDEX IF EXISTS idx_schedule_slots_day_of_week;