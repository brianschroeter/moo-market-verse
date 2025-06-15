#!/bin/bash

# Sync production database with automatic password handling

set -euo pipefail

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Load environment variables
if [ -f "$PROJECT_ROOT/.env.secrets" ]; then
    set -a
    source "$PROJECT_ROOT/.env.secrets"
    set +a
fi

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🔄 Syncing production database to local..."

# Check if Supabase is running
if ! npx supabase status >/dev/null 2>&1; then
    echo "❌ Supabase is not running. Starting it now..."
    npx supabase start
else
    echo "✅ Supabase is already running"
fi

echo "🗑️  Resetting local database..."
npx supabase db reset

echo "📥 Dumping production database..."

# Extract database host and password from DATABASE_URL if available
if [ ! -z "${DATABASE_URL:-}" ]; then
    # Parse DATABASE_URL
    DB_PASSWORD=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/postgres:\([^@]*\)@.*/\1/p')
    DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
else
    # Use individual variables
    DB_PASSWORD="${DB_PASSWORD:-B445478e84Fknsd312s}"
    DB_HOST="db.${SUPABASE_PROJECT_REF:-dlmbqojnhjsecajxltzj}.supabase.co"
fi

# Create dump using Docker with environment variable for password
echo "Using password from .env.secrets..."
# Use the pooler connection which supports IPv4
POOLER_HOST="aws-0-us-east-2.pooler.supabase.com"
docker run --rm \
    -e PGPASSWORD="$DB_PASSWORD" \
    postgres:15 \
    pg_dump -h "$POOLER_HOST" -p 5432 -U postgres -d postgres \
    --no-owner --no-privileges --exclude-schema=supabase_functions \
    --exclude-schema=vault --schema=public --schema=auth --schema=storage \
    > temp_production_dump.sql

# Check if dump was successful
if [ $? -eq 0 ] && [ -s temp_production_dump.sql ]; then
    echo "✅ Database dump created successfully"
else
    echo "❌ Failed to create database dump"
    exit 1
fi

echo "📤 Importing production data..."

# Get the Supabase DB container name
DB_CONTAINER=$(docker ps --format "table {{.Names}}" | grep "supabase_db_" | head -1)

if [ -z "$DB_CONTAINER" ]; then
    echo "❌ Supabase DB container not found. Is Supabase running?"
    exit 1
fi

# Import the dump
docker cp temp_production_dump.sql "$DB_CONTAINER:/tmp/"
docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres -f /tmp/temp_production_dump.sql
docker exec "$DB_CONTAINER" rm /tmp/temp_production_dump.sql

# Clean up
rm -f temp_production_dump.sql

echo "🔍 Verifying imported data..."

# Check some key tables
docker exec "$DB_CONTAINER" psql -U postgres -d postgres -c "
SELECT 
    'Profiles' as table_name, COUNT(*) as count FROM profiles
UNION ALL
SELECT 
    'Discord Connections', COUNT(*) FROM discord_connections
UNION ALL
SELECT 
    'YouTube Connections', COUNT(*) FROM youtube_connections
UNION ALL
SELECT 
    'User Devices', COUNT(*) FROM user_devices
UNION ALL
SELECT 
    'Shopify Orders', COUNT(*) FROM shopify_orders
UNION ALL
SELECT 
    'Printful Orders', COUNT(*) FROM printful_orders
UNION ALL
SELECT 
    'Support Tickets', COUNT(*) FROM support_tickets
UNION ALL
SELECT 
    'Featured Products', COUNT(*) FROM featured_products
UNION ALL
SELECT 
    'Announcements', COUNT(*) FROM announcements
ORDER BY table_name;"

echo -e "\n${GREEN}✅ Production data synced successfully!${NC}"
echo "Access your local environment at:"
echo "  - Application: http://localhost:8082"
echo "  - Supabase Studio: http://127.0.0.1:54323"