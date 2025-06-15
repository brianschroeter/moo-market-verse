-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage to postgres user (may already exist)
GRANT USAGE ON SCHEMA cron TO postgres;

-- Check if old cron job exists before trying to unschedule
DO $$
BEGIN
    -- Only unschedule if the job exists
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-youtube-streams') THEN
        PERFORM cron.unschedule('sync-youtube-streams');
    END IF;
END
$$;

-- Schedule FULL sync every 6 hours
SELECT cron.schedule(
  'youtube-full-sync',
  '0 */6 * * *',  -- Every 6 hours at minute 0
  'SELECT sync_youtube_streams_cron();'
);

-- Create function for lightweight active streams sync
CREATE OR REPLACE FUNCTION sync_youtube_active_streams()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  _response_id bigint;
BEGIN
  -- Call the active sync edge function
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/sync-youtube-active',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}',
    timeout_milliseconds := 60000  -- 1 minute timeout for lightweight sync
  ) INTO _response_id;
  
  -- Log is handled by the edge function itself
END;
$$;

-- Create function for today's schedule sync  
CREATE OR REPLACE FUNCTION sync_youtube_today_schedule()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  _response_id bigint;
BEGIN
  -- Call the today sync edge function
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/sync-youtube-today',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}',
    timeout_milliseconds := 180000  -- 3 minute timeout
  ) INTO _response_id;
  
  -- Log is handled by the edge function itself
END;
$$;

-- Schedule ACTIVE sync every 5 minutes
SELECT cron.schedule(
  'youtube-active-sync',
  '*/5 * * * *',  -- Every 5 minutes
  'SELECT sync_youtube_active_streams();'
);

-- Schedule TODAY sync every hour
SELECT cron.schedule(
  'youtube-today-sync', 
  '0 * * * *',  -- Every hour at minute 0
  'SELECT sync_youtube_today_schedule();'
);

-- Add comments
COMMENT ON FUNCTION sync_youtube_active_streams() IS 'Lightweight sync for active/upcoming YouTube streams - runs every 5 minutes';
COMMENT ON FUNCTION sync_youtube_today_schedule() IS 'Syncs today''s YouTube schedule - runs every hour';

-- Create indexes to optimize queries for active streams
CREATE INDEX IF NOT EXISTS idx_live_streams_status_scheduled 
ON live_streams(status, scheduled_start_time_utc)
WHERE status IN ('live', 'upcoming');

CREATE INDEX IF NOT EXISTS idx_live_streams_actual_start 
ON live_streams(actual_start_time_utc)
WHERE actual_start_time_utc IS NOT NULL;

-- View to see all YouTube sync cron jobs
CREATE OR REPLACE VIEW youtube_sync_jobs AS
SELECT 
  jobname,
  schedule,
  command,
  CASE jobname
    WHEN 'youtube-active-sync' THEN 'Checks live/upcoming streams every 5 minutes'
    WHEN 'youtube-today-sync' THEN 'Syncs today''s full schedule every hour'
    WHEN 'youtube-full-sync' THEN 'Complete sync of all channels every 6 hours'
  END as description
FROM cron.job
WHERE jobname LIKE 'youtube-%sync'
ORDER BY 
  CASE jobname
    WHEN 'youtube-active-sync' THEN 1
    WHEN 'youtube-today-sync' THEN 2
    WHEN 'youtube-full-sync' THEN 3
  END;

-- Grant access to the view
GRANT SELECT ON youtube_sync_jobs TO authenticated;

COMMENT ON VIEW youtube_sync_jobs IS 'Shows all YouTube sync cron jobs and their schedules';