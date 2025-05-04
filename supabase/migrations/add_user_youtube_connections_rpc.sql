
-- Create RPC function to get the current user's YouTube connection IDs
CREATE OR REPLACE FUNCTION get_user_youtube_connections()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT id FROM youtube_connections 
  WHERE user_id = auth.uid();
$$;
