
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
-- USING (
--   EXISTS (
--     SELECT 1
--     FROM user_roles
--     WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
--   )
-- );
USING (is_admin());
