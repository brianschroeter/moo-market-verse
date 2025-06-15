# Vercel Cron Jobs Setup for YouTube Sync

This project uses Vercel Cron Jobs to automatically sync YouTube schedules since pg_cron may not be available in production Supabase.

## Automatic Cron Jobs

The following cron jobs are configured in `vercel.json`:

1. **Full YouTube Sync** - Every 4 hours
   - Path: `/api/cron/youtube-sync`
   - Schedule: `0 */4 * * *` (at minute 0 of every 4th hour)
   - Syncs all channels, refreshes avatars, and updates today's schedule

2. **Active Streams Sync** - Every 5 minutes
   - Path: `/api/cron/youtube-sync-active`
   - Schedule: `*/5 * * * *` (every 5 minutes)
   - Quick sync of only live/upcoming streams for real-time updates

## Required Environment Variables

Add these to your Vercel project settings:

```bash
# Required for cron authentication
CRON_SECRET=<generate-a-random-secret>

# Required for Supabase access
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
VITE_PUBLIC_SUPABASE_URL=https://dlmbqojnhjsecajxltzj.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

## Setting Up Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add each variable above
4. Make sure they're available for Production environment

## Manual Sync Endpoint

You can also trigger a sync manually by making a POST request to:
```
https://your-domain.vercel.app/api/manual-youtube-sync
```

Example using curl:
```bash
curl -X POST https://discord.lolcow.co/api/manual-youtube-sync
```

## Monitoring Cron Jobs

1. Go to your Vercel project dashboard
2. Navigate to Functions → Cron Jobs
3. You'll see execution history and can manually trigger jobs

## Troubleshooting

- If crons aren't running, check that `CRON_SECRET` is set in Vercel
- Check function logs in Vercel dashboard for error messages
- Ensure all required environment variables are set
- Verify the edge functions are deployed to Supabase

## Notes

- Vercel Cron Jobs are only available on Pro/Enterprise plans
- Free tier includes 2 cron jobs with daily execution
- For more frequent execution (like every 5 minutes), you need a paid plan