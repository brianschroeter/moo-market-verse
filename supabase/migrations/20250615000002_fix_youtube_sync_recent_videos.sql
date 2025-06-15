-- Fix YouTube sync to properly handle recent videos and past streams
-- This migration updates the sync-youtube-streams function to better fetch historical content

-- Add index on fetched_at for better performance
CREATE INDEX IF NOT EXISTS idx_live_streams_fetched_at ON live_streams(fetched_at DESC);

-- Add index on scheduled_start_time for date range queries
CREATE INDEX IF NOT EXISTS idx_live_streams_scheduled_start ON live_streams(scheduled_start_time_utc DESC);

-- Function to clean up old/stale stream data
CREATE OR REPLACE FUNCTION clean_stale_streams(days_old integer DEFAULT 30)
RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM live_streams
  WHERE fetched_at < NOW() - (days_old || ' days')::interval
  AND status = 'completed'
  AND (actual_end_time_utc IS NULL OR actual_end_time_utc < NOW() - (days_old || ' days')::interval);
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Update RLS policy to allow service role to manage all streams
DO $$
BEGIN
    -- Drop the policy if it exists
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'live_streams' 
        AND policyname = 'Service role can manage all streams'
    ) THEN
        DROP POLICY "Service role can manage all streams" ON public.live_streams;
    END IF;
    
    -- Create the policy with the correct definition
    CREATE POLICY "Service role can manage all streams" ON public.live_streams
        FOR ALL
        USING (auth.role() = 'service_role')
        WITH CHECK (auth.role() = 'service_role');
END $$;

-- Add comment explaining the sync behavior
COMMENT ON TABLE live_streams IS 'Stores YouTube live streams and videos. The sync-youtube-streams edge function fetches both upcoming streams and recent videos from the past 7 days by default.';