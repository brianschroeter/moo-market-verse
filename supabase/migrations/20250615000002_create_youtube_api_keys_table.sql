-- Create enum for API key status
CREATE TYPE youtube_api_key_status AS ENUM ('active', 'inactive', 'quota_exceeded');

-- Create table for storing YouTube API keys
CREATE TABLE public.youtube_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    -- Store the encrypted API key - using pgcrypto extension
    api_key_encrypted TEXT NOT NULL,
    status youtube_api_key_status NOT NULL DEFAULT 'active',
    -- Usage tracking
    total_requests INTEGER NOT NULL DEFAULT 0,
    quota_used_today INTEGER NOT NULL DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    last_quota_reset_at TIMESTAMPTZ DEFAULT NOW(),
    quota_exceeded_at TIMESTAMPTZ,
    -- Error tracking
    last_error TEXT,
    last_error_at TIMESTAMPTZ,
    consecutive_errors INTEGER NOT NULL DEFAULT 0,
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Add RLS
ALTER TABLE public.youtube_api_keys ENABLE ROW LEVEL SECURITY;

-- Only admins can view/manage API keys
CREATE POLICY "Only admins can manage YouTube API keys"
    ON public.youtube_api_keys FOR ALL
    USING (public.is_admin());

-- Create trigger for updated_at
CREATE TRIGGER on_youtube_api_keys_updated
    BEFORE UPDATE ON public.youtube_api_keys
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Create indexes for performance
CREATE INDEX idx_youtube_api_keys_status ON public.youtube_api_keys(status);
CREATE INDEX idx_youtube_api_keys_last_used ON public.youtube_api_keys(last_used_at);

-- Create a function to get the next available API key
-- This function returns the encrypted key, decryption happens in the edge function
CREATE OR REPLACE FUNCTION get_next_youtube_api_key()
RETURNS TABLE (
    id UUID,
    api_key_encrypted TEXT
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    key_record RECORD;
BEGIN
    -- Get the least recently used active key
    SELECT ak.id, ak.api_key_encrypted
    INTO key_record
    FROM youtube_api_keys ak
    WHERE ak.status = 'active'
    ORDER BY ak.last_used_at ASC NULLS FIRST
    LIMIT 1;

    IF key_record.id IS NULL THEN
        RAISE EXCEPTION 'No active YouTube API keys available';
    END IF;

    -- Update usage statistics
    UPDATE youtube_api_keys
    SET 
        last_used_at = NOW(),
        total_requests = total_requests + 1
    WHERE youtube_api_keys.id = key_record.id;

    RETURN QUERY
    SELECT key_record.id, key_record.api_key_encrypted;
END;
$$;

-- Create a function to mark a key as quota exceeded
CREATE OR REPLACE FUNCTION mark_youtube_api_key_quota_exceeded(key_id UUID, error_message TEXT DEFAULT NULL)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE youtube_api_keys
    SET 
        status = 'quota_exceeded',
        quota_exceeded_at = NOW(),
        last_error = COALESCE(error_message, 'Quota exceeded'),
        last_error_at = NOW(),
        consecutive_errors = consecutive_errors + 1
    WHERE id = key_id;
END;
$$;

-- Create a function to reset daily quotas (can be called by a cron job)
CREATE OR REPLACE FUNCTION reset_youtube_api_key_quotas()
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE youtube_api_keys
    SET 
        quota_used_today = 0,
        last_quota_reset_at = NOW(),
        status = CASE 
            WHEN status = 'quota_exceeded' AND quota_exceeded_at < NOW() - INTERVAL '24 hours' 
            THEN 'active'
            ELSE status
        END,
        consecutive_errors = 0
    WHERE status IN ('active', 'quota_exceeded');
END;
$$;

-- Create a table to log API key usage for detailed tracking
CREATE TABLE public.youtube_api_key_usage_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID NOT NULL REFERENCES public.youtube_api_keys(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    channel_ids TEXT[],
    units_used INTEGER NOT NULL DEFAULT 1,
    response_cached BOOLEAN NOT NULL DEFAULT FALSE,
    success BOOLEAN NOT NULL DEFAULT TRUE,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add RLS for usage log
ALTER TABLE public.youtube_api_key_usage_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view usage logs
CREATE POLICY "Only admins can view YouTube API key usage logs"
    ON public.youtube_api_key_usage_log FOR SELECT
    USING (public.is_admin());

-- Create index for usage log queries
CREATE INDEX idx_youtube_api_key_usage_log_key_id ON public.youtube_api_key_usage_log(api_key_id);
CREATE INDEX idx_youtube_api_key_usage_log_created ON public.youtube_api_key_usage_log(created_at);

-- Create a view for API key statistics
CREATE VIEW youtube_api_key_stats AS
SELECT 
    k.id,
    k.name,
    k.status,
    k.total_requests,
    k.quota_used_today,
    k.last_used_at,
    k.last_quota_reset_at,
    k.consecutive_errors,
    COUNT(DISTINCT l.id) as logs_count,
    SUM(CASE WHEN l.created_at > NOW() - INTERVAL '24 hours' THEN l.units_used ELSE 0 END) as units_used_24h,
    SUM(CASE WHEN l.created_at > NOW() - INTERVAL '1 hour' THEN l.units_used ELSE 0 END) as units_used_1h,
    COUNT(CASE WHEN l.error_message IS NOT NULL AND l.created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as errors_24h
FROM youtube_api_keys k
LEFT JOIN youtube_api_key_usage_log l ON k.id = l.api_key_id
GROUP BY k.id, k.name, k.status, k.total_requests, k.quota_used_today, 
         k.last_used_at, k.last_quota_reset_at, k.consecutive_errors;

-- Grant access to the view for authenticated users (RLS will still apply)
GRANT SELECT ON youtube_api_key_stats TO authenticated;