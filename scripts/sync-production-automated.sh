#!/bin/bash

# Automated Production Sync - Non-interactive version
# Uses environment variables and direct connections to avoid password prompts

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

echo -e "${BLUE}=== Automated Production Sync ===${NC}"

# Load environment variables
if [ -f "$PROJECT_ROOT/.env.secrets" ]; then
    set -a
    source "$PROJECT_ROOT/.env.secrets"
    set +a
    echo -e "${GREEN}✅ Loaded environment variables${NC}"
else
    echo -e "${RED}❌ .env.secrets not found${NC}"
    exit 1
fi

# Verify required variables
if [ -z "${DB_PASSWORD:-}" ] || [ -z "${SUPABASE_PROJECT_REF:-}" ]; then
    echo -e "${RED}❌ Missing required environment variables${NC}"
    exit 1
fi

# 1. Check local Supabase
echo -e "\n${YELLOW}[1/4] Checking local Supabase...${NC}"
if ! npx supabase status >/dev/null 2>&1; then
    echo -e "${YELLOW}Starting local Supabase...${NC}"
    npx supabase start
    sleep 5
fi
echo -e "${GREEN}✅ Local Supabase is running${NC}"

# 2. Reset local database (commented out to preserve data)
echo -e "\n${YELLOW}[2/4] Checking local database...${NC}"
# npx supabase db reset --local
echo -e "${BLUE}Keeping existing database structure${NC}"

# 3. Direct database dump using pooler connection
echo -e "\n${YELLOW}[3/4] Dumping production database...${NC}"
echo -e "${BLUE}Using pooler connection to avoid IPv6 issues...${NC}"

# Use pooler endpoint which typically has better connectivity
POOLER_HOST="aws-0-us-east-2.pooler.supabase.com"
POOLER_PORT="6543"
DB_USER="postgres.${SUPABASE_PROJECT_REF}"

# Create connection string
CONN_STRING="postgresql://${DB_USER}:${DB_PASSWORD}@${POOLER_HOST}:${POOLER_PORT}/postgres?sslmode=require"

echo -e "${BLUE}Attempting database dump via Docker...${NC}"

# Use Docker to run pg_dump with the pooler connection
docker run --rm \
    -v "$PWD:/dump" \
    postgres:15 \
    pg_dump "$CONN_STRING" \
    --data-only \
    --no-owner \
    --no-privileges \
    --no-comments \
    --disable-triggers \
    --exclude-schema=supabase_functions \
    --exclude-schema=graphql \
    --exclude-schema=graphql_public \
    --exclude-schema=realtime \
    --exclude-schema=supabase_migrations \
    --exclude-schema=_analytics \
    --exclude-schema=_realtime \
    --schema=public \
    --schema=auth \
    --schema=storage \
    -f /dump/production_dump.sql

# Check if dump succeeded
if [ -f production_dump.sql ] && [ -s production_dump.sql ]; then
    DUMP_SIZE=$(ls -lh production_dump.sql | awk '{print $5}')
    echo -e "${GREEN}✅ Database dump created successfully (${DUMP_SIZE})${NC}"
    
    # Import to local database
    echo -e "${BLUE}Importing data to local database...${NC}"
    DB_CONTAINER=$(docker ps --format "table {{.Names}}" | grep "supabase_db_" | head -1)
    
    if [ -n "$DB_CONTAINER" ]; then
        docker cp production_dump.sql "$DB_CONTAINER:/tmp/"
        docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres -f /tmp/production_dump.sql 2>&1 | grep -v "WARNING\|NOTICE" || true
        docker exec "$DB_CONTAINER" rm /tmp/production_dump.sql
        echo -e "${GREEN}✅ Data imported successfully${NC}"
    else
        echo -e "${RED}❌ Local database container not found${NC}"
        exit 1
    fi
    
    rm -f production_dump.sql
else
    echo -e "${RED}❌ Database dump failed${NC}"
    echo -e "${YELLOW}This may be due to network connectivity issues.${NC}"
    echo -e "${YELLOW}Alternative options:${NC}"
    echo "  1. Use Supabase Dashboard to download a backup"
    echo "  2. Try from a different network/location"
    echo "  3. Use a VPN service"
    exit 1
fi

# 4. Verify the sync
echo -e "\n${YELLOW}[4/4] Verifying sync...${NC}"

# Check row counts
DB_CONTAINER=$(docker ps --format "table {{.Names}}" | grep "supabase_db_" | head -1)
if [ -n "$DB_CONTAINER" ]; then
    echo -e "\n${BLUE}Database Statistics:${NC}"
    docker exec "$DB_CONTAINER" psql -U postgres -d postgres -t -c "
    SELECT 
        rpad(table_name, 25) || '│ ' || lpad(count::text, 10) as result
    FROM (
        SELECT 'Profiles' as table_name, COUNT(*)::int as count FROM profiles
        UNION ALL
        SELECT 'Users (auth.users)', COUNT(*) FROM auth.users
        UNION ALL
        SELECT 'Discord Connections', COUNT(*) FROM discord_connections
        UNION ALL
        SELECT 'YouTube Connections', COUNT(*) FROM youtube_connections
        UNION ALL
        SELECT 'YouTube Memberships', COUNT(*) FROM youtube_memberships
        UNION ALL
        SELECT 'Shopify Orders', COUNT(*) FROM shopify_orders
        UNION ALL
        SELECT 'Printful Orders', COUNT(*) FROM printful_orders
        UNION ALL
        SELECT 'Support Tickets', COUNT(*) FROM support_tickets
        UNION ALL
        SELECT 'Featured Products', COUNT(*) FROM featured_products
        UNION ALL
        SELECT 'Announcements', COUNT(*) FROM announcements
    ) t
    ORDER BY table_name;
    " | sed 's/^[[:space:]]*/  /'
fi

# Check edge functions
echo -e "\n${BLUE}Edge Functions:${NC}"
FUNCTION_COUNT=$(find "$PROJECT_ROOT/supabase/functions" -maxdepth 1 -type d -not -path "$PROJECT_ROOT/supabase/functions" | wc -l)
echo -e "  ${GREEN}✅ ${FUNCTION_COUNT} edge functions available${NC}"

# Check secrets
echo -e "\n${BLUE}Edge Function Secrets:${NC}"
SECRETS=$(npx supabase secrets list 2>/dev/null | grep -E "YOUTUBE_API_KEY|SHOPIFY|PRINTFUL" | wc -l)
echo -e "  ${GREEN}✅ ${SECRETS} production secrets configured${NC}"

echo -e "\n${GREEN}✅ Production sync complete!${NC}"
echo -e "\n${BLUE}Access your environment:${NC}"
echo "  📱 Application: http://localhost:8082"
echo "  🎨 Supabase Studio: http://127.0.0.1:54323"
echo "  🔌 API Endpoint: http://127.0.0.1:54321"
echo "  📧 Email Testing: http://127.0.0.1:54324"