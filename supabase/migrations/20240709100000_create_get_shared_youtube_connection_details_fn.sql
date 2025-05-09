CREATE OR REPLACE FUNCTION get_shared_youtube_connection_details()
RETURNS TABLE (
    youtube_channel_id TEXT,
    youtube_channel_name TEXT,
    user_id UUID,
    username TEXT,
    discord_id TEXT,
    discord_avatar TEXT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    WITH shared_youtube_connections AS (
        SELECT
            dc.connection_id as youtube_channel_id,
            COUNT(DISTINCT dc.user_id) as user_count,
            MAX(dc.connection_name) as youtube_channel_name -- Assumes connection_name holds the YT channel name
        FROM
            public.discord_connections dc
        WHERE
            dc.connection_type = 'youtube' AND dc.connection_id IS NOT NULL
        GROUP BY
            dc.connection_id
        HAVING
            COUNT(DISTINCT dc.user_id) > 1
    ),
    shared_channel_users AS (
        SELECT
            syc.youtube_channel_id,
            syc.youtube_channel_name,
            dc.user_id
        FROM
            shared_youtube_connections syc
        JOIN
            public.discord_connections dc ON syc.youtube_channel_id = dc.connection_id AND dc.connection_type = 'youtube'
    )
    SELECT
        scu.youtube_channel_id,
        scu.youtube_channel_name,
        p.id as user_id,
        p.discord_username as username,
        p.discord_id,
        p.discord_avatar
    FROM
        shared_channel_users scu
    JOIN
        public.profiles p ON scu.user_id = p.id
    ORDER BY
        scu.youtube_channel_id, p.discord_username;
$$; 