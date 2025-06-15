# YouTube Schedule Sync Documentation

## Overview
The YouTube Schedule system syncs live stream data from configured YouTube channels to display on the `/schedule` page. It fetches both upcoming and past videos to show a complete weekly schedule.

## Manual Sync

### Via Script
```bash
./scripts/sync-youtube-schedule.sh
```

This script:
- Fetches videos from the past 7 days and upcoming 7 days
- Syncs data for all configured YouTube channels
- Updates the `live_streams` table with video information
- Matches videos to scheduled slots when possible

### Via API Call
```bash
curl -X POST \
  "http://localhost:54321/functions/v1/sync-youtube-streams" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "lookBackHours": 168,
    "lookAheadHours": 168,
    "maxResults": 50
  }'
```

## Automatic Sync Options

### Option 1: External Cron Service
Use a service like cron-job.org, EasyCron, or GitHub Actions to call the sync endpoint periodically:

```yaml
# Example GitHub Action (.github/workflows/youtube-sync.yml)
name: Sync YouTube Schedule
on:
  schedule:
    - cron: '0 */4 * * *' # Every 4 hours
  workflow_dispatch: # Manual trigger

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Sync YouTube Data
        run: |
          curl -X POST \
            "${{ secrets.SUPABASE_URL }}/functions/v1/sync-youtube-streams" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{
              "lookBackHours": 168,
              "lookAheadHours": 168
            }'
```

### Option 2: Supabase Scheduled Functions (Future)
Once Supabase supports scheduled functions natively, you can use the `cron-sync-youtube` edge function.

### Option 3: Self-Hosted Cron
On your server, add to crontab:
```bash
# Run every 4 hours
0 */4 * * * /path/to/moo-market-verse/scripts/sync-youtube-schedule.sh
```

## Edge Functions

### sync-youtube-streams
Main sync function that:
- Fetches video data from YouTube API
- Caches responses to minimize API quota usage
- Matches videos to schedule slots
- Updates the database

### cron-sync-youtube
Wrapper function for scheduled execution (requires external trigger)

## Database Tables

### youtube_channels
Configured YouTube channels to monitor

### schedule_slots
Defines when shows are expected (recurring weekly or specific dates)

### live_streams
Stores synced video data with status tracking

### youtube_api_cache
Caches API responses to reduce quota usage

### youtube_api_usage
Tracks API usage for quota monitoring

### cron_history
Logs sync execution history

## Configuration

### Local Development
For local development, the YouTube API key is temporarily hardcoded in the edge function. In production, use environment variables.

### API Quota Management
- Responses are cached for 15-60 minutes
- API usage is tracked in the database
- Maximum 50 results per channel per sync

## Troubleshooting

### No Videos Showing
1. Check if YouTube channels are configured in the database
2. Verify the sync ran successfully
3. Check for API quota issues

### Sync Failures
1. Check YouTube API key is valid
2. Verify network connectivity
3. Check error logs in cron_history table

### Local Development Issues
- Ensure Supabase is running: `npx supabase status`
- Check edge function logs: `npx supabase functions serve`
- Verify database has production data synced