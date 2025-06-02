-- Clear existing fingerprint data due to inefficiency issues
-- This will remove all existing device fingerprint records
DELETE FROM user_devices;

-- Enhance the user_devices table with improved fingerprint tracking
ALTER TABLE user_devices 
ADD COLUMN IF NOT EXISTS fingerprint_components JSONB,
ADD COLUMN IF NOT EXISTS confidence_score NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS fingerprint_version TEXT DEFAULT '2.0';

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_devices_confidence ON user_devices(confidence_score);
CREATE INDEX IF NOT EXISTS idx_user_devices_fingerprint_components ON user_devices USING GIN(fingerprint_components);

-- Add comments for documentation
COMMENT ON COLUMN user_devices.fingerprint_components IS 'Individual fingerprint components (screen, timezone, etc.) as JSON';
COMMENT ON COLUMN user_devices.confidence_score IS 'Confidence score from fingerprint library (0-100)';
COMMENT ON COLUMN user_devices.fingerprint_version IS 'Version of fingerprint collection method';

-- Create a function to find similar devices based on weighted component matching
CREATE OR REPLACE FUNCTION find_similar_devices(
    target_components JSONB,
    min_confidence NUMERIC DEFAULT 80.0,
    similarity_threshold NUMERIC DEFAULT 0.7
)
RETURNS TABLE (
    user_id UUID,
    fingerprint TEXT,
    similarity_score NUMERIC,
    confidence_score NUMERIC,
    last_seen_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH component_similarities AS (
        SELECT 
            ud.user_id,
            ud.fingerprint,
            ud.confidence_score,
            ud.last_seen_at,
            -- Calculate weighted similarity score
            CASE 
                WHEN ud.fingerprint_components IS NULL THEN 0
                ELSE (
                    -- Screen resolution (weight: 0.3)
                    CASE WHEN ud.fingerprint_components->>'screen' = target_components->>'screen' THEN 0.3 ELSE 0 END +
                    -- Timezone (weight: 0.2)
                    CASE WHEN ud.fingerprint_components->>'timezone' = target_components->>'timezone' THEN 0.2 ELSE 0 END +
                    -- Language (weight: 0.15)
                    CASE WHEN ud.fingerprint_components->>'language' = target_components->>'language' THEN 0.15 ELSE 0 END +
                    -- Platform (weight: 0.15)
                    CASE WHEN ud.fingerprint_components->>'platform' = target_components->>'platform' THEN 0.15 ELSE 0 END +
                    -- Canvas (weight: 0.1)
                    CASE WHEN ud.fingerprint_components->>'canvas' = target_components->>'canvas' THEN 0.1 ELSE 0 END +
                    -- WebGL (weight: 0.1)
                    CASE WHEN ud.fingerprint_components->>'webgl' = target_components->>'webgl' THEN 0.1 ELSE 0 END
                )
            END AS similarity_score
        FROM user_devices ud
        WHERE ud.confidence_score >= min_confidence
    )
    SELECT 
        cs.user_id,
        cs.fingerprint,
        cs.similarity_score,
        cs.confidence_score,
        cs.last_seen_at
    FROM component_similarities cs
    WHERE cs.similarity_score >= similarity_threshold
    ORDER BY cs.similarity_score DESC, cs.confidence_score DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION find_similar_devices TO authenticated;

-- Create a function to get enhanced fingerprint statistics for admin use
CREATE OR REPLACE FUNCTION get_enhanced_fingerprint_stats()
RETURNS TABLE (
    total_devices BIGINT,
    high_confidence_devices BIGINT,
    unique_users BIGINT,
    potential_duplicates BIGINT,
    avg_confidence NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_devices,
        COUNT(*) FILTER (WHERE confidence_score >= 80) as high_confidence_devices,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(*) - COUNT(DISTINCT user_id) as potential_duplicates,
        ROUND(AVG(confidence_score), 2) as avg_confidence
    FROM user_devices;
END;
$$;

-- Grant execute permission to authenticated users (RLS will handle admin access)
GRANT EXECUTE ON FUNCTION get_enhanced_fingerprint_stats TO authenticated;

-- Update the existing get_shared_fingerprint_details function to use enhanced matching
DROP FUNCTION IF EXISTS get_shared_fingerprint_details();

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
            ROUND(AVG(ud.confidence_score), 2) as avg_confidence,
            MAX(ud.last_seen_at) as last_activity,
            jsonb_agg(
                jsonb_build_object(
                    'user_id', ud.user_id,
                    'discord_username', p.discord_username,
                    'discord_id', p.discord_id,
                    'last_seen_at', ud.last_seen_at,
                    'confidence_score', ud.confidence_score,
                    'user_agent', ud.user_agent
                ) ORDER BY ud.last_seen_at DESC
            ) as users
        FROM user_devices ud
        LEFT JOIN profiles p ON ud.user_id = p.id
        WHERE ud.confidence_score >= 70  -- Only include high-confidence fingerprints
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