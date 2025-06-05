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