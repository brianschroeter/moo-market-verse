#!/bin/bash

# Manual YouTube schedule sync script
# This script calls all three sync functions to ensure the schedule is up to date

echo "YouTube Schedule Manual Sync"
echo "============================"

# Get Supabase URL from environment or use production URL
SUPABASE_URL=${VITE_PUBLIC_SUPABASE_URL:-"https://dlmbqojnhjsecajxltzj.supabase.co"}

echo "Using Supabase URL: $SUPABASE_URL"
echo ""

# 1. Run full sync
echo "1. Running full YouTube sync (all channels, 10-day window)..."
curl -X POST "$SUPABASE_URL/functions/v1/sync-youtube-streams" \
  -H "Content-Type: application/json" \
  -d '{}' \
  --max-time 300

echo -e "\n"

# 2. Run active streams sync
echo "2. Running active streams sync (live/upcoming only)..."
curl -X POST "$SUPABASE_URL/functions/v1/sync-youtube-active" \
  -H "Content-Type: application/json" \
  -d '{}' \
  --max-time 60

echo -e "\n"

# 3. Run today's schedule sync
echo "3. Running today's schedule sync..."
curl -X POST "$SUPABASE_URL/functions/v1/sync-youtube-today" \
  -H "Content-Type: application/json" \
  -d '{}' \
  --max-time 180

echo -e "\n============================"
echo "Sync complete! Check https://discord.lolcow.co/schedule"