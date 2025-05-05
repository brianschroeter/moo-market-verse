CREATE TABLE public.membership_changes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    change_timestamp timestamptz NOT NULL DEFAULT now(),
    youtube_connection_id text NOT NULL,
    channel_name text NOT NULL,
    change_type text NOT NULL, -- e.g., 'added', 'removed', 'level_changed'
    old_level text NULL,       -- Nullable, will be null for 'added' type
    new_level text NULL        -- Nullable, will be null for 'removed' type
);

-- Optional: Add indexes for potentially faster querying later
CREATE INDEX idx_membership_changes_timestamp ON public.membership_changes (change_timestamp);
CREATE INDEX idx_membership_changes_connection_channel ON public.membership_changes (youtube_connection_id, channel_name);
CREATE INDEX idx_membership_changes_type ON public.membership_changes (change_type);

-- Optional: Add comments for clarity
COMMENT ON COLUMN public.membership_changes.change_type IS 'Type of change detected (added, removed, level_changed)';
COMMENT ON COLUMN public.membership_changes.old_level IS 'The membership level before the change (NULL if newly added)';
COMMENT ON COLUMN public.membership_changes.new_level IS 'The membership level after the change (NULL if removed)';
