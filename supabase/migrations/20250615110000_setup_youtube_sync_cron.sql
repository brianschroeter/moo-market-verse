-- Enable pg_cron and pg_net extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Grant usage to postgres user
GRANT USAGE ON SCHEMA cron TO postgres;

-- Create a function to call the YouTube sync edge function
CREATE OR REPLACE FUNCTION sync_youtube_streams_cron()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  _response_id bigint;
BEGIN
  -- Call the edge function using pg_net
  -- This schedules an HTTP request to the edge function
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/sync-youtube-streams',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'lookBackHours', 168,  -- 7 days
      'lookAheadHours', 168, -- 7 days  
      'maxResults', 50,
      'forceRefresh', false
    ),
    timeout_milliseconds := 300000  -- 5 minute timeout
  ) INTO _response_id;
  
  -- Log the sync attempt
  INSERT INTO cron_history (
    job_name,
    run_at,
    success,
    result
  ) VALUES (
    'youtube-streams-sync',
    NOW(),
    true,
    jsonb_build_object('response_id', _response_id, 'status', 'scheduled')
  );
END;
$$;

-- Schedule the sync to run every 4 hours
-- Note: This will only work in production Supabase (not local development)
SELECT cron.schedule(
  'sync-youtube-streams',         -- job name
  '0 */4 * * *',                  -- every 4 hours
  'SELECT sync_youtube_streams_cron();'
);

-- Alternative schedules (commented out):
-- Every hour: '0 * * * *'
-- Every 30 minutes: '*/30 * * * *'
-- Every 6 hours: '0 */6 * * *'
-- Daily at 3 AM: '0 3 * * *'

-- To view scheduled jobs:
-- SELECT * FROM cron.job;

-- To unschedule:
-- SELECT cron.unschedule('sync-youtube-streams');

-- Add comment
COMMENT ON FUNCTION sync_youtube_streams_cron() IS 'Calls the YouTube sync edge function via pg_net for scheduled synchronization';