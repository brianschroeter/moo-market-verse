CREATE POLICY "Admins can view all YouTube memberships"
ON public.youtube_memberships
FOR SELECT
TO authenticated -- Admins are authenticated users
USING (is_admin()); -- Assumes an is_admin() function exists that checks user role
