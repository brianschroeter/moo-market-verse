-- Fix race condition in get_next_youtube_api_key by using proper row-level locking
-- This ensures only one request can claim a key at a time

-- Drop the existing function
DROP FUNCTION IF EXISTS get_next_youtube_api_key();

-- Create improved function with proper locking
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
    v_key_id UUID;
BEGIN
    -- Use FOR UPDATE SKIP LOCKED to ensure only one transaction can claim a key
    -- This prevents race conditions where multiple requests get the same key
    SELECT ak.id, ak.api_key_encrypted
    INTO key_record
    FROM youtube_api_keys ak
    WHERE ak.status = 'active'
      -- Reset keys that were marked as quota exceeded more than 24 hours ago
      OR (ak.status = 'quota_exceeded' AND ak.quota_exceeded_at < NOW() - INTERVAL '24 hours')
    ORDER BY 
        -- Prioritize keys that have never been used
        CASE WHEN ak.last_used_at IS NULL THEN 0 ELSE 1 END,
        -- Then order by least recently used
        ak.last_used_at ASC NULLS FIRST
    LIMIT 1
    FOR UPDATE SKIP LOCKED;  -- This is the critical change for preventing race conditions

    IF key_record.id IS NULL THEN
        RAISE EXCEPTION 'No active YouTube API keys available';
    END IF;

    v_key_id := key_record.id;

    -- Update usage statistics and potentially reset quota exceeded status
    UPDATE youtube_api_keys
    SET 
        last_used_at = NOW(),
        total_requests = total_requests + 1,
        status = CASE 
            WHEN status = 'quota_exceeded' AND quota_exceeded_at < NOW() - INTERVAL '24 hours' 
            THEN 'active'
            ELSE status
        END,
        consecutive_errors = CASE 
            WHEN status = 'quota_exceeded' AND quota_exceeded_at < NOW() - INTERVAL '24 hours' 
            THEN 0
            ELSE consecutive_errors
        END
    WHERE youtube_api_keys.id = v_key_id;

    RETURN QUERY
    SELECT key_record.id, key_record.api_key_encrypted;
END;
$$;

-- Add function to get all active keys for round-robin selection
-- This is useful for edge functions that want to implement their own selection strategy
CREATE OR REPLACE FUNCTION get_all_active_youtube_api_keys()
RETURNS TABLE (
    id UUID,
    api_key_encrypted TEXT,
    last_used_at TIMESTAMPTZ,
    total_requests INTEGER,
    consecutive_errors INTEGER
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ak.id, 
        ak.api_key_encrypted,
        ak.last_used_at,
        ak.total_requests,
        ak.consecutive_errors
    FROM youtube_api_keys ak
    WHERE ak.status = 'active'
       OR (ak.status = 'quota_exceeded' AND ak.quota_exceeded_at < NOW() - INTERVAL '24 hours')
    ORDER BY 
        CASE WHEN ak.last_used_at IS NULL THEN 0 ELSE 1 END,
        ak.last_used_at ASC NULLS FIRST;
END;
$$;

-- Add function to record successful API call (reduces consecutive_errors)
CREATE OR REPLACE FUNCTION record_youtube_api_success(key_id UUID)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE youtube_api_keys
    SET 
        consecutive_errors = 0,
        last_error = NULL,
        last_error_at = NULL
    WHERE id = key_id
      AND consecutive_errors > 0;
END;
$$;

-- Update the mark_youtube_api_key_quota_exceeded function to be more intelligent
DROP FUNCTION IF EXISTS mark_youtube_api_key_quota_exceeded(UUID, TEXT);

CREATE OR REPLACE FUNCTION mark_youtube_api_key_quota_exceeded(
    key_id UUID, 
    error_message TEXT DEFAULT NULL,
    is_quota_error BOOLEAN DEFAULT TRUE
)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE youtube_api_keys
    SET 
        status = CASE 
            WHEN is_quota_error THEN 'quota_exceeded'
            WHEN consecutive_errors >= 5 THEN 'inactive'  -- Disable key after 5 consecutive errors
            ELSE status
        END,
        quota_exceeded_at = CASE 
            WHEN is_quota_error THEN NOW()
            ELSE quota_exceeded_at
        END,
        last_error = COALESCE(error_message, 'Quota exceeded'),
        last_error_at = NOW(),
        consecutive_errors = consecutive_errors + 1
    WHERE id = key_id;
END;
$$;

-- Add index for the new locking query pattern
CREATE INDEX IF NOT EXISTS idx_youtube_api_keys_status_last_used 
ON youtube_api_keys(status, last_used_at) 
WHERE status IN ('active', 'quota_exceeded');

-- Add a comment explaining the locking strategy
COMMENT ON FUNCTION get_next_youtube_api_key() IS 
'Retrieves the next available YouTube API key using row-level locking to prevent race conditions. 
Uses FOR UPDATE SKIP LOCKED to ensure only one transaction can claim a key at a time.
Automatically reactivates keys that were marked as quota_exceeded more than 24 hours ago.';