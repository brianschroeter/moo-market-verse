-- Function to get guilds for a specific user
CREATE OR REPLACE FUNCTION get_guilds_for_user(user_uuid UUID)
RETURNS TABLE (guild_id TEXT, guild_name TEXT)
LANGUAGE sql
STABLE
AS $$
  SELECT
    dg.guild_id,
    dg.guild_name
  FROM
    public.discord_guilds dg
  WHERE
    dg.user_id = user_uuid;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_guilds_for_user(UUID) TO authenticated; 