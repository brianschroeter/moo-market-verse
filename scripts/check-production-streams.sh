#!/bin/bash

# Check production stream data
echo "Checking production stream data..."

# Test the edge function
echo -e "\n1. Testing get-schedule edge function:"
curl -s "https://dlmbqojnhjsecajxltzj.supabase.co/functions/v1/get-schedule" \
  -H "Authorization: Bearer ${VITE_SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"startDate": "2024-01-01", "endDate": "2025-12-31"}' | jq '.'

echo -e "\n2. Available edge functions:"
curl -s "https://dlmbqojnhjsecajxltzj.supabase.co/functions/v1/" \
  -H "Authorization: Bearer ${VITE_SUPABASE_ANON_KEY}" 2>/dev/null || echo "Cannot list functions"

echo -e "\nNote: If you see 0 streams, the production database may need to be populated with YouTube data."
echo "This requires:"
echo "1. YouTube API keys to be set in Supabase secrets"
echo "2. Running the sync-youtube-streams function"
echo "3. Or manually importing stream data"