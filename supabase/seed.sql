-- Setup development user in local database
INSERT INTO auth.users (
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    confirmation_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    confirmation_token,
    email_change,
    email_change_confirm_status,
    banned_until,
    reauthentication_token,
    reauthentication_sent_at,
    is_sso_user,
    deleted_at,
    is_anonymous
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'dev@localhost',
    '',
    NOW(),
    NOW(),
    NOW(),
    NOW(),
    NOW(),
    '{"provider": "discord", "providers": ["discord"]}',
    '{"avatar_url": "https://via.placeholder.com/128", "email": "dev@localhost", "email_verified": true, "full_name": "Dev User", "name": "Dev User", "picture": "https://via.placeholder.com/128", "provider_id": "dev-discord-id", "sub": "dev-discord-id"}',
    false,
    '',
    '',
    0,
    NULL,
    '',
    NULL,
    false,
    NULL,
    false
) ON CONFLICT (id) DO NOTHING;

-- Create profile for dev user
INSERT INTO public.profiles (
    id,
    discord_id,
    discord_username,
    discord_avatar,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'dev-discord-id',
    'DevUser#0000',
    'https://via.placeholder.com/128',
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    discord_username = EXCLUDED.discord_username,
    discord_avatar = EXCLUDED.discord_avatar,
    updated_at = NOW();

-- Create admin role for dev user (for testing)
INSERT INTO public.user_roles (
    user_id,
    role
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'admin'
) ON CONFLICT (user_id, role) DO NOTHING;

-- Insert test YouTube channels for schedule demonstration
INSERT INTO youtube_channels (youtube_channel_id, channel_name, custom_display_name, avatar_url) VALUES 
('UCc1r7fWneTTONF-REy6H8Lw', 'LolCow Live', 'LolCow Live', 'https://yt3.ggpht.com/example1.jpg'),
('UCTest2Channel', 'Test Channel 2', 'Second Test Channel', 'https://yt3.ggpht.com/example2.jpg'),
('UCTest3Channel', 'Test Channel 3', 'Third Test Channel', 'https://yt3.ggpht.com/example3.jpg')
ON CONFLICT (youtube_channel_id) DO NOTHING;

-- Insert schedule slots for different days and times
WITH channel_data AS (
  SELECT 
    id,
    youtube_channel_id,
    channel_name
  FROM youtube_channels 
  WHERE youtube_channel_id IN ('UCc1r7fWneTTONF-REy6H8Lw', 'UCTest2Channel', 'UCTest3Channel')
)
INSERT INTO schedule_slots (youtube_channel_id, day_of_week, default_start_time_utc, is_recurring, fallback_title, notes)
SELECT 
  cd.id,
  ARRAY[1, 2, 3, 4, 5], -- Monday through Friday
  TIME '20:00:00', -- 8 PM UTC
  true,
  'Evening Show - ' || cd.channel_name,
  'Daily evening show Monday through Friday'
FROM channel_data cd
WHERE cd.youtube_channel_id = 'UCc1r7fWneTTONF-REy6H8Lw'

UNION ALL

SELECT 
  cd.id,
  ARRAY[1, 3, 5], -- Monday, Wednesday, Friday
  TIME '14:00:00', -- 2 PM UTC
  true,
  'Afternoon Talk - ' || cd.channel_name,
  'Afternoon discussions three times a week'
FROM channel_data cd
WHERE cd.youtube_channel_id = 'UCTest2Channel'

;

-- Insert some test live streams (simulating upcoming and live content)
WITH channel_data AS (
  SELECT id, youtube_channel_id, channel_name
  FROM youtube_channels 
  WHERE youtube_channel_id = 'UCc1r7fWneTTONF-REy6H8Lw'
  LIMIT 1
)
INSERT INTO live_streams (
  video_id, 
  youtube_channel_id, 
  title, 
  thumbnail_url, 
  stream_url, 
  scheduled_start_time_utc, 
  status,
  description,
  privacy_status,
  fetched_at
)
SELECT 
  'test_video_upcoming',
  cd.id,
  'Test Live Stream - ' || cd.channel_name,
  'https://i.ytimg.com/vi/test/maxresdefault.jpg',
  'https://www.youtube.com/watch?v=test_video_123',
  CURRENT_TIMESTAMP + INTERVAL '2 hours', -- 2 hours from now
  'upcoming',
  'This is a test upcoming live stream to demonstrate the schedule functionality.',
  'public',
  CURRENT_TIMESTAMP
FROM channel_data cd

UNION ALL

SELECT 
  'test_video_live',
  cd.id,
  'Live Now - ' || cd.channel_name,
  'https://i.ytimg.com/vi/test_live/maxresdefault.jpg',
  'https://www.youtube.com/watch?v=test_video_live',
  CURRENT_TIMESTAMP - INTERVAL '30 minutes', -- Started 30 minutes ago
  'live',
  'This is a test live stream that is currently broadcasting.',
  'public',
  CURRENT_TIMESTAMP
FROM channel_data cd

UNION ALL

SELECT 
  'test_video_completed',
  cd.id,
  'Previous Show - ' || cd.channel_name,
  'https://i.ytimg.com/vi/test_completed/maxresdefault.jpg',
  'https://www.youtube.com/watch?v=test_video_completed',
  CURRENT_TIMESTAMP - INTERVAL '2 hours', -- Started 2 hours ago
  'completed',
  'This is a completed stream from earlier today.',
  'public',
  CURRENT_TIMESTAMP
FROM channel_data cd;