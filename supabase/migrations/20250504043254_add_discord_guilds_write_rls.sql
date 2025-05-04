-- Enable RLS for the table if it's not already enabled
-- (It should be, given the SELECT policy exists, but this is safe to include)
ALTER TABLE public.discord_guilds ENABLE ROW LEVEL SECURITY;

-- Policy: Allow users to insert their own guild records
CREATE POLICY "Allow users to insert their own guilds"
ON public.discord_guilds
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Allow users to update their own guild records
CREATE POLICY "Allow users to update their own guilds"
ON public.discord_guilds
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Allow users to delete their own guild records
CREATE POLICY "Allow users to delete their own guilds"
ON public.discord_guilds
FOR DELETE
USING (auth.uid() = user_id);
