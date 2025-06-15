# Three-Tier YouTube Sync Migration Instructions

## ✅ Edge Functions Deployed
All edge functions have been successfully deployed:
- `sync-youtube-active` - For real-time stream updates (5 min)
- `sync-youtube-today` - For today's schedule (hourly)
- `cron-sync-youtube` - Full sync (6 hours)
- `sync-youtube-streams` - Updated with new parameters

## 📋 Database Migration Required

The cron schedules need to be set up in your production database. Please run the following migration:

### Option 1: Via Supabase Dashboard
1. Go to https://supabase.com/dashboard/project/dlmbqojnhjsecajxltzj/sql/new
2. Copy and paste the contents of: `supabase/migrations/20250615103204_three_tier_youtube_sync.sql`
3. Click "Run"

### Option 2: Via Command Line (if you have the database password)
```bash
npx supabase db push
# Enter your database password when prompted
```

### Option 3: Direct SQL Connection
Connect to your database and run the migration file directly.

## 🔍 Verify Deployment

After running the migration, verify everything is working:

1. Check cron jobs are scheduled:
```sql
SELECT * FROM cron.job WHERE jobname LIKE 'youtube-%sync';
```

2. Check the monitoring view:
```sql
SELECT * FROM youtube_sync_jobs;
```

3. Monitor sync activity:
```sql
SELECT * FROM cron_history 
WHERE job_name IN ('youtube-active-sync', 'youtube-today-sync', 'youtube-full-sync')
ORDER BY run_at DESC
LIMIT 10;
```

## 📊 Expected Results

Once the migration is applied:
- **Active sync**: Will run every 5 minutes
- **Today sync**: Will run every hour at minute 0
- **Full sync**: Will run every 6 hours at minute 0

The schedule page will show:
- Live status updates within 5 minutes
- Stream end detection within 5 minutes
- Today's schedule always current

## 🚨 Important Note

The cron jobs will only work in production Supabase (not local development).
To test locally, you can manually call the edge functions.