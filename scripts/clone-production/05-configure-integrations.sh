#!/bin/bash

# Script 5: Configure integrations for local development
# This script updates integration configurations to work with local development

set -e  # Exit on error

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

echo "=== Configuring Integrations for Local Development ==="

# Function to execute SQL commands
execute_sql() {
    local sql="$1"
    echo "$sql" | psql -h localhost -p 54322 -U postgres -d postgres -q
}

# 1. Configure Discord OAuth for local development
echo "Configuring Discord OAuth..."
cat << 'EOF' > /tmp/configure_discord.sql
-- Update Discord OAuth redirect URLs for local development
UPDATE auth.flow_state
SET redirect_to = regexp_replace(redirect_to, 'https://[^/]+/', 'http://localhost:8080/')
WHERE redirect_to IS NOT NULL
AND redirect_to LIKE 'https://%';

-- Update any stored Discord callback URLs
UPDATE auth.identities
SET identity_data = jsonb_set(
    identity_data,
    '{redirect_uri}',
    '"http://localhost:8080/auth/callback"'::jsonb
)
WHERE provider = 'discord'
AND identity_data->>'redirect_uri' IS NOT NULL;

-- Clear any production-specific Discord tokens that might cause issues
UPDATE discord_connections
SET 
    access_token = NULL,
    refresh_token = NULL
WHERE access_token IS NOT NULL;

COMMIT;
EOF

execute_sql "$(cat /tmp/configure_discord.sql)"
echo "✓ Discord OAuth configured"

# 2. Configure API endpoint URLs
echo "Configuring API endpoints..."
cat << 'EOF' > /tmp/configure_endpoints.sql
-- Update any stored API endpoints to local equivalents
-- This is for any configuration that might be stored in the database

-- Update webhook URLs if they exist
UPDATE webhooks
SET url = regexp_replace(url, 'https://[^/]+/', 'http://localhost:54321/')
WHERE url LIKE 'https://%supabase%';

-- Update any stored Supabase URLs in settings
UPDATE settings
SET value = regexp_replace(value, 'https://[^.]+\.supabase\.co', 'http://localhost:54321')
WHERE value LIKE '%supabase.co%';

-- Update any production API URLs to local
UPDATE api_configurations
SET 
    base_url = CASE 
        WHEN base_url LIKE '%supabase.co%' THEN 'http://localhost:54321'
        WHEN base_url LIKE '%vercel.app%' THEN 'http://localhost:8080'
        ELSE base_url
    END
WHERE base_url IS NOT NULL;

COMMIT;
EOF

execute_sql "$(cat /tmp/configure_endpoints.sql)"
echo "✓ API endpoints configured"

# 3. Configure CORS settings
echo "Configuring CORS settings..."
cat << 'EOF' > /tmp/configure_cors.sql
-- Add local development origins to any CORS configuration tables
-- Note: Actual CORS is handled by edge functions, but some apps store allowed origins

-- If there's a cors_origins table, add local origins
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'cors_origins') THEN
        -- Remove production origins for local dev
        DELETE FROM cors_origins WHERE origin LIKE 'https://%';
        
        -- Add local development origins
        INSERT INTO cors_origins (origin, created_at) VALUES
            ('http://localhost:8080', NOW()),
            ('http://localhost:3000', NOW()),
            ('http://localhost:5173', NOW()),
            ('http://localhost:54321', NOW())
        ON CONFLICT (origin) DO NOTHING;
    END IF;
END $$;

COMMIT;
EOF

execute_sql "$(cat /tmp/configure_cors.sql)"
echo "✓ CORS settings configured"

# 4. Configure webhook endpoints
echo "Configuring webhooks..."
cat << 'EOF' > /tmp/configure_webhooks.sql
-- Update Shopify webhook URLs
UPDATE shopify_webhooks
SET 
    address = regexp_replace(address, 'https://[^/]+/', 'http://localhost:54321/functions/v1/'),
    updated_at = NOW()
WHERE address IS NOT NULL;

-- Update Printful webhook URLs
UPDATE printful_webhooks
SET 
    url = regexp_replace(url, 'https://[^/]+/', 'http://localhost:54321/functions/v1/'),
    updated_at = NOW()
WHERE url IS NOT NULL;

-- Disable production webhooks to avoid conflicts
UPDATE webhooks
SET 
    is_active = false,
    notes = COALESCE(notes || ' | ', '') || 'Disabled for local development'
WHERE is_active = true;

COMMIT;
EOF

execute_sql "$(cat /tmp/configure_webhooks.sql)"
echo "✓ Webhooks configured"

# 5. Clear integration caches
echo "Clearing integration caches..."
cat << 'EOF' > /tmp/clear_caches.sql
-- Clear any cached integration data that might cause issues

-- Clear YouTube API cache
TRUNCATE TABLE IF EXISTS youtube_api_cache CASCADE;

-- Clear Discord guild cache
UPDATE discord_guilds
SET 
    cached_data = NULL,
    last_sync = NULL
WHERE cached_data IS NOT NULL;

-- Clear any API response caches
TRUNCATE TABLE IF EXISTS api_response_cache CASCADE;

-- Reset rate limiting counters
TRUNCATE TABLE IF EXISTS rate_limit_counters CASCADE;

COMMIT;
EOF

execute_sql "$(cat /tmp/clear_caches.sql)"
echo "✓ Integration caches cleared"

# 6. Update environment-specific configurations
echo "Updating environment configurations..."
cat << 'EOF' > /tmp/configure_environment.sql
-- Set development environment flags
INSERT INTO settings (key, value, created_at, updated_at) VALUES
    ('environment', 'development', NOW(), NOW()),
    ('debug_mode', 'true', NOW(), NOW()),
    ('local_development', 'true', NOW(), NOW())
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value, updated_at = NOW();

-- Disable production-only features
UPDATE features
SET enabled = false
WHERE key IN ('production_monitoring', 'error_reporting', 'analytics');

COMMIT;
EOF

execute_sql "$(cat /tmp/configure_environment.sql)"
echo "✓ Environment configurations updated"

# 7. Create local development notices
echo "Adding development notices..."
cat << 'EOF' > /tmp/add_dev_notices.sql
-- Add a notice that this is a development environment
INSERT INTO announcements (
    title,
    content,
    type,
    active,
    created_at,
    updated_at
) VALUES (
    'Development Environment',
    'This is a local development copy of the production database. Data may be outdated or modified for testing.',
    'warning',
    true,
    NOW(),
    NOW()
);

COMMIT;
EOF

execute_sql "$(cat /tmp/add_dev_notices.sql)"
echo "✓ Development notices added"

# Clean up temporary files
rm -f /tmp/configure_*.sql /tmp/clear_caches.sql /tmp/add_dev_notices.sql

echo ""
echo "=== Integration Configuration Complete ==="
echo ""
echo "Local development configurations applied:"
echo "- Discord OAuth redirect URLs updated to localhost"
echo "- API endpoints pointed to local services"
echo "- CORS configured for local origins"
echo "- Webhooks updated and disabled"
echo "- Integration caches cleared"
echo "- Environment set to development mode"
echo ""
echo "Note: You may need to:"
echo "1. Update your Discord app's redirect URL to http://localhost:8080/auth/callback"
echo "2. Configure local ngrok if testing webhooks"
echo "3. Update any API keys in your .env file"
echo "4. Restart your local Supabase instance: npx supabase stop && npx supabase start"