#!/bin/bash

echo "Testing YouTube API in production..."

# Test if the edge function can access YouTube API
curl -X POST "https://dlmbqojnhjsecajxltzj.supabase.co/functions/v1/sync-youtube-streams" \
  -H "Authorization: Bearer ${VITE_SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "forceRefresh": true,
    "lookBackHours": 168,
    "channelIds": ["UChcQ2TIYiihd9B4H50eRVlQ"]
  }' | jq '.'

echo -e "\nIf you see 0 streams synced but videos were found, check:"
echo "1. The YouTube API key is set in Supabase Vault"
echo "2. The live_streams table exists and has proper permissions"
echo "3. The edge function logs for any errors"