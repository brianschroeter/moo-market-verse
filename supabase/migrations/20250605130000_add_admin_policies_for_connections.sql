-- Add admin RLS policies for connections tables
-- This allows admin users to access all connection data for admin features

-- Discord Connections: Add admin read access
DROP POLICY IF EXISTS "Admins can view all discord connections" ON discord_connections;
CREATE POLICY "Admins can view all discord connections" 
ON discord_connections FOR SELECT 
TO anon, authenticated 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
  OR user_id = auth.uid()
);

-- YouTube Connections: Add admin read access  
DROP POLICY IF EXISTS "Admins can view all youtube connections" ON youtube_connections;
CREATE POLICY "Admins can view all youtube connections"
ON youtube_connections FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
  OR user_id = auth.uid()
);

-- YouTube Memberships: Add admin read access
-- Note: youtube_memberships links to users via youtube_connections, not directly
DROP POLICY IF EXISTS "Admins can view all youtube memberships" ON youtube_memberships;
CREATE POLICY "Admins can view all youtube memberships"
ON youtube_memberships FOR SELECT
TO anon, authenticated  
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
  OR EXISTS (
    SELECT 1 FROM youtube_connections yc
    WHERE yc.user_id = auth.uid() 
    AND yc.youtube_channel_id = youtube_memberships.youtube_connection_id
  )
);

-- Discord Guilds: Add admin read access
DROP POLICY IF EXISTS "Admins can view all discord guilds" ON discord_guilds;
CREATE POLICY "Admins can view all discord guilds"
ON discord_guilds FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
  OR user_id = auth.uid()
);

-- User Devices: Add admin read access (for device analytics)
DROP POLICY IF EXISTS "Admins can view all user devices" ON user_devices;
CREATE POLICY "Admins can view all user devices"
ON user_devices FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
  OR user_id = auth.uid()
);

-- Membership Changes: Add admin read access (for analytics)
DROP POLICY IF EXISTS "Admins can view all membership changes" ON membership_changes;
CREATE POLICY "Admins can view all membership changes"
ON membership_changes FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);