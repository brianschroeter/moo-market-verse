#!/bin/bash

# sync-database-cli.sh - Use Supabase CLI to sync database
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔄 Syncing production database using Supabase CLI...${NC}"

# Change to project root
cd "$PROJECT_ROOT"

# Reset local database
echo -e "${BLUE}🗑️  Resetting local database...${NC}"
npx supabase db reset

# Try to dump from linked project with password from .env.secrets
echo -e "${BLUE}📥 Dumping production database...${NC}"

# Get password from .env.secrets
DB_PASSWORD=$(grep "DB_PASSWORD=" "$SCRIPT_DIR/.env.secrets" | cut -d'=' -f2)

# Create dump using Supabase CLI
echo -e "${YELLOW}When prompted for password, it will be auto-filled${NC}"
echo "$DB_PASSWORD" | npx supabase db dump --data-only -f production_dump.sql

# Check if dump was created
if [ ! -f production_dump.sql ] || [ ! -s production_dump.sql ]; then
    echo -e "${RED}❌ Failed to create database dump${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Database dump created${NC}"

# Import to local database
echo -e "${BLUE}📤 Importing to local database...${NC}"

# Use Docker to import since psql might not be available
DB_CONTAINER=$(docker ps --format "table {{.Names}}" | grep "supabase_db_" | head -1)
if [ -z "$DB_CONTAINER" ]; then
    echo -e "${RED}❌ Supabase DB container not found${NC}"
    exit 1
fi

# Copy and execute dump
docker cp production_dump.sql "$DB_CONTAINER:/tmp/"
docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres -f /tmp/production_dump.sql > /dev/null 2>&1

# Clean up
rm -f production_dump.sql
docker exec "$DB_CONTAINER" rm -f /tmp/production_dump.sql

# Verify import
echo -e "${BLUE}🔍 Verifying imported data...${NC}"
docker exec "$DB_CONTAINER" psql -U postgres -d postgres -c "
SELECT 
    'Profiles' as table_name, COUNT(*) as count FROM profiles
UNION ALL
SELECT 'Discord Connections', COUNT(*) FROM discord_connections
UNION ALL
SELECT 'YouTube Connections', COUNT(*) FROM youtube_connections
UNION ALL
SELECT 'Shopify Orders', COUNT(*) FROM shopify_orders
UNION ALL
SELECT 'User Devices', COUNT(*) FROM user_devices
ORDER BY table_name;
"

echo -e "${GREEN}✅ Database sync completed!${NC}"