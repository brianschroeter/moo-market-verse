-- Function to assign a role, bypassing RLS. SECURITY DEFINER is crucial.
CREATE OR REPLACE FUNCTION assign_admin_role(target_user_id uuid, target_role public.user_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public -- Important for SECURITY DEFINER functions
AS $$
BEGIN
  -- Attempt to insert the role for the specified user
  INSERT INTO user_roles (user_id, role)
  VALUES (target_user_id, target_role)
  -- If the role assignment already exists, do nothing (avoids errors)
  ON CONFLICT (user_id, role) DO NOTHING;

  RAISE LOG 'Assigned role % to user %', target_role, target_user_id;

EXCEPTION
  WHEN others THEN
    RAISE EXCEPTION 'Error assigning role % to user %: %', target_role, target_user_id, SQLERRM;
END;
$$;

-- Optional: Grant execute permission to the authenticated role if needed
-- Depending on your setup, this might already be implicitly granted or handled elsewhere.
-- If you encounter permission issues calling the function from the client, uncomment this:
-- GRANT EXECUTE ON FUNCTION assign_admin_role(uuid, public.user_role) TO authenticated;
