-- Script to diagnose and fix streams stuck in "live" status
-- Run this in your Supabase SQL editor

-- 1. Find streams that have been "live" for more than 8 hours
SELECT 
    ls.video_id,
    ls.title,
    ls.status,
    ls.actual_start_time_utc,
    ls.actual_end_time_utc,
    ls.fetched_at,
    EXTRACT(HOUR FROM (NOW() - ls.actual_start_time_utc)) as hours_since_start,
    yc.channel_name
FROM live_streams ls
JOIN youtube_channels yc ON ls.youtube_channel_id = yc.id
WHERE ls.status = 'live'
    AND ls.actual_start_time_utc IS NOT NULL
    AND ls.actual_start_time_utc < NOW() - INTERVAL '8 hours'
ORDER BY ls.actual_start_time_utc ASC;

-- 2. Update streams that have been "live" for more than 8 hours to "completed"
-- UNCOMMENT TO EXECUTE:
/*
UPDATE live_streams
SET 
    status = 'completed',
    updated_at = NOW()
WHERE status = 'live'
    AND actual_start_time_utc IS NOT NULL
    AND actual_start_time_utc < NOW() - INTERVAL '8 hours';
*/

-- 3. Clear YouTube API cache for channels with stuck streams
-- This will force fresh data on next sync
-- UNCOMMENT TO EXECUTE:
/*
DELETE FROM youtube_api_cache
WHERE channel_id IN (
    SELECT DISTINCT yc.youtube_channel_id
    FROM live_streams ls
    JOIN youtube_channels yc ON ls.youtube_channel_id = yc.id
    WHERE ls.status = 'live'
        AND ls.actual_start_time_utc IS NOT NULL
        AND ls.actual_start_time_utc < NOW() - INTERVAL '8 hours'
);
*/

-- 4. View current cache entries and their expiration
SELECT 
    cache_key,
    endpoint,
    channel_id,
    fetched_at,
    expires_at,
    CASE 
        WHEN expires_at < NOW() THEN 'Expired'
        ELSE 'Active'
    END as cache_status,
    EXTRACT(MINUTE FROM (expires_at - NOW())) as minutes_until_expiry
FROM youtube_api_cache
WHERE expires_at > NOW() - INTERVAL '1 hour'
ORDER BY expires_at DESC
LIMIT 20;

-- 5. Get detailed info about a specific stuck video
-- Replace 'YOUR_VIDEO_ID' with the actual video ID
/*
SELECT 
    ls.*,
    yc.channel_name,
    yc.youtube_channel_id as yt_channel_id
FROM live_streams ls
JOIN youtube_channels yc ON ls.youtube_channel_id = yc.id
WHERE ls.video_id = 'YOUR_VIDEO_ID';
*/