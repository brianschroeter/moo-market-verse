
-- Create function to get all users (for admin purposes)
CREATE OR REPLACE FUNCTION public.get_all_users()
RETURNS TABLE (
  id uuid,
  email text,
  created_at timestamptz,
  updated_at timestamptz,
  user_metadata jsonb
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Check if the current user is an admin
  IF NOT (SELECT is_admin()) THEN
    RAISE EXCEPTION 'Only administrators can access user data';
  END IF;
  
  RETURN QUERY
  SELECT au.id, au.email, au.created_at, au.updated_at, au.raw_user_meta_data
  FROM auth.users au
  ORDER BY au.created_at DESC;
END;
$$;

-- Set appropriate permissions
REVOKE EXECUTE ON FUNCTION public.get_all_users() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_all_users() TO authenticated;
