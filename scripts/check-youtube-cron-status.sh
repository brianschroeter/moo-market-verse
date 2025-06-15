#!/bin/bash

# Check YouTube sync cron status in production
# Usage: PRODUCTION_DB_URL="your-production-db-url" ./scripts/check-youtube-cron-status.sh

if [ -z "$PRODUCTION_DB_URL" ]; then
    echo "Error: PRODUCTION_DB_URL environment variable not set"
    echo "Usage: PRODUCTION_DB_URL='postgresql://...' $0"
    exit 1
fi

echo "Checking YouTube sync cron status..."
echo "=================================="

# Check if pg_cron is installed
echo -e "\n1. Checking pg_cron extension:"
psql "$PRODUCTION_DB_URL" -c "SELECT * FROM pg_extension WHERE extname = 'pg_cron';" 2>/dev/null || echo "Failed to connect or pg_cron not installed"

# Check scheduled jobs
echo -e "\n2. Scheduled cron jobs:"
psql "$PRODUCTION_DB_URL" -c "SELECT jobname, schedule, command FROM cron.job WHERE command LIKE '%youtube%' OR jobname LIKE '%youtube%';" 2>/dev/null || echo "No cron jobs found or cron schema doesn't exist"

# Check recent cron history
echo -e "\n3. Recent cron execution history (last 10):"
psql "$PRODUCTION_DB_URL" -c "SELECT jobname, status, start_time, end_time, return_message FROM cron.job_run_details WHERE jobname LIKE '%youtube%' ORDER BY start_time DESC LIMIT 10;" 2>/dev/null || echo "No execution history found"

# Check current "live" videos
echo -e "\n4. Current videos marked as 'live':"
psql "$PRODUCTION_DB_URL" -c "SELECT channel_id, video_id, title, scheduled_start_time_utc, actual_start_time_utc FROM live_streams WHERE status = 'live' ORDER BY actual_start_time_utc;" 2>/dev/null || echo "Failed to query live_streams"

# Check database configuration
echo -e "\n5. Database configuration variables:"
psql "$PRODUCTION_DB_URL" -c "SELECT name, setting FROM pg_settings WHERE name LIKE 'app.%';" 2>/dev/null || echo "No app settings found"

# Test edge function accessibility
echo -e "\n6. Testing edge function accessibility:"
SUPABASE_URL=$(echo "$PRODUCTION_DB_URL" | sed 's/postgresql:\/\/.*@\(.*\)\.supabase.co.*/https:\/\/\1.supabase.co/')
echo "Supabase URL: $SUPABASE_URL"
curl -s -o /dev/null -w "sync-youtube-streams: %{http_code}\n" "$SUPABASE_URL/functions/v1/sync-youtube-streams"
curl -s -o /dev/null -w "sync-youtube-active: %{http_code}\n" "$SUPABASE_URL/functions/v1/sync-youtube-active"
curl -s -o /dev/null -w "sync-youtube-today: %{http_code}\n" "$SUPABASE_URL/functions/v1/sync-youtube-today"

echo -e "\n=================================="
echo "Diagnosis complete!"