
DROP POLICY IF EXISTS "Admins can view all user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all discord connections" ON public.discord_connections;
DROP POLICY IF EXISTS "Admins can view all discord guilds" ON public.discord_guilds;


CREATE POLICY "Admins can view all user roles"
ON public.user_roles
FOR SELECT
USING (is_admin());

-- 2. For discord_connections:
CREATE POLICY "Admins can view all discord connections"
ON public.discord_connections
FOR SELECT
USING (is_admin());

-- 3. For discord_guilds:
CREATE POLICY "Admins can view all discord guilds"
ON public.discord_guilds
FOR SELECT
USING (is_admin());
