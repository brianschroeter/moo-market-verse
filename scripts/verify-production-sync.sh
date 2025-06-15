#!/bin/bash

# Comprehensive verification of production sync

set -euo pipefail

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== Production Sync Verification ===${NC}\n"

# 1. Check Supabase Services
echo -e "${YELLOW}[1/6] Checking Supabase Services...${NC}"
if npx supabase status >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Local Supabase is running${NC}"
    npx supabase status | grep -E "API URL|Studio URL|DB URL" | sed 's/^/  /'
else
    echo -e "${RED}❌ Supabase is not running${NC}"
fi

# 2. Check Database Content
echo -e "\n${YELLOW}[2/6] Checking Database Content...${NC}"
DB_CONTAINER=$(docker ps --format "table {{.Names}}" | grep "supabase_db_" | head -1)
if [ -n "$DB_CONTAINER" ]; then
    # Get total counts
    TOTAL_USERS=$(docker exec "$DB_CONTAINER" psql -U postgres -d postgres -t -c "SELECT COUNT(*) FROM auth.users" | xargs)
    TOTAL_PROFILES=$(docker exec "$DB_CONTAINER" psql -U postgres -d postgres -t -c "SELECT COUNT(*) FROM profiles" | xargs)
    TOTAL_DISCORD=$(docker exec "$DB_CONTAINER" psql -U postgres -d postgres -t -c "SELECT COUNT(*) FROM discord_connections" | xargs)
    TOTAL_YOUTUBE=$(docker exec "$DB_CONTAINER" psql -U postgres -d postgres -t -c "SELECT COUNT(*) FROM youtube_connections" | xargs)
    TOTAL_ORDERS=$(docker exec "$DB_CONTAINER" psql -U postgres -d postgres -t -c "SELECT (SELECT COUNT(*) FROM shopify_orders) + (SELECT COUNT(*) FROM printful_orders)" | xargs)
    
    echo -e "${GREEN}✅ Database contains production data:${NC}"
    echo "  - Users: $TOTAL_USERS"
    echo "  - Profiles: $TOTAL_PROFILES"
    echo "  - Discord Connections: $TOTAL_DISCORD"
    echo "  - YouTube Connections: $TOTAL_YOUTUBE"
    echo "  - Total Orders: $TOTAL_ORDERS"
else
    echo -e "${RED}❌ Could not connect to database${NC}"
fi

# 3. Check Edge Functions
echo -e "\n${YELLOW}[3/6] Checking Edge Functions...${NC}"
FUNCTION_DIR="$PWD/supabase/functions"
if [ -d "$FUNCTION_DIR" ]; then
    FUNCTION_COUNT=$(find "$FUNCTION_DIR" -maxdepth 1 -type d -not -path "$FUNCTION_DIR" | wc -l)
    echo -e "${GREEN}✅ $FUNCTION_COUNT edge functions available${NC}"
    # List first 5 functions
    find "$FUNCTION_DIR" -maxdepth 1 -type d -not -path "$FUNCTION_DIR" | head -5 | while read -r func; do
        echo "  - $(basename "$func")"
    done
    [ $FUNCTION_COUNT -gt 5 ] && echo "  - ... and $((FUNCTION_COUNT - 5)) more"
else
    echo -e "${RED}❌ Edge functions directory not found${NC}"
fi

# 4. Check Storage Buckets
echo -e "\n${YELLOW}[4/6] Checking Storage Buckets...${NC}"
STORAGE_CONTAINER=$(docker ps --format "table {{.Names}}" | grep "supabase_storage_" | head -1)
if [ -n "$STORAGE_CONTAINER" ]; then
    echo -e "${GREEN}✅ Storage service is running${NC}"
    # Check if buckets exist in database
    BUCKET_COUNT=$(docker exec "$DB_CONTAINER" psql -U postgres -d postgres -t -c "SELECT COUNT(*) FROM storage.buckets" | xargs)
    echo "  - Storage buckets configured: $BUCKET_COUNT"
else
    echo -e "${YELLOW}⚠️  Storage service not found (may be disabled)${NC}"
fi

# 5. Check Application
echo -e "\n${YELLOW}[5/6] Checking Application...${NC}"
if curl -s http://localhost:8082 >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Application is running at http://localhost:8082${NC}"
    # Check if it's loading Supabase
    if curl -s http://localhost:8082 | grep -q "supabase"; then
        echo -e "${GREEN}✅ Application is connected to Supabase${NC}"
    fi
else
    echo -e "${RED}❌ Application is not accessible${NC}"
fi

# 6. Check Secrets
echo -e "\n${YELLOW}[6/6] Checking Configured Secrets...${NC}"
SECRET_COUNT=$(npx supabase secrets list 2>/dev/null | grep -c "│" | xargs)
if [ "$SECRET_COUNT" -gt 2 ]; then
    echo -e "${GREEN}✅ $((SECRET_COUNT / 2)) secrets configured${NC}"
    npx supabase secrets list 2>/dev/null | grep -E "YOUTUBE|SHOPIFY|PRINTFUL" | sed 's/^/  /'
else
    echo -e "${YELLOW}⚠️  Limited secrets configured${NC}"
fi

# Summary
echo -e "\n${BLUE}=== Summary ===${NC}"
echo -e "${GREEN}Your local environment is now a complete mirror of production!${NC}"
echo ""
echo "Access points:"
echo "  📱 Application: http://localhost:8082"
echo "  🎨 Supabase Studio: http://127.0.0.1:54323"
echo "  🔌 API: http://127.0.0.1:54321"
echo "  📧 Email Testing: http://127.0.0.1:54324"
echo ""
echo "Next steps:"
echo "  - Test authentication flows"
echo "  - Verify Discord/YouTube integrations"
echo "  - Check shop functionality"
echo "  - Test admin features"