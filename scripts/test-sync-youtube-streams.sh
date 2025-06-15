#!/bin/bash

# Test the sync-youtube-streams edge function with proper parameters

echo "Testing YouTube Streams Sync with recent videos..."

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

echo -e "${BLUE}=== Testing sync-youtube-streams Edge Function ===${NC}"
echo -e "URL: $SUPABASE_URL"

# Configuration to fetch last 10 days of content
CONFIG='{
  "forceRefresh": true,
  "lookBackHours": 240,
  "lookAheadHours": 48,
  "maxResults": 50
}'

echo -e "\n${YELLOW}Configuration:${NC}"
echo "$CONFIG" | jq '.'

echo -e "\n${BLUE}Calling sync-youtube-streams...${NC}"

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
    echo -e "\n${GREEN}✅ Sync completed successfully!${NC}"
    echo -e "Total videos synced: ${TOTAL_SYNCED}"
    
    # Show channel breakdown
    echo -e "\n${BLUE}Channel Breakdown:${NC}"
    echo "$RESPONSE" | jq -r '.channels[] | "\(.channel): \(.total) videos (\(.upcoming) upcoming, \(.recent) recent)"' 2>/dev/null
else
    echo -e "\n${RED}❌ Sync failed${NC}"
    ERROR=$(echo "$RESPONSE" | jq -r '.error' 2>/dev/null || echo "Unknown error")
    echo -e "Error: $ERROR"
fi

echo -e "\n${YELLOW}Note:${NC}"
echo "- lookBackHours: 240 (10 days) should fetch videos from the past week and a half"
echo "- If you're seeing only 4 videos, the YouTube API might be:"
echo "  1. Only returning live/upcoming streams (not regular videos)"
echo "  2. Filtering based on privacy settings"
echo "  3. Limited by the channel's actual content"

echo -e "\n${BLUE}To check what's in the database:${NC}"
echo "Run: psql \$DATABASE_URL -c \"SELECT video_id, title, status, scheduled_start_time_utc FROM live_streams ORDER BY scheduled_start_time_utc DESC LIMIT 20;\""