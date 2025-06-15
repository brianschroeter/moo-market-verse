#!/bin/bash

# Debug schedule data to see why Monday-Wednesday shows TBD

echo "Debugging schedule data..."

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

# Get current date info
CURRENT_DATE=$(date -u +"%Y-%m-%d")
CURRENT_DAY=$(date -u +"%A")
CURRENT_WEEK_START=$(date -u -d "last Sunday" +"%Y-%m-%d")
LAST_MONDAY=$(date -u -d "last Monday" +"%Y-%m-%d")
LAST_TUESDAY=$(date -u -d "last Tuesday" +"%Y-%m-%d")
LAST_WEDNESDAY=$(date -u -d "last Wednesday" +"%Y-%m-%d")

echo -e "${BLUE}=== Debug Info ===${NC}"
echo "Current date: $CURRENT_DATE ($CURRENT_DAY)"
echo "Current week starts: $CURRENT_WEEK_START"
echo "Last Monday: $LAST_MONDAY"
echo "Last Tuesday: $LAST_TUESDAY"
echo "Last Wednesday: $LAST_WEDNESDAY"

# Check schedule slots for Monday-Wednesday
echo -e "\n${YELLOW}1. Checking schedule slots for Monday-Wednesday:${NC}"

SCHEDULE_SLOTS=$(curl -s -X GET \
  "$SUPABASE_URL/rest/v1/schedule_slots?select=*&or=(day_of_week.cs.{1},day_of_week.cs.{2},day_of_week.cs.{3})&order=default_start_time_utc" \
  -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
  -H "apikey: $VITE_SUPABASE_ANON_KEY")

echo "$SCHEDULE_SLOTS" | jq -r '.[] | "Channel: \(.youtube_channel_id), Days: \(.day_of_week), Time: \(.default_start_time_utc), Title: \(.fallback_title)"' 2>/dev/null || echo "No slots found"

# Check streams from last Monday-Wednesday
echo -e "\n${YELLOW}2. Checking streams from last Monday ($LAST_MONDAY):${NC}"

MONDAY_STREAMS=$(curl -s -X GET \
  "$SUPABASE_URL/rest/v1/live_streams?select=video_id,title,scheduled_start_time_utc,youtube_channel_id&scheduled_start_time_utc=gte.${LAST_MONDAY}T00:00:00Z&scheduled_start_time_utc=lt.${LAST_MONDAY}T23:59:59Z&order=scheduled_start_time_utc" \
  -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
  -H "apikey: $VITE_SUPABASE_ANON_KEY")

echo "$MONDAY_STREAMS" | jq -r '.[] | "\(.scheduled_start_time_utc) - \(.title)"' 2>/dev/null || echo "No Monday streams"

echo -e "\n${YELLOW}3. Checking streams from last Tuesday ($LAST_TUESDAY):${NC}"

TUESDAY_STREAMS=$(curl -s -X GET \
  "$SUPABASE_URL/rest/v1/live_streams?select=video_id,title,scheduled_start_time_utc,youtube_channel_id&scheduled_start_time_utc=gte.${LAST_TUESDAY}T00:00:00Z&scheduled_start_time_utc=lt.${LAST_TUESDAY}T23:59:59Z&order=scheduled_start_time_utc" \
  -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
  -H "apikey: $VITE_SUPABASE_ANON_KEY")

echo "$TUESDAY_STREAMS" | jq -r '.[] | "\(.scheduled_start_time_utc) - \(.title)"' 2>/dev/null || echo "No Tuesday streams"

echo -e "\n${YELLOW}4. Checking streams from last Wednesday ($LAST_WEDNESDAY):${NC}"

WEDNESDAY_STREAMS=$(curl -s -X GET \
  "$SUPABASE_URL/rest/v1/live_streams?select=video_id,title,scheduled_start_time_utc,youtube_channel_id&scheduled_start_time_utc=gte.${LAST_WEDNESDAY}T00:00:00Z&scheduled_start_time_utc=lt.${LAST_WEDNESDAY}T23:59:59Z&order=scheduled_start_time_utc" \
  -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
  -H "apikey: $VITE_SUPABASE_ANON_KEY")

echo "$WEDNESDAY_STREAMS" | jq -r '.[] | "\(.scheduled_start_time_utc) - \(.title)"' 2>/dev/null || echo "No Wednesday streams"

# Call get-schedule to see what it returns
echo -e "\n${YELLOW}5. Calling get-schedule edge function:${NC}"

SCHEDULE_RESPONSE=$(curl -s -X POST \
  "$SUPABASE_URL/functions/v1/get-schedule" \
  -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "includeRecent": true,
    "daysAhead": 7,
    "hoursBack": 168
  }')

echo "Total streams returned: $(echo "$SCHEDULE_RESPONSE" | jq '.liveStreams | length' 2>/dev/null || echo "0")"
echo "Date range of streams:"
echo "$SCHEDULE_RESPONSE" | jq -r '.liveStreams[] | .scheduled_start_time_utc' 2>/dev/null | sort | head -10

echo -e "\n${RED}Issue Analysis:${NC}"
echo "- The schedule looks back exactly 7 days from each weekday"
echo "- For Monday June 10: needs data from Monday June 3"
echo "- For Tuesday June 11: needs data from Tuesday June 4"  
echo "- For Wednesday June 12: needs data from Wednesday June 5"