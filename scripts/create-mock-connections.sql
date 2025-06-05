-- Create mock connection data for development testing
-- This script adds some fake connections for the dev user so you can test admin features

-- Insert some mock Discord connections
INSERT INTO discord_connections (user_id, connection_id, connection_type, connection_name, connection_verified, avatar_url, created_at, updated_at)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'mock-discord-1', 'discord', 'DevUser#0000', true, 'https://cdn.discordapp.com/embed/avatars/0.png', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000001', 'mock-discord-2', 'server', 'Test Server', true, null, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000001', 'mock-discord-3', 'guild', 'LolCow Guild', true, null, NOW(), NOW())
ON CONFLICT (user_id, connection_id, connection_type) DO NOTHING;

-- Insert some mock Discord guilds
INSERT INTO discord_guilds (user_id, guild_id, guild_name, created_at, updated_at)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'guild-123', 'Test Guild 1', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000001', 'guild-456', 'Test Guild 2', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000001', 'guild-789', 'LolCow Server', NOW(), NOW())
ON CONFLICT (user_id, guild_id) DO NOTHING;

-- Insert some mock YouTube connections
INSERT INTO youtube_connections (user_id, youtube_channel_id, youtube_channel_name, avatar_url, subscriber_count, is_verified, created_at, updated_at)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'mock-yt-1', 'Dev Channel', 'https://via.placeholder.com/88', 1000, true, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000001', 'mock-yt-2', 'Test YouTube', 'https://via.placeholder.com/88', 500, false, NOW(), NOW())
ON CONFLICT (user_id, youtube_channel_id) DO NOTHING;

-- Insert some mock YouTube memberships
INSERT INTO youtube_memberships (youtube_connection_id, channel_name, membership_level)
VALUES 
  ('mock-yt-1', 'LolCow Live', 'Member'),
  ('mock-yt-1', 'Another Channel', 'Sponsor'),
  ('mock-yt-2', 'Test Channel', 'Member')
ON CONFLICT (youtube_connection_id, channel_name) DO NOTHING;

-- Insert some mock user devices
INSERT INTO user_devices (user_id, fingerprint, user_agent, ip_address, last_seen_at, created_at, updated_at)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'mock-fingerprint-1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', '127.0.0.1'::inet, NOW(), NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000001', 'mock-fingerprint-2', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', '192.168.1.100'::inet, NOW(), NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Verify the data was inserted
SELECT 'Discord Connections:' as table_name, COUNT(*) as count FROM discord_connections WHERE user_id = '00000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'Discord Guilds:', COUNT(*) FROM discord_guilds WHERE user_id = '00000000-0000-0000-0000-000000000001'  
UNION ALL
SELECT 'YouTube Connections:', COUNT(*) FROM youtube_connections WHERE user_id = '00000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'YouTube Memberships:', COUNT(*) FROM youtube_memberships
UNION ALL  
SELECT 'User Devices:', COUNT(*) FROM user_devices WHERE user_id = '00000000-0000-0000-0000-000000000001';