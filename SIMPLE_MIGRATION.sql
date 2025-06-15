-- Simple migration that will work without pg_cron
-- Just creates the indexes and monitoring views

-- Create indexes to optimize queries for active streams
CREATE INDEX IF NOT EXISTS idx_live_streams_status_scheduled 
ON live_streams(status, scheduled_start_time_utc)
WHERE status IN ('live', 'upcoming');

CREATE INDEX IF NOT EXISTS idx_live_streams_actual_start 
ON live_streams(actual_start_time_utc)
WHERE actual_start_time_utc IS NOT NULL;

-- Create a view to track sync history
CREATE OR REPLACE VIEW youtube_sync_status AS
SELECT 
  job_name,
  MAX(run_at) as last_run,
  COUNT(*) FILTER (WHERE success = true) as successful_runs,
  COUNT(*) FILTER (WHERE success = false) as failed_runs,
  COUNT(*) as total_runs
FROM cron_history
WHERE job_name IN ('youtube-active-sync', 'youtube-today-sync', 'youtube-full-sync')
GROUP BY job_name;

-- Grant access
GRANT SELECT ON youtube_sync_status TO authenticated;

-- Create a table to document the sync schedules
CREATE TABLE IF NOT EXISTS youtube_sync_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  schedule TEXT NOT NULL,
  description TEXT,
  endpoint TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert the schedule configurations
INSERT INTO youtube_sync_schedules (name, schedule, description, endpoint) VALUES
  ('youtube-active-sync', 'Every 5 minutes', 'Checks live/upcoming streams', 'https://dlmbqojnhjsecajxltzj.supabase.co/functions/v1/sync-youtube-active'),
  ('youtube-today-sync', 'Every hour', 'Syncs today''s full schedule', 'https://dlmbqojnhjsecajxltzj.supabase.co/functions/v1/sync-youtube-today'),
  ('youtube-full-sync', 'Every 6 hours', 'Complete sync of all channels', 'https://dlmbqojnhjsecajxltzj.supabase.co/functions/v1/cron-sync-youtube')
ON CONFLICT (name) DO UPDATE 
SET schedule = EXCLUDED.schedule,
    description = EXCLUDED.description,
    endpoint = EXCLUDED.endpoint;

-- Enable RLS
ALTER TABLE youtube_sync_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view sync schedules" ON youtube_sync_schedules
  FOR SELECT USING (true);