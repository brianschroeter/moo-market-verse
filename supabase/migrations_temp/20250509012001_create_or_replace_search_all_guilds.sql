CREATE OR REPLACE FUNCTION public.search_all_guilds(search_term text)
RETURNS TABLE(
    guild_id text,
    guild_name text,
    user_profile_id text,
    user_discord_username text,
    user_discord_avatar text,
    user_discord_id text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dg.guild_id,
    dg.guild_name,
    p.id AS user_profile_id,
    p.discord_username AS user_discord_username,
    p.discord_avatar AS user_discord_avatar,
    p.discord_id AS user_discord_id
  FROM
    public.discord_guilds dg
  JOIN
    public.profiles p ON dg.user_id = p.id
  WHERE
    dg.guild_name ILIKE '%' || search_term || '%' OR
    dg.guild_id = search_term;
END;
$$;
