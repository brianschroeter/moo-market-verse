#!/bin/bash

# Trigger YouTube sync in production
# This calls the sync-youtube-streams edge function directly

set -euo pipefail

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== Production YouTube Schedule Sync ===${NC}"

# Check for required environment variables
if [ -z "${SUPABASE_PROJECT_REF:-}" ]; then
    echo -e "${RED}❌ SUPABASE_PROJECT_REF not set${NC}"
    echo "Please set your production project reference ID"
    exit 1
fi

if [ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
    echo -e "${RED}❌ SUPABASE_SERVICE_ROLE_KEY not set${NC}"
    echo "Please set your production service role key for admin access"
    exit 1
fi

# Production URL
PROD_URL="https://${SUPABASE_PROJECT_REF}.supabase.co"

echo -e "${YELLOW}Triggering YouTube sync in production...${NC}"
echo -e "URL: $PROD_URL"

# Configuration for comprehensive sync
CONFIG='{
  "lookBackHours": 168,
  "lookAheadHours": 168,
  "maxResults": 50,
  "forceRefresh": true
}'

# Call the sync edge function with service role key
echo -e "${BLUE}Fetching videos from the past 7 days and upcoming 7 days...${NC}"

RESPONSE=$(curl -s -X POST \
  "$PROD_URL/functions/v1/sync-youtube-streams" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d "$CONFIG")

# Check if the sync was successful
if echo "$RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ YouTube schedule sync completed successfully!${NC}"
    
    # Extract and display results
    echo -e "\n${BLUE}Sync Results:${NC}"
    echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
    
    echo -e "\n${GREEN}✅ Done! The production schedule should now be updated.${NC}"
    echo -e "Visit: https://lolcow.co/schedule"
else
    echo -e "${RED}❌ YouTube schedule sync failed!${NC}"
    echo -e "Response: $RESPONSE"
    exit 1
fi