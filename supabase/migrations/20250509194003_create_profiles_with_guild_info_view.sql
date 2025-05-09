CREATE VIEW public.profiles_with_guild_info AS
SELECT
    p.id,
    p.created_at,
    p.discord_id,
    p.discord_username,
    p.discord_avatar,
    -- Add any other columns from 'public.profiles' you might need directly
    COALESCE(gc.guild_count, 0) AS guild_count
FROM
    public.profiles p
LEFT JOIN (
    SELECT
        ug.user_id,
        COUNT(ug.guild_id)::BIGINT AS guild_count -- Ensure guild_count is BIGINT
    FROM
        public.discord_guilds ug -- Corrected table name here
    GROUP BY
        ug.user_id
) gc ON p.id = gc.user_id;

-- Optional: Grant SELECT on this view if needed, though RLS from 'public.profiles' might cover it
-- or your admin role might already have sufficient privileges.
-- Example: GRANT SELECT ON public.profiles_with_guild_info TO service_role;
