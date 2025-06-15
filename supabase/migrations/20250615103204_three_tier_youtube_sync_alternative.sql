-- Alternative approach without pg_cron
-- This creates the functions and indexes, but the scheduling will need to be done via:
-- 1. External cron service (like GitHub Actions, Vercel Cron, or cron-job.org)
-- 2. Supabase's Dashboard scheduled functions (if available on your plan)

-- Create function for lightweight active streams sync
CREATE OR REPLACE FUNCTION sync_youtube_active_streams()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _result jsonb;
BEGIN
  -- Call the active sync edge function via HTTP
  SELECT 
    net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/sync-youtube-active',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key'),
        'Content-Type', 'application/json'
      )::jsonb,
      body := '{}'::jsonb
    ) INTO _result;
  
  RETURN _result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'error', SQLERRM,
      'success', false
    );
END;
$$;

-- Create function for today's schedule sync  
CREATE OR REPLACE FUNCTION sync_youtube_today_schedule()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _result jsonb;
BEGIN
  -- Call the today sync edge function via HTTP
  SELECT 
    net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/sync-youtube-today',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key'),
        'Content-Type', 'application/json'
      )::jsonb,
      body := '{}'::jsonb
    ) INTO _result;
  
  RETURN _result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'error', SQLERRM,
      'success', false
    );
END;
$$;

-- Create function for full sync (calls existing cron-sync-youtube)
CREATE OR REPLACE FUNCTION sync_youtube_full()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _result jsonb;
BEGIN
  -- Call the full sync edge function via HTTP
  SELECT 
    net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/cron-sync-youtube',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key'),
        'Content-Type', 'application/json'
      )::jsonb,
      body := '{}'::jsonb
    ) INTO _result;
  
  RETURN _result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'error', SQLERRM,
      'success', false
    );
END;
$$;

-- Add comments
COMMENT ON FUNCTION sync_youtube_active_streams() IS 'Lightweight sync for active/upcoming YouTube streams - should run every 5 minutes';
COMMENT ON FUNCTION sync_youtube_today_schedule() IS 'Syncs today''s YouTube schedule - should run every hour';
COMMENT ON FUNCTION sync_youtube_full() IS 'Full YouTube sync - should run every 6 hours';

-- Create indexes to optimize queries for active streams
CREATE INDEX IF NOT EXISTS idx_live_streams_status_scheduled 
ON live_streams(status, scheduled_start_time_utc)
WHERE status IN ('live', 'upcoming');

CREATE INDEX IF NOT EXISTS idx_live_streams_actual_start 
ON live_streams(actual_start_time_utc)
WHERE actual_start_time_utc IS NOT NULL;

-- Create a simple view to track sync history
CREATE OR REPLACE VIEW youtube_sync_status AS
SELECT 
  job_name,
  MAX(run_at) as last_run,
  COUNT(*) FILTER (WHERE success = true) as successful_runs,
  COUNT(*) FILTER (WHERE success = false) as failed_runs,
  COUNT(*) as total_runs
FROM cron_history
WHERE job_name IN ('youtube-active-sync', 'youtube-today-sync', 'youtube-full-sync')
GROUP BY job_name
ORDER BY 
  CASE job_name
    WHEN 'youtube-active-sync' THEN 1
    WHEN 'youtube-today-sync' THEN 2
    WHEN 'youtube-full-sync' THEN 3
  END;

-- Grant access to the view
GRANT SELECT ON youtube_sync_status TO authenticated;

COMMENT ON VIEW youtube_sync_status IS 'Shows YouTube sync job execution history';

-- Create a table to store sync schedules for reference
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
  ('youtube-active-sync', '*/5 * * * *', 'Checks live/upcoming streams every 5 minutes', '/functions/v1/sync-youtube-active'),
  ('youtube-today-sync', '0 * * * *', 'Syncs today''s full schedule every hour', '/functions/v1/sync-youtube-today'),
  ('youtube-full-sync', '0 */6 * * *', 'Complete sync of all channels every 6 hours', '/functions/v1/cron-sync-youtube')
ON CONFLICT (name) DO UPDATE 
SET schedule = EXCLUDED.schedule,
    description = EXCLUDED.description,
    endpoint = EXCLUDED.endpoint;

-- Grant access
GRANT SELECT ON youtube_sync_schedules TO authenticated;

-- Add RLS
ALTER TABLE youtube_sync_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view sync schedules" ON youtube_sync_schedules
  FOR SELECT USING (true);

-- Instructions for setting up the cron jobs
COMMENT ON TABLE youtube_sync_schedules IS 'YouTube sync schedules - use these with an external cron service like Vercel Cron, GitHub Actions, or cron-job.org';