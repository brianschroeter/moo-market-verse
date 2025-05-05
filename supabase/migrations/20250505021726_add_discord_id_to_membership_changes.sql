ALTER TABLE public.membership_changes
ADD COLUMN discord_id text NULL;

-- Optional: Add comment for clarity
COMMENT ON COLUMN public.membership_changes.discord_id IS 'The Discord ID of the user associated with the change';
