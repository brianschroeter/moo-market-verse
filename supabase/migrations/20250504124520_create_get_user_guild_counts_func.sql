-- Function to get guild counts for all users
CREATE OR REPLACE FUNCTION get_user_guild_counts()
RETURNS TABLE (user_id UUID, guild_count BIGINT)
LANGUAGE sql
STABLE -- Indicates the function doesn't modify the database
AS $$
  SELECT
    dg.user_id,
    count(dg.guild_id) AS guild_count
  FROM
    public.discord_guilds dg
  GROUP BY
    dg.user_id;
$$;

-- Grant execute permission to the authenticated role
GRANT EXECUTE ON FUNCTION public.get_user_guild_counts() TO authenticated; 