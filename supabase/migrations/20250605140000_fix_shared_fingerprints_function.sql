-- Fix get_shared_fingerprint_details function to handle NULL confidence scores
-- The function was filtering out all records because confidence_score is NULL in production data

CREATE OR REPLACE FUNCTION get_shared_fingerprint_details()
RETURNS TABLE (
    fingerprint TEXT,
    user_count BIGINT,
    users JSONB,
    avg_confidence NUMERIC,
    last_activity TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH fingerprint_groups AS (
        SELECT 
            ud.fingerprint,
            COUNT(DISTINCT ud.user_id) as user_count,
            -- Handle NULL confidence scores by using 0 as default
            ROUND(AVG(COALESCE(ud.confidence_score, 0)), 2) as avg_confidence,
            MAX(ud.last_seen_at) as last_activity,
            jsonb_agg(
                jsonb_build_object(
                    'user_id', ud.user_id,
                    'discord_username', p.discord_username,
                    'discord_id', p.discord_id,
                    'last_seen_at', ud.last_seen_at,
                    'confidence_score', COALESCE(ud.confidence_score, 0),
                    'user_agent', ud.user_agent
                ) ORDER BY ud.last_seen_at DESC
            ) as users
        FROM user_devices ud
        LEFT JOIN profiles p ON ud.user_id = p.id
        -- Remove confidence score filter since all scores are NULL in production
        -- WHERE ud.confidence_score >= 70  -- Commented out to include all devices
        GROUP BY ud.fingerprint
    )
    SELECT 
        fg.fingerprint,
        fg.user_count,
        fg.users,
        fg.avg_confidence,
        fg.last_activity
    FROM fingerprint_groups fg
    WHERE fg.user_count > 1  -- Only shared fingerprints
    ORDER BY fg.user_count DESC, fg.avg_confidence DESC;
END;
$$;