#!/bin/bash

# Debug schedule slots issue

echo "Debugging schedule slots..."

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

# Check ALL schedule slots
echo -e "${YELLOW}1. Checking ALL schedule slots:${NC}"

ALL_SLOTS=$(curl -s -X GET \
  "$SUPABASE_URL/rest/v1/schedule_slots?select=*&order=youtube_channel_id,day_of_week" \
  -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
  -H "apikey: $VITE_SUPABASE_ANON_KEY")

echo "Total slots: $(echo "$ALL_SLOTS" | jq '. | length' 2>/dev/null || echo "0")"
echo "$ALL_SLOTS" | jq -r '.[] | "Channel: \(.youtube_channel_id), Days: \(.day_of_week), Time: \(.default_start_time_utc), Recurring: \(.is_recurring)"' 2>/dev/null | head -20

# Check YouTube channels
echo -e "\n${YELLOW}2. Checking YouTube channels:${NC}"

CHANNELS=$(curl -s -X GET \
  "$SUPABASE_URL/rest/v1/youtube_channels?select=id,channel_name&order=channel_name" \
  -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
  -H "apikey: $VITE_SUPABASE_ANON_KEY")

echo "$CHANNELS" | jq -r '.[] | "\(.id) - \(.channel_name)"' 2>/dev/null

# Check specific dates for this week
echo -e "\n${YELLOW}3. Checking streams for THIS week's Monday-Wednesday:${NC}"

# This week's dates
THIS_MONDAY="2025-06-16"
THIS_TUESDAY="2025-06-17"
THIS_WEDNESDAY="2025-06-18"

# Last week's dates (for prediction)
LAST_MONDAY="2025-06-09"
LAST_TUESDAY="2025-06-10"
LAST_WEDNESDAY="2025-06-11"

echo -e "\n${BLUE}This week:${NC}"
echo "Monday: $THIS_MONDAY (looking back to $LAST_MONDAY)"
echo "Tuesday: $THIS_TUESDAY (looking back to $LAST_TUESDAY)"
echo "Wednesday: $THIS_WEDNESDAY (looking back to $LAST_WEDNESDAY)"

# Check if we have the prediction data
echo -e "\n${YELLOW}4. Verifying we have last week's data for predictions:${NC}"

for DAY in "$LAST_MONDAY" "$LAST_TUESDAY" "$LAST_WEDNESDAY"; do
    echo -e "\n${BLUE}Streams on $DAY:${NC}"
    STREAMS=$(curl -s -X GET \
      "$SUPABASE_URL/rest/v1/live_streams?select=scheduled_start_time_utc,title,youtube_channel_id&scheduled_start_time_utc=gte.${DAY}T00:00:00Z&scheduled_start_time_utc=lt.${DAY}T23:59:59Z&order=scheduled_start_time_utc&limit=5" \
      -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
      -H "apikey: $VITE_SUPABASE_ANON_KEY")
    
    echo "$STREAMS" | jq -r '.[] | "\(.scheduled_start_time_utc | split("T")[1] | split("+")[0]) - \(.title | .[0:50])"' 2>/dev/null || echo "None"
done