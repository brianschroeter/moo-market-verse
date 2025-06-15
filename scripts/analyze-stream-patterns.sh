#!/bin/bash

# Analyze stream patterns to create schedule slots

echo "Analyzing stream patterns..."

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

# Get all streams from the last 2 weeks
echo -e "${YELLOW}Fetching stream patterns from the last 2 weeks...${NC}"

STREAMS=$(curl -s -X GET \
  "$SUPABASE_URL/rest/v1/live_streams?select=youtube_channel_id,scheduled_start_time_utc,title&scheduled_start_time_utc=gte.2025-06-01T00:00:00Z&order=youtube_channel_id,scheduled_start_time_utc" \
  -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
  -H "apikey: $VITE_SUPABASE_ANON_KEY")

# Process with jq to find patterns
echo -e "\n${BLUE}Stream patterns by channel and day:${NC}"

echo "$STREAMS" | jq -r '
  group_by(.youtube_channel_id) | 
  .[] | 
  {
    channel: .[0].youtube_channel_id,
    patterns: [
      .[] | 
      select(.scheduled_start_time_utc != null) |
      {
        day: (.scheduled_start_time_utc | split("T")[0] | strptime("%Y-%m-%d") | strftime("%A")),
        time: (.scheduled_start_time_utc | split("T")[1] | split(":")[0:2] | join(":")),
        date: (.scheduled_start_time_utc | split("T")[0])
      }
    ] |
    group_by(.day) |
    map({
      day: .[0].day,
      times: [.[].time] | unique | sort,
      count: length
    })
  } |
  "\(.channel):\n" + (
    .patterns | 
    map("  \(.day): \(.times | join(", ")) (\(.count) streams)") | 
    join("\n")
  )
' 2>/dev/null | head -50

echo -e "\n${YELLOW}Recommended schedule slots for Monday-Wednesday:${NC}"

# Focus on Monday-Wednesday patterns
echo "$STREAMS" | jq -r '
  [.[] | 
    select(.scheduled_start_time_utc != null) |
    {
      channel_id: .youtube_channel_id,
      day_name: (.scheduled_start_time_utc | split("T")[0] | strptime("%Y-%m-%d") | strftime("%A")),
      day_num: (.scheduled_start_time_utc | split("T")[0] | strptime("%Y-%m-%d") | strftime("%w") | tonumber),
      time: (.scheduled_start_time_utc | split("T")[1] | split(":")[0:2] | join(":") + ":00"),
      title: .title
    }
  ] |
  map(select(.day_num >= 1 and .day_num <= 3)) |
  group_by(.channel_id + .day_name + .time) |
  map({
    channel_id: .[0].channel_id,
    day: .[0].day_name,
    day_num: .[0].day_num,
    time: .[0].time,
    count: length,
    sample_title: .[0].title
  }) |
  sort_by(.day_num, .time) |
  .[] |
  "Channel: \(.channel_id)\n  Day: \(.day) (\(.day_num))\n  Time: \(.time)\n  Occurrences: \(.count)\n  Sample: \(.sample_title)\n"
' 2>/dev/null

echo -e "\n${RED}Note:${NC} No schedule slots are currently defined in the database."
echo "This is why the schedule shows TBD for Monday-Wednesday."
echo "Schedule slots need to be created through the admin panel."