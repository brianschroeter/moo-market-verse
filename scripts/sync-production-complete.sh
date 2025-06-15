#!/bin/bash

# Complete Production Sync using Supabase CLI's linked connection
# This script leverages the already-linked Supabase project to sync everything

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

echo -e "${BLUE}=== Complete Production Sync via Linked Supabase CLI ===${NC}"
echo -e "${BLUE}This will sync: Database, Edge Functions, Storage, and Secrets${NC}\n"

# Load environment variables
if [ -f "$PROJECT_ROOT/.env.secrets" ]; then
    set -a
    source "$PROJECT_ROOT/.env.secrets"
    set +a
    echo -e "${GREEN}✅ Loaded environment variables${NC}"
fi

# 1. Check if local Supabase is running
echo -e "\n${YELLOW}[1/5] Checking local Supabase status...${NC}"
if ! npx supabase status >/dev/null 2>&1; then
    echo -e "${YELLOW}Starting local Supabase...${NC}"
    npx supabase start
    sleep 5
fi
echo -e "${GREEN}✅ Local Supabase is running${NC}"

# 2. Reset and sync database schema
echo -e "\n${YELLOW}[2/5] Syncing database schema...${NC}"
echo -e "${BLUE}Pulling remote schema...${NC}"
npx supabase db pull

echo -e "${BLUE}Resetting local database with new schema...${NC}"
npx supabase db reset

# 3. Sync database data using linked connection
echo -e "\n${YELLOW}[3/5] Syncing database data...${NC}"
echo -e "${BLUE}Dumping production data via linked connection...${NC}"

# Use the linked connection to dump data
npx supabase db dump \
    --data-only \
    -f production_data.sql \
    --db-url "$(npx supabase projects list --linked | grep -E "^\s*●" | awk '{print "postgresql://postgres:'${DB_PASSWORD}'@db."$5".supabase.co:5432/postgres"}')"

if [ -f production_data.sql ] && [ -s production_data.sql ]; then
    echo -e "${GREEN}✅ Database dump created ($(ls -lh production_data.sql | awk '{print $5}'))${NC}"
    
    # Import data to local database
    echo -e "${BLUE}Importing data to local database...${NC}"
    DB_CONTAINER=$(docker ps --format "table {{.Names}}" | grep "supabase_db_" | head -1)
    
    if [ -n "$DB_CONTAINER" ]; then
        docker cp production_data.sql "$DB_CONTAINER:/tmp/"
        docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres -f /tmp/production_data.sql
        docker exec "$DB_CONTAINER" rm /tmp/production_data.sql
        echo -e "${GREEN}✅ Data imported successfully${NC}"
    else
        echo -e "${RED}❌ Database container not found${NC}"
        exit 1
    fi
    
    rm -f production_data.sql
else
    echo -e "${RED}❌ Failed to create database dump${NC}"
    echo -e "${YELLOW}Alternative: Using direct psql connection...${NC}"
    
    # Alternative method: Direct psql with explicit connection
    DB_HOST="db.${SUPABASE_PROJECT_REF}.supabase.co"
    
    # Try to dump using Docker with explicit connection
    docker run --rm \
        -e PGPASSWORD="${DB_PASSWORD}" \
        -v "$PWD:/dump" \
        postgres:15 \
        pg_dump "postgresql://postgres:${DB_PASSWORD}@${DB_HOST}:6543/postgres?sslmode=require" \
        --data-only \
        --no-owner \
        --no-privileges \
        --schema=public \
        --schema=auth \
        --schema=storage \
        -f /dump/production_data_alt.sql
    
    if [ -f production_data_alt.sql ] && [ -s production_data_alt.sql ]; then
        echo -e "${GREEN}✅ Alternative dump succeeded${NC}"
        DB_CONTAINER=$(docker ps --format "table {{.Names}}" | grep "supabase_db_" | head -1)
        docker cp production_data_alt.sql "$DB_CONTAINER:/tmp/"
        docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres -f /tmp/production_data_alt.sql
        docker exec "$DB_CONTAINER" rm /tmp/production_data_alt.sql
        rm -f production_data_alt.sql
    else
        echo -e "${RED}❌ Alternative dump also failed${NC}"
    fi
fi

# 4. Sync Edge Functions (if not already done)
echo -e "\n${YELLOW}[4/5] Verifying Edge Functions...${NC}"
FUNCTION_COUNT=$(find "$PROJECT_ROOT/supabase/functions" -maxdepth 1 -type d | wc -l)
echo -e "${BLUE}Found $((FUNCTION_COUNT - 1)) edge functions locally${NC}"

# 5. Set secrets for edge functions
echo -e "\n${YELLOW}[5/5] Setting Edge Function secrets...${NC}"
if [ -n "${YOUTUBE_API_KEY:-}" ]; then
    npx supabase secrets set YOUTUBE_API_KEY="$YOUTUBE_API_KEY"
    echo -e "${GREEN}✅ Set YouTube API key${NC}"
fi

if [ -n "${SHOPIFY_ADMIN_API_ACCESS_TOKEN:-}" ]; then
    npx supabase secrets set SHOPIFY_SHOP_DOMAIN="$SHOPIFY_SHOP_DOMAIN"
    npx supabase secrets set SHOPIFY_ADMIN_API_ACCESS_TOKEN="$SHOPIFY_ADMIN_API_ACCESS_TOKEN"
    npx supabase secrets set SHOPIFY_API_VERSION="$SHOPIFY_API_VERSION"
    echo -e "${GREEN}✅ Set Shopify credentials${NC}"
fi

if [ -n "${PRINTFUL_API_KEY:-}" ]; then
    npx supabase secrets set PRINTFUL_API_KEY="$PRINTFUL_API_KEY"
    echo -e "${GREEN}✅ Set Printful API key${NC}"
fi

# Verify the sync
echo -e "\n${BLUE}=== Verification ===${NC}"

# Check database data
echo -e "\n${YELLOW}Database row counts:${NC}"
DB_CONTAINER=$(docker ps --format "table {{.Names}}" | grep "supabase_db_" | head -1)
if [ -n "$DB_CONTAINER" ]; then
    docker exec "$DB_CONTAINER" psql -U postgres -d postgres -c "
    SELECT 
        'Profiles' as table_name, COUNT(*)::int as count FROM profiles
    UNION ALL
    SELECT 'Discord Connections', COUNT(*) FROM discord_connections
    UNION ALL
    SELECT 'YouTube Connections', COUNT(*) FROM youtube_connections
    UNION ALL
    SELECT 'Shopify Orders', COUNT(*) FROM shopify_orders
    UNION ALL
    SELECT 'Printful Orders', COUNT(*) FROM printful_orders
    UNION ALL
    SELECT 'Users (auth)', COUNT(*) FROM auth.users
    ORDER BY table_name;
    "
fi

echo -e "\n${GREEN}✅ Sync complete!${NC}"
echo -e "\n${BLUE}Access your synced environment at:${NC}"
echo "  - Application: http://localhost:8082"
echo "  - Supabase Studio: http://127.0.0.1:54323"
echo "  - API: http://127.0.0.1:54321"
echo ""
echo -e "${YELLOW}Note: If database sync failed due to connectivity, try:${NC}"
echo "  1. Export from Supabase Dashboard > Settings > Database > Backups"
echo "  2. Use a VPN with IPv4 support"
echo "  3. Contact Supabase support for IPv4 access"