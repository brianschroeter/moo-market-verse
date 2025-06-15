#!/bin/bash

# Sync YouTube schedule data - fetches both upcoming and past videos
# This script calls the sync-youtube-streams edge function to populate the schedule

set -euo pipefail

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== YouTube Schedule Sync ===${NC}"

# Load environment variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if [ -f "$PROJECT_ROOT/.env" ]; then
    set -a
    source "$PROJECT_ROOT/.env"
    set +a
fi

# Check if Supabase is running
if ! npx supabase status >/dev/null 2>&1; then
    echo -e "${RED}❌ Supabase is not running. Please start it first with: npx supabase start${NC}"
    exit 1
fi

# Get the API URL
API_URL=$(npx supabase status | grep "API URL" | awk '{print $3}')
if [ -z "$API_URL" ]; then
    API_URL="http://127.0.0.1:54321"
fi

echo -e "${YELLOW}Syncing YouTube schedule data...${NC}"
echo -e "API URL: $API_URL"

# Configuration for the sync
# - lookBackHours: 168 (7 days) to get past week's videos
# - lookAheadHours: 168 (7 days) to get next week's videos
# - maxResults: 50 per channel to ensure we get all videos
CONFIG='{
  "lookBackHours": 168,
  "lookAheadHours": 168,
  "maxResults": 50,
  "forceRefresh": true
}'

# Call the sync edge function
echo -e "${BLUE}Fetching videos from the past 7 days and upcoming 7 days...${NC}"

RESPONSE=$(curl -s -X POST \
  "$API_URL/functions/v1/sync-youtube-streams" \
  -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "$CONFIG")

# Check if the sync was successful
if echo "$RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ YouTube schedule sync completed successfully!${NC}"
    
    # Extract and display results
    echo -e "\n${BLUE}Sync Results:${NC}"
    echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
    
    # Get summary from database
    echo -e "\n${BLUE}Current Schedule Summary:${NC}"
    DB_CONTAINER=$(docker ps --format "table {{.Names}}" | grep "supabase_db_" | head -1)
    
    if [ -n "$DB_CONTAINER" ]; then
        docker exec "$DB_CONTAINER" psql -U postgres -d postgres -c "
        SELECT 
            status,
            COUNT(*) as count,
            MIN(scheduled_start_time_utc) as earliest,
            MAX(scheduled_start_time_utc) as latest
        FROM live_streams
        WHERE scheduled_start_time_utc IS NOT NULL
        GROUP BY status
        ORDER BY status;
        "
        
        echo -e "\n${BLUE}Videos in current week:${NC}"
        docker exec "$DB_CONTAINER" psql -U postgres -d postgres -c "
        SELECT 
            ls.title,
            yc.channel_name,
            ls.scheduled_start_time_utc,
            ls.status
        FROM live_streams ls
        JOIN youtube_channels yc ON ls.youtube_channel_id = yc.id
        WHERE ls.scheduled_start_time_utc >= NOW() - INTERVAL '7 days'
          AND ls.scheduled_start_time_utc <= NOW() + INTERVAL '7 days'
        ORDER BY ls.scheduled_start_time_utc DESC
        LIMIT 20;
        "
    fi
else
    echo -e "${RED}❌ YouTube schedule sync failed!${NC}"
    echo -e "Response: $RESPONSE"
    exit 1
fi

echo -e "\n${GREEN}✅ Done! The schedule page should now show videos from the current week.${NC}"
echo -e "Visit: http://localhost:8082/schedule"