CREATE OR REPLACE FUNCTION get_shared_fingerprint_details()
RETURNS TABLE (
    fingerprint TEXT,
    user_id UUID,
    username TEXT,
    discord_id TEXT,
    discord_avatar TEXT,
    last_seen_at TIMESTAMPTZ,
    first_seen_at TIMESTAMPTZ -- Added to show when this fingerprint was first seen for this user
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    WITH shared_fingerprints AS (
        SELECT
            ud.fingerprint,
            COUNT(DISTINCT ud.user_id) as user_count
        FROM
            public.user_devices ud
        WHERE
            ud.fingerprint IS NOT NULL
        GROUP BY
            ud.fingerprint
        HAVING
            COUNT(DISTINCT ud.user_id) > 1
    ),
    shared_fingerprint_users AS (
        SELECT
            sf.fingerprint,
            ud.user_id,
            MAX(ud.last_seen_at) as last_seen_at, -- Get the most recent time this user used this fingerprint
            MIN(ud.created_at) as first_seen_at -- Get the earliest time this user used this fingerprint
        FROM
            shared_fingerprints sf
        JOIN
            public.user_devices ud ON sf.fingerprint = ud.fingerprint
        GROUP BY
            sf.fingerprint, ud.user_id -- Group by user to get their specific last/first seen for this FP
    )
    SELECT
        sfu.fingerprint,
        p.id as user_id,
        p.discord_username as username,
        p.discord_id,
        p.discord_avatar,
        sfu.last_seen_at,
        sfu.first_seen_at
    FROM
        shared_fingerprint_users sfu
    JOIN
        public.profiles p ON sfu.user_id = p.id
    ORDER BY
        sfu.fingerprint, sfu.last_seen_at DESC, p.discord_username;
$$; 