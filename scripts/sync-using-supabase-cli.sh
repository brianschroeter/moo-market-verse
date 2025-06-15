#!/bin/bash

# Sync production database using Supabase CLI

set -euo pipefail

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== Production Database Sync via Supabase CLI ===${NC}"

# Load environment
if [ -f "$PROJECT_ROOT/.env.secrets" ]; then
    set -a
    source "$PROJECT_ROOT/.env.secrets"
    set +a
    echo -e "${GREEN}✅ Loaded environment variables${NC}"
fi

# Check if Supabase is running
if ! npx supabase status >/dev/null 2>&1; then
    echo -e "${YELLOW}Starting local Supabase...${NC}"
    npx supabase start
fi

# Reset local database
echo -e "${YELLOW}Resetting local database...${NC}"
npx supabase db reset

# Create a direct pg_dump command that we can pipe the password to
echo -e "${YELLOW}Dumping production database...${NC}"

# Use PGPASSWORD environment variable
export PGPASSWORD="${DB_PASSWORD:-B445478e84Fknsd312s}"

# Try direct connection first
DB_HOST="db.${SUPABASE_PROJECT_REF:-dlmbqojnhjsecajxltzj}.supabase.co"
echo -e "${BLUE}Connecting to: $DB_HOST${NC}"

# Create the dump file
if command -v pg_dump >/dev/null 2>&1; then
    echo -e "${BLUE}Using local pg_dump...${NC}"
    pg_dump -h "$DB_HOST" -p 5432 -U postgres -d postgres \
        --no-owner --no-privileges \
        --exclude-schema=supabase_functions \
        --exclude-schema=vault \
        --schema=public \
        --schema=auth \
        --schema=storage \
        -f production_dump.sql
else
    echo -e "${BLUE}Using Docker pg_dump...${NC}"
    docker run --rm \
        -e PGPASSWORD="$PGPASSWORD" \
        -v "$PWD:/dump" \
        postgres:15 \
        pg_dump -h "$DB_HOST" -p 5432 -U postgres -d postgres \
        --no-owner --no-privileges \
        --exclude-schema=supabase_functions \
        --exclude-schema=vault \
        --schema=public \
        --schema=auth \
        --schema=storage \
        -f /dump/production_dump.sql
fi

# Check if dump succeeded
if [ -f production_dump.sql ] && [ -s production_dump.sql ]; then
    echo -e "${GREEN}✅ Database dump created successfully${NC}"
    DUMP_SIZE=$(ls -lh production_dump.sql | awk '{print $5}')
    echo -e "${BLUE}Dump size: $DUMP_SIZE${NC}"
else
    echo -e "${RED}❌ Failed to create database dump${NC}"
    exit 1
fi

# Import to local database
echo -e "${YELLOW}Importing to local database...${NC}"

# Get local DB container
DB_CONTAINER=$(docker ps --format "table {{.Names}}" | grep "supabase_db_" | head -1)

if [ -z "$DB_CONTAINER" ]; then
    echo -e "${RED}❌ Local database container not found${NC}"
    exit 1
fi

# Import the dump
docker cp production_dump.sql "$DB_CONTAINER:/tmp/"
docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres -f /tmp/production_dump.sql
docker exec "$DB_CONTAINER" rm /tmp/production_dump.sql

# Clean up
rm -f production_dump.sql

# Verify the import
echo -e "${YELLOW}Verifying imported data...${NC}"

docker exec "$DB_CONTAINER" psql -U postgres -d postgres -c "
SELECT 
    t.tablename as table_name,
    COUNT(*)::int as row_count
FROM 
    pg_tables t
    LEFT JOIN LATERAL (
        SELECT COUNT(*) FROM public.\" || t.tablename || \"
    ) c ON true
WHERE 
    t.schemaname = 'public' 
    AND t.tablename NOT LIKE 'pg_%'
    AND t.tablename NOT LIKE 'supabase_%'
GROUP BY t.tablename
ORDER BY t.tablename;
" 2>/dev/null || docker exec "$DB_CONTAINER" psql -U postgres -d postgres -c "
SELECT 
    'Profiles' as table_name, COUNT(*)::int as count FROM profiles
UNION ALL
SELECT 'Users', COUNT(*) FROM auth.users
UNION ALL
SELECT 'Discord Connections', COUNT(*) FROM discord_connections
UNION ALL
SELECT 'YouTube Connections', COUNT(*) FROM youtube_connections
UNION ALL
SELECT 'Shopify Orders', COUNT(*) FROM shopify_orders
UNION ALL
SELECT 'Printful Orders', COUNT(*) FROM printful_orders
ORDER BY table_name;
"

echo -e "\n${GREEN}✅ Production database sync complete!${NC}"
echo -e "${BLUE}Access your local environment at:${NC}"
echo "  - Application: http://localhost:8082"
echo "  - Supabase Studio: http://127.0.0.1:54323"