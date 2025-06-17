# Manual Database Sync Instructions

Due to network connectivity issues with the production database, here are alternative approaches:

## Option 1: Use Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/dlmbqojnhjsecajxltzj
2. Navigate to **Settings** > **Database** > **Backups**
3. Download a recent backup
4. Import it locally using:
   ```bash
   docker exec -i supabase_db_dlmbqojnhjsecajxltzj psql -U postgres -d postgres < backup.sql
   ```

## Option 2: Use Supabase CLI with Correct Host

The issue is that the database host `db.dlmbqojnhjsecajxltzj.supabase.co` is not accessible from your network.

Try using the pooler connection instead:
```bash
# Export with pooler connection
PGPASSWORD=B445478e84Fknsd312s pg_dump \
  -h aws-0-us-east-2.pooler.supabase.com \
  -p 5432 \
  -U postgres.dlmbqojnhjsecajxltzj \
  -d postgres \
  --data-only \
  --exclude-table=auth.* \
  > production_dump.sql
```

## Option 3: Use Supabase CLI Remote Dump

Try this command which might work better:
```bash
npx supabase db remote commit
```

## Current Status

- Local Supabase is running ✓
- Database schema is set up ✓
- Production credentials are available ✓
- Network connectivity issue is blocking direct connection ✗

## Next Steps

For now, let's proceed with:
1. Edge functions sync (should work as it doesn't require direct DB connection)
2. Setting up secrets
3. Once you have database access sorted, we can import the data

The application will work locally even without production data, just with empty tables.