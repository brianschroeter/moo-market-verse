#!/bin/bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Production Sync Status Check${NC}"
echo -e "${BLUE}==============================${NC}"
echo ""

# Check if Supabase is running
echo -e "${BLUE}1. Local Supabase Status:${NC}"
if npx supabase status --local > /dev/null 2>&1; then
    echo -e "   ${GREEN}✅ Local Supabase is running${NC}"
    npx supabase status --local | grep -E "(API URL|GraphQL URL|DB URL|Studio URL|Inbucket URL)" | sed 's/^/   /'
else
    echo -e "   ${RED}❌ Local Supabase is not running${NC}"
    echo "   Run: npx supabase start"
fi

# Check database data
echo ""
echo -e "${BLUE}2. Database Sync Status:${NC}"
DB_CONTAINER=$(docker ps --format "table {{.Names}}" | grep "supabase_db_" | head -1)
if [ -n "$DB_CONTAINER" ]; then
    DB_OUTPUT=$(docker exec "$DB_CONTAINER" psql -U postgres -d postgres -t -c "
    SELECT 
        'Profiles' as table_name, COUNT(*) as count FROM public.profiles
    UNION ALL SELECT 
        'Discord Connections', COUNT(*) FROM public.discord_connections  
    UNION ALL SELECT 
        'YouTube Connections', COUNT(*) FROM public.youtube_connections
    UNION ALL SELECT 
        'Shopify Orders', COUNT(*) FROM public.shopify_orders
    UNION ALL SELECT
        'Printful Orders', COUNT(*) FROM public.printful_orders
    UNION ALL SELECT
        'User Devices', COUNT(*) FROM public.user_devices
    UNION ALL SELECT
        'Support Tickets', COUNT(*) FROM public.support_tickets
    UNION ALL SELECT
        'Announcements', COUNT(*) FROM public.announcements
    ORDER BY table_name;
    " 2>/dev/null)
    
    if [ -n "$DB_OUTPUT" ]; then
        echo "$DB_OUTPUT" | while read -r line; do
            TABLE=$(echo "$line" | awk -F'|' '{print $1}' | xargs)
            COUNT=$(echo "$line" | awk -F'|' '{print $2}' | xargs)
            if [ "$COUNT" -gt 0 ]; then
                echo -e "   ${GREEN}✅ $TABLE: $COUNT records${NC}"
            else
                echo -e "   ${YELLOW}⚠️  $TABLE: 0 records${NC}"
            fi
        done
    else
        echo -e "   ${RED}❌ Could not fetch database statistics${NC}"
    fi
else
    echo -e "   ${RED}❌ Database container not found${NC}"
fi

# Check edge functions
echo ""
echo -e "${BLUE}3. Edge Functions Status:${NC}"
FUNCTIONS_DIR="supabase/functions"
if [ -d "$FUNCTIONS_DIR" ]; then
    FUNCTION_COUNT=$(find "$FUNCTIONS_DIR" -maxdepth 1 -type d ! -name "_shared" ! -name "functions" | wc -l)
    echo -e "   ${GREEN}✅ $FUNCTION_COUNT edge functions found${NC}"
    
    # Check if functions are being served
    if curl -s http://localhost:54321/functions/v1/ > /dev/null 2>&1; then
        echo -e "   ${GREEN}✅ Edge functions server is running${NC}"
    else
        echo -e "   ${YELLOW}⚠️  Edge functions server not responding${NC}"
        echo "   Run: npx supabase functions serve"
    fi
else
    echo -e "   ${RED}❌ No edge functions directory found${NC}"
fi

# Check secrets
echo ""
echo -e "${BLUE}4. Secrets Status:${NC}"
if [ -f "scripts/production-secrets-template.sh" ]; then
    echo -e "   ${GREEN}✅ Secrets template exists${NC}"
    # Count how many secrets are in the template
    SECRET_COUNT=$(grep -c "=\"YOUR_VALUE_HERE\"" "scripts/production-secrets-template.sh" 2>/dev/null || echo "0")
    echo -e "   ${YELLOW}⚠️  $SECRET_COUNT secrets need to be configured${NC}"
else
    echo -e "   ${YELLOW}⚠️  No secrets template found${NC}"
    echo "   Run: ./scripts/sync-edge-functions.sh to generate template"
fi

# Check local secrets
LOCAL_SECRETS=$(npx supabase secrets list --local 2>/dev/null | grep -E "^\s+[A-Z_]+" | wc -l || echo "0")
if [ "$LOCAL_SECRETS" -gt 0 ]; then
    echo -e "   ${GREEN}✅ $LOCAL_SECRETS secrets configured locally${NC}"
else
    echo -e "   ${RED}❌ No local secrets configured${NC}"
fi

# Check storage buckets
echo ""
echo -e "${BLUE}5. Storage Buckets Status:${NC}"
if [ -n "$DB_CONTAINER" ]; then
    BUCKET_COUNT=$(docker exec "$DB_CONTAINER" psql -U postgres -d postgres -t -c "SELECT COUNT(*) FROM storage.buckets;" 2>/dev/null | xargs)
    if [ "$BUCKET_COUNT" -gt 0 ]; then
        echo -e "   ${GREEN}✅ $BUCKET_COUNT storage buckets configured${NC}"
        docker exec "$DB_CONTAINER" psql -U postgres -d postgres -t -c "SELECT id, public FROM storage.buckets ORDER BY id;" 2>/dev/null | while read -r line; do
            if [ -n "$line" ]; then
                BUCKET_ID=$(echo "$line" | awk -F'|' '{print $1}' | xargs)
                IS_PUBLIC=$(echo "$line" | awk -F'|' '{print $2}' | xargs)
                PUBLIC_STATUS=$([ "$IS_PUBLIC" = "t" ] && echo "public" || echo "private")
                echo "      - $BUCKET_ID ($PUBLIC_STATUS)"
            fi
        done
    else
        echo -e "   ${YELLOW}⚠️  No storage buckets found${NC}"
    fi
else
    echo -e "   ${RED}❌ Could not check storage buckets${NC}"
fi

# Summary
echo ""
echo -e "${BLUE}==============================${NC}"
echo -e "${BLUE}Summary:${NC}"
echo ""

# Provide actionable next steps
NEEDS_ACTION=false

if ! npx supabase status --local > /dev/null 2>&1; then
    echo -e "${YELLOW}1. Start Supabase:${NC} npx supabase start"
    NEEDS_ACTION=true
fi

if [ "$LOCAL_SECRETS" -eq 0 ] && [ -f "scripts/production-secrets-template.sh" ]; then
    echo -e "${YELLOW}2. Configure secrets:${NC} Fill in and run ./scripts/production-secrets-template.sh"
    NEEDS_ACTION=true
fi

if [ ! "$NEEDS_ACTION" = true ]; then
    echo -e "${GREEN}✅ Your local environment appears to be properly synced!${NC}"
    echo ""
    echo "You can run individual sync scripts if needed:"
    echo "  - Database: ./scripts/sync-production-db.sh"
    echo "  - Edge Functions: ./scripts/sync-edge-functions.sh"
    echo "  - Storage: ./scripts/sync-storage-buckets.sh"
    echo ""
    echo "Or run everything: ./scripts/sync-all-production.sh"
fi