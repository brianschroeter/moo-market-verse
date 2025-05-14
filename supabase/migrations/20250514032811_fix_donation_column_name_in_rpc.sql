-- Function to sum total_donations by channel for a given month and year (Corrected)
CREATE OR REPLACE FUNCTION sum_donations_by_channel_for_month_year(p_month TEXT, p_year TEXT)
RETURNS TABLE(channel_name TEXT, total_donations_sum NUMERIC)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        vs.channel_name,
        SUM(vs.total_donations_usd) AS total_donations_sum -- Further corrected column name
    FROM
        public.video_stats vs
    WHERE
        vs.month = p_month AND vs.year = p_year
    GROUP BY
        vs.channel_name
    ORDER BY
        total_donations_sum DESC;
END;
$$;
