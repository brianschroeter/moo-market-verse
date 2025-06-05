-- Fix RLS policies to work with dev mode
-- In dev mode, we bypass auth but still need admin access for testing

-- Helper function to check if we're in dev mode
-- This function returns true if no real authentication is present (dev mode)
CREATE OR REPLACE FUNCTION is_dev_mode() RETURNS boolean AS $$
BEGIN
  -- If auth.uid() is null, we assume dev mode
  RETURN auth.uid() IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is admin (works in both dev and prod)
CREATE OR REPLACE FUNCTION is_admin_or_dev() RETURNS boolean AS $$
BEGIN
  -- In dev mode, always allow (for testing)
  IF auth.uid() IS NULL THEN
    RETURN true;
  END IF;
  
  -- In prod mode, check actual admin role
  RETURN EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update Discord Connections policy
DROP POLICY IF EXISTS "Admin and dev access to discord connections" ON discord_connections;
CREATE POLICY "Admin and dev access to discord connections"
ON discord_connections FOR SELECT
TO anon, authenticated
USING (
  is_admin_or_dev() OR user_id = auth.uid()
);

-- Update YouTube Connections policy  
DROP POLICY IF EXISTS "Admin and dev access to youtube connections" ON youtube_connections;
CREATE POLICY "Admin and dev access to youtube connections"
ON youtube_connections FOR SELECT
TO anon, authenticated
USING (
  is_admin_or_dev() OR user_id = auth.uid()
);

-- Update YouTube Memberships policy
DROP POLICY IF EXISTS "Admin and dev access to youtube memberships" ON youtube_memberships;
CREATE POLICY "Admin and dev access to youtube memberships"
ON youtube_memberships FOR SELECT
TO anon, authenticated
USING (
  is_admin_or_dev() 
  OR EXISTS (
    SELECT 1 FROM youtube_connections yc
    WHERE yc.user_id = auth.uid() 
    AND yc.youtube_channel_id = youtube_memberships.youtube_connection_id
  )
);

-- Update Discord Guilds policy
DROP POLICY IF EXISTS "Admin and dev access to discord guilds" ON discord_guilds;
CREATE POLICY "Admin and dev access to discord guilds"
ON discord_guilds FOR SELECT
TO anon, authenticated
USING (
  is_admin_or_dev() OR user_id = auth.uid()
);

-- Update User Devices policy
DROP POLICY IF EXISTS "Admin and dev access to user devices" ON user_devices;
CREATE POLICY "Admin and dev access to user devices"
ON user_devices FOR SELECT
TO anon, authenticated
USING (
  is_admin_or_dev() OR user_id = auth.uid()
);

-- Update Profiles policy to work with dev mode
DROP POLICY IF EXISTS "Admin and dev access to profiles" ON profiles;
CREATE POLICY "Admin and dev access to profiles"
ON profiles FOR SELECT
TO anon, authenticated
USING (
  is_admin_or_dev() OR id = auth.uid()
);