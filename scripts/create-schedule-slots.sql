-- Create default schedule slots based on observed streaming patterns
-- This will allow the schedule page to show predicted times

-- First, let's see what patterns we have from the streams
WITH stream_patterns AS (
  SELECT 
    youtube_channel_id,
    EXTRACT(DOW FROM scheduled_start_time_utc AT TIME ZONE 'UTC')::int as day_of_week,
    TO_CHAR(scheduled_start_time_utc AT TIME ZONE 'UTC', 'HH24:00:00') as start_time,
    COUNT(*) as stream_count
  FROM live_streams
  WHERE scheduled_start_time_utc IS NOT NULL
    AND scheduled_start_time_utc >= NOW() - INTERVAL '14 days'
  GROUP BY youtube_channel_id, day_of_week, start_time
  HAVING COUNT(*) >= 1
),
-- Get the most common time for each channel/day combination
ranked_patterns AS (
  SELECT 
    youtube_channel_id,
    day_of_week,
    start_time,
    stream_count,
    ROW_NUMBER() OVER (PARTITION BY youtube_channel_id, day_of_week ORDER BY stream_count DESC, start_time) as rn
  FROM stream_patterns
)
-- Insert schedule slots for recurring patterns
INSERT INTO schedule_slots (
  youtube_channel_id,
  day_of_week,
  default_start_time_utc,
  is_recurring,
  fallback_title,
  created_at,
  updated_at
)
SELECT DISTINCT
  rp.youtube_channel_id,
  ARRAY[rp.day_of_week],
  rp.start_time::time,
  true,
  CASE 
    WHEN yc.channel_name = 'LolcowLive' THEN 'Daily Live Stream'
    WHEN yc.channel_name = 'LolcowCafe' THEN 'Morning Coffee & Chat'
    WHEN yc.channel_name = 'LolcowQueens' THEN 'Queens Talk'
    WHEN yc.channel_name = 'LolcowRewind' THEN 'Rewind Show'
    WHEN yc.channel_name = 'LolcowTechTalk' THEN 'Tech Talk Live'
    WHEN yc.channel_name = 'LolcowNerd' THEN 'Nerd Stream'
    WHEN yc.channel_name = 'LolcowMilkers' THEN 'Milkers Show'
    WHEN yc.channel_name = 'LolcowAussy' THEN 'Aussy Stream'
    WHEN yc.channel_name = 'LolcowTest' THEN 'Test Stream'
    ELSE 'Regular Stream'
  END,
  NOW(),
  NOW()
FROM ranked_patterns rp
JOIN youtube_channels yc ON yc.id = rp.youtube_channel_id
WHERE rp.rn = 1
  AND rp.day_of_week BETWEEN 1 AND 5 -- Monday through Friday only for now
  AND NOT EXISTS (
    SELECT 1 FROM schedule_slots ss 
    WHERE ss.youtube_channel_id = rp.youtube_channel_id 
    AND rp.day_of_week = ANY(ss.day_of_week)
  )
ORDER BY rp.youtube_channel_id, rp.day_of_week;

-- Show what was created
SELECT 
  yc.channel_name,
  ss.day_of_week,
  ss.default_start_time_utc,
  ss.fallback_title
FROM schedule_slots ss
JOIN youtube_channels yc ON yc.id = ss.youtube_channel_id
ORDER BY ss.day_of_week[1], ss.default_start_time_utc;