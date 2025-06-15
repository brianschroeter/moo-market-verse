-- Create cron_history table to track scheduled job runs
CREATE TABLE IF NOT EXISTS public.cron_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_name TEXT NOT NULL,
    run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    success BOOLEAN NOT NULL DEFAULT false,
    result JSONB,
    error TEXT,
    duration_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on job_name and run_at for efficient querying
CREATE INDEX idx_cron_history_job_run ON public.cron_history(job_name, run_at DESC);

-- RLS policies for cron_history (admin only)
ALTER TABLE public.cron_history ENABLE ROW LEVEL SECURITY;

-- Admin read policy
CREATE POLICY "Admins can view cron history" ON public.cron_history
    FOR SELECT
    USING (is_admin());

-- Service role write policy (for edge functions)
CREATE POLICY "Service role can insert cron history" ON public.cron_history
    FOR INSERT
    WITH CHECK (true);

-- Add comment
COMMENT ON TABLE public.cron_history IS 'Tracks execution history of scheduled cron jobs';