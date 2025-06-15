#!/bin/bash

# Sync historical YouTube data to fix Monday-Wednesday schedule gaps

echo "Syncing 3 weeks of historical YouTube data..."

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

if [ -z "${VITE_SUPABASE_ANON_KEY:-}" ]; then
    echo -e "${RED}❌ VITE_SUPABASE_ANON_KEY not set${NC}"
    exit 1
fi

SUPABASE_URL="https://dlmbqojnhjsecajxltzj.supabase.co"

echo -e "${BLUE}=== Syncing Historical YouTube Data ===${NC}"
echo -e "URL: $SUPABASE_URL"

# Configuration to fetch 3 weeks of historical content
CONFIG='{
  "forceRefresh": true,
  "lookBackHours": 504,
  "lookAheadHours": 48,
  "maxResults": 50
}'

echo -e "\n${YELLOW}Configuration:${NC}"
echo "- lookBackHours: 504 (21 days / 3 weeks)"
echo "- This ensures we have data from at least 2 weeks ago"
echo "- The schedule needs data from exactly 7 days prior for predictions"

echo -e "\n${BLUE}Starting sync...${NC}"

RESPONSE=$(curl -s -X POST \
  "$SUPABASE_URL/functions/v1/sync-youtube-streams" \
  -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "$CONFIG")

# Pretty print the response
echo -e "\n${BLUE}Response:${NC}"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"

# Check if successful
if echo "$RESPONSE" | grep -q '"success":true'; then
    TOTAL_SYNCED=$(echo "$RESPONSE" | jq -r '.totalSynced' 2>/dev/null || echo "0")
    echo -e "\n${GREEN}✅ Historical sync completed successfully!${NC}"
    echo -e "Total videos synced: ${TOTAL_SYNCED}"
    
    # Show channel breakdown
    echo -e "\n${BLUE}Channel Breakdown:${NC}"
    echo "$RESPONSE" | jq -r '.channels[] | "\(.channel): \(.total) videos (\(.upcoming) upcoming, \(.recent) recent)"' 2>/dev/null
    
    echo -e "\n${GREEN}✅ Monday-Wednesday schedule should now show data based on previous weeks!${NC}"
else
    echo -e "\n${RED}❌ Sync failed${NC}"
    ERROR=$(echo "$RESPONSE" | jq -r '.error' 2>/dev/null || echo "Unknown error")
    echo -e "Error: $ERROR"
fi