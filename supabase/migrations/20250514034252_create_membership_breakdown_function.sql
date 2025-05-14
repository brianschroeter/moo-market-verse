CREATE OR REPLACE FUNCTION public.get_channel_membership_breakdown()
RETURNS TABLE(
    channel_name TEXT,
    rank BIGINT,
    crown_count INTEGER,
    paypig_count INTEGER,
    cash_cow_count INTEGER,
    total_members_count INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH channel_level_counts AS (
        SELECT
            ym.channel_name,
            COALESCE(SUM(CASE WHEN ym.membership_level = 'Crown' THEN 1 ELSE 0 END), 0)::INTEGER AS crown_count,
            COALESCE(SUM(CASE WHEN ym.membership_level = 'Pay Pig' THEN 1 ELSE 0 END), 0)::INTEGER AS paypig_count,
            COALESCE(SUM(CASE WHEN ym.membership_level = 'Cash Cow' THEN 1 ELSE 0 END), 0)::INTEGER AS cash_cow_count
        FROM
            public.youtube_memberships ym
        GROUP BY
            ym.channel_name
    ),
    ranked_channels AS (
        SELECT
            clc.channel_name,
            clc.crown_count,
            clc.paypig_count,
            clc.cash_cow_count,
            (clc.crown_count + clc.paypig_count + clc.cash_cow_count)::INTEGER AS total_members_count,
            RANK() OVER (ORDER BY (clc.crown_count + clc.paypig_count + clc.cash_cow_count) DESC, clc.channel_name ASC) AS calculated_rank
        FROM
            channel_level_counts clc
    )
    SELECT
        rc.channel_name,
        rc.calculated_rank,
        rc.crown_count,
        rc.paypig_count,
        rc.cash_cow_count,
        rc.total_members_count
    FROM
        ranked_channels rc
    ORDER BY
        rc.calculated_rank;
END;
$$;
