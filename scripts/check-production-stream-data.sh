#!/bin/bash

# Check what stream data we have in production

echo "Checking production stream data coverage..."

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

echo -e "${BLUE}=== Checking Stream Data Coverage ===${NC}"

# First, let's see what date range of streams we have
echo -e "\n${YELLOW}1. Checking date range of available streams:${NC}"

STREAM_STATS=$(curl -s -X POST \
  "$SUPABASE_URL/rest/v1/rpc/get_stream_date_stats" \
  -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "apikey: $VITE_SUPABASE_ANON_KEY" \
  -d '{}' 2>/dev/null || echo "null")

if [ "$STREAM_STATS" != "null" ] && [ -n "$STREAM_STATS" ]; then
    echo "$STREAM_STATS" | jq '.' 2>/dev/null || echo "Failed to parse stream stats"
else
    echo "No stream stats available via RPC, trying direct query..."
fi

# Try a different approach - get recent streams
echo -e "\n${YELLOW}2. Fetching recent streams to check data coverage:${NC}"

RECENT_STREAMS=$(curl -s -X GET \
  "$SUPABASE_URL/rest/v1/live_streams?select=video_id,title,scheduled_start_time_utc,youtube_channel_id&order=scheduled_start_time_utc.desc&limit=100" \
  -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
  -H "apikey: $VITE_SUPABASE_ANON_KEY" \
  -H "Range: 0-99")

if [ -n "$RECENT_STREAMS" ] && [ "$RECENT_STREAMS" != "[]" ]; then
    echo -e "${GREEN}Found streams. Analyzing date coverage...${NC}"
    
    # Get unique dates
    echo "$RECENT_STREAMS" | jq -r '.[].scheduled_start_time_utc' | sort -u | head -20
    
    # Count by day of week
    echo -e "\n${YELLOW}3. Streams by day of week:${NC}"
    echo "$RECENT_STREAMS" | jq -r '.[].scheduled_start_time_utc' | \
        while read -r datetime; do
            if [ -n "$datetime" ] && [ "$datetime" != "null" ]; then
                date -d "$datetime" "+%A" 2>/dev/null || echo "Invalid date: $datetime"
            fi
        done | sort | uniq -c | sort -k2
    
    # Show oldest and newest
    OLDEST=$(echo "$RECENT_STREAMS" | jq -r '.[].scheduled_start_time_utc' | grep -v null | sort | head -1)
    NEWEST=$(echo "$RECENT_STREAMS" | jq -r '.[].scheduled_start_time_utc' | grep -v null | sort | tail -1)
    
    echo -e "\n${BLUE}Date Range:${NC}"
    echo "Oldest: $OLDEST"
    echo "Newest: $NEWEST"
else
    echo -e "${RED}❌ No streams found or failed to fetch${NC}"
fi

# Check if we need to run sync
echo -e "\n${YELLOW}4. Recommendations:${NC}"
echo "- If you see no Monday-Wednesday data, we need to sync with a longer lookback period"
echo "- The frontend looks for streams exactly 7 days ago for 'predicted' times"
echo "- We may need to sync with 14+ days lookback to ensure full coverage"