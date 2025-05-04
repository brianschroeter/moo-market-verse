-- Query to show policies for discord_connections and user_roles
SELECT policyname, cmd, qual AS using_expression, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'discord_connections';

SELECT policyname, cmd, qual AS using_expression, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'user_roles';
