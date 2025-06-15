-- Fix the live_streams RLS policy issue
-- First check if the policy exists before trying to alter it
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

-- Ensure shop menu item exists and can be properly toggled
-- First, ensure the shop menu item exists
INSERT INTO public.menu_items (item_key, is_enabled)
VALUES ('shop', true)
ON CONFLICT (item_key) DO NOTHING;

-- Add a comment to clarify the purpose
COMMENT ON TABLE public.menu_items IS 'Controls which navigation items are visible in the main menu. Admins can toggle these on/off.';