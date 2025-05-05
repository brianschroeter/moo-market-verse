-- Optional: Define an assertion function if it doesn't exist, 
-- or rely on an existing one (like `is_admin()` adapted).
-- This example creates a basic `assert_admin` that throws an error.
CREATE OR REPLACE FUNCTION public.assert_admin()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'User is not authorized to perform this action.';
  END IF;
END;
$$;

-- Grant execute on the helper function to roles that need it (e.g., admin callers)
GRANT EXECUTE ON FUNCTION public.assert_admin() TO supabase_admin;

-- Function to find users associated with a specific device fingerprint
CREATE OR REPLACE FUNCTION public.get_users_by_fingerprint(p_fingerprint TEXT)
RETURNS TABLE (user_id UUID, username TEXT)
LANGUAGE sql
SECURITY DEFINER -- Run with the privileges of the function owner
SET search_path = '' -- Prevent hijacking attacks
AS $$
  -- Ensure the caller is an admin before proceeding
  -- This throws an error if the user is not an admin, effectively blocking execution
  SELECT public.assert_admin();

  -- Select the user ID and username for all users matching the fingerprint
  SELECT 
    ud.user_id,
    p.discord_username AS username
  FROM public.user_devices ud
  LEFT JOIN public.profiles p ON ud.user_id = p.id
  WHERE ud.fingerprint = p_fingerprint;
$$;

-- Grant execute permission ONLY to the supabase_admin role (or your admin role)
-- Authenticated users should NOT be able to call this directly.
-- RLS on the function is handled by the SECURITY DEFINER and assert_admin() check.
-- Note: We assume `supabase_admin` is the role used by admins or that `assert_admin()` uses
-- the correct logic based on `user_roles` table as seen in previous functions.
GRANT EXECUTE ON FUNCTION public.get_users_by_fingerprint(TEXT) TO supabase_admin;
