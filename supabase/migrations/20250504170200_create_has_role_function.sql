-- supabase/migrations/20250504170200_create_has_role_function.sql

CREATE OR REPLACE FUNCTION public.has_role(p_user_id UUID, p_role_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER -- Or SECURITY INVOKER if RLS on user_roles should be respected for the check
                 -- For checking roles, SECURITY DEFINER is often used to allow the function to see all rows in user_roles.
SET search_path = '' -- Mitigates search_path-based attacks for SECURITY DEFINER functions
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = p_user_id AND role = p_role_name::public.user_role -- Cast the input TEXT to the public.user_role ENUM
  );
$$;

-- Grant execute permission to roles that will be using this function in policies or queries.
-- 'authenticated' is a common role for logged-in users.
GRANT EXECUTE ON FUNCTION public.has_role(UUID, TEXT) TO authenticated;

-- Optional: If service_role or other roles need it directly:
-- GRANT EXECUTE ON FUNCTION public.has_role(UUID, TEXT) TO service_role; 