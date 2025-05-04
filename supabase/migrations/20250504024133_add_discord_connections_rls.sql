    -- Enable RLS for discord_connections if not already enabled (optional, but good practice)
    ALTER TABLE public.discord_connections ENABLE ROW LEVEL SECURITY;

    -- Policy: Allow authenticated users to insert their own connections
    CREATE POLICY "Allow authenticated users to insert their own connections"
    ON public.discord_connections
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

    -- Policy: Allow authenticated users to update their own connections
    CREATE POLICY "Allow authenticated users to update their own connections"
    ON public.discord_connections
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

    -- Note: The existing SELECT policy should already be in place.
    -- If not, you would add it here as well:
    -- CREATE POLICY "Users can read their own Discord connections"
    -- ON public.discord_connections
    -- FOR SELECT
    -- TO authenticated
    -- USING (auth.uid() = user_id);