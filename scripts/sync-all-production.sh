#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Full Production Sync - Moo Market Verse${NC}"
echo -e "${BLUE}==========================================${NC}"
echo ""
echo "This script will sync:"
echo "  ✓ Production database"
echo "  ✓ Edge functions and secrets"
echo "  ✓ Storage buckets"
echo ""
echo -e "${YELLOW}⚠️  WARNING: This will overwrite your local environment!${NC}"
echo -n "Continue? (y/N): "
read -r response
if [[ ! "$response" =~ ^[Yy]$ ]]; then
    echo "Sync cancelled."
    exit 0
fi

# Track overall success
SYNC_SUCCESS=true

# 1. Database Sync
echo ""
echo -e "${BLUE}📊 Step 1/3: Syncing Database...${NC}"
echo -e "${BLUE}--------------------------------${NC}"
if ./scripts/sync-production-db.sh; then
    echo -e "${GREEN}✅ Database sync completed${NC}"
else
    echo -e "${RED}❌ Database sync failed${NC}"
    SYNC_SUCCESS=false
fi

# 2. Edge Functions and Secrets Sync
echo ""
echo -e "${BLUE}⚡ Step 2/3: Syncing Edge Functions & Secrets...${NC}"
echo -e "${BLUE}-----------------------------------------------${NC}"
if ./scripts/sync-edge-functions.sh; then
    echo -e "${GREEN}✅ Edge functions sync completed${NC}"
else
    echo -e "${RED}❌ Edge functions sync failed${NC}"
    SYNC_SUCCESS=false
fi

# 3. Storage Buckets Sync
echo ""
echo -e "${BLUE}🪣 Step 3/3: Syncing Storage Buckets...${NC}"
echo -e "${BLUE}--------------------------------------${NC}"
if ./scripts/sync-storage-buckets.sh; then
    echo -e "${GREEN}✅ Storage buckets sync completed${NC}"
else
    echo -e "${RED}❌ Storage buckets sync failed${NC}"
    SYNC_SUCCESS=false
fi

# Final Summary
echo ""
echo -e "${BLUE}==========================================${NC}"
if [ "$SYNC_SUCCESS" = true ]; then
    echo -e "${GREEN}🎉 Full production sync completed successfully!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Restart your development server: npm run dev"
    echo "  2. Check that all services are running: npx supabase status"
    echo "  3. Verify data integrity in your local environment"
else
    echo -e "${RED}⚠️  Sync completed with errors. Please check the logs above.${NC}"
fi