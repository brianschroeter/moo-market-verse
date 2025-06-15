#!/bin/bash

# Test the get-schedule edge function in production
# This mimics what the frontend does

set -euo pipefail

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== Testing Production get-schedule Edge Function ===${NC}"

# Check for required environment variables
if [ -z "${SUPABASE_PROJECT_REF:-}" ]; then
    echo -e "${RED}❌ SUPABASE_PROJECT_REF not set${NC}"
    echo "Please set your production project reference ID"
    exit 1
fi

if [ -z "${VITE_SUPABASE_ANON_KEY:-}" ]; then
    echo -e "${RED}❌ VITE_SUPABASE_ANON_KEY not set${NC}"
    echo "Please set your production anon key"
    exit 1
fi

# Production URL
PROD_URL="https://${SUPABASE_PROJECT_REF}.supabase.co"

echo -e "${YELLOW}Testing get-schedule edge function...${NC}"
echo -e "URL: $PROD_URL"

# Configuration matching what the frontend sends
CONFIG='{
  "includeRecent": true,
  "daysAhead": 7,
  "hoursBack": 72
}'

# Call the get-schedule edge function
echo -e "${BLUE}Fetching schedule data...${NC}"

RESPONSE=$(curl -s -X POST \
  "$PROD_URL/functions/v1/get-schedule" \
  -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "$CONFIG")

# Pretty print the response
echo -e "\n${BLUE}Response:${NC}"
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"

# Check if we got data
if echo "$RESPONSE" | grep -q '"channels"'; then
    # Extract some stats
    CHANNEL_COUNT=$(echo "$RESPONSE" | python3 -c "import sys, json; data = json.load(sys.stdin); print(len(data.get('channels', [])))" 2>/dev/null || echo "0")
    STREAM_COUNT=$(echo "$RESPONSE" | python3 -c "import sys, json; data = json.load(sys.stdin); print(len(data.get('liveStreams', [])))" 2>/dev/null || echo "0")
    
    echo -e "\n${GREEN}✅ Schedule data retrieved successfully!${NC}"
    echo -e "Channels: $CHANNEL_COUNT"
    echo -e "Live Streams: $STREAM_COUNT"
    
    # Show stats if available
    if echo "$RESPONSE" | grep -q '"stats"'; then
        echo -e "\n${BLUE}Stats:${NC}"
        echo "$RESPONSE" | python3 -c "import sys, json; data = json.load(sys.stdin); stats = data.get('stats', {}); print(json.dumps(stats, indent=2))" 2>/dev/null
    fi
else
    echo -e "\n${RED}❌ Failed to retrieve schedule data${NC}"
fi