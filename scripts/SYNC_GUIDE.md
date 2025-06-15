# Production Sync Guide

This guide explains how to sync your local development environment with production data, edge functions, and storage.

## Quick Start

For a complete 1:1 sync of production:

```bash
./scripts/sync-all-production.sh
```

This will sync:
- ✅ Production database (with all data)
- ✅ Edge functions (31 functions)
- ✅ Storage bucket configurations
- ⚠️  Secrets (template generated, manual input required)
- ⚠️  Storage files (manual sync required)

## Individual Sync Scripts

### 1. Database Sync
```bash
./scripts/sync-production-db.sh
```
- Dumps production database (data only)
- Resets local database
- Imports production data
- Password: `B445478e84Fknsd312s` (when prompted)

### 2. Edge Functions & Secrets
```bash
./scripts/sync-edge-functions.sh
```
- Downloads all 31 edge functions from production
- Creates backup of existing functions
- Generates secrets template at `scripts/production-secrets-template.sh`
- Deploys functions to local Supabase

### 3. Storage Buckets
```bash
./scripts/sync-storage-buckets.sh
```
- Creates local storage bucket structure
- Sets up common buckets (avatars, public, private, products)
- Configures RLS policies
- Generates guide for syncing actual files

## Check Sync Status

To verify what's synced and what needs attention:

```bash
./scripts/check-sync-status.sh
```

This shows:
- Local Supabase status
- Database record counts
- Edge functions status
- Secrets configuration
- Storage buckets

## Setting Up Secrets

After running the edge functions sync, you'll have a template at `scripts/production-secrets-template.sh`.

### Required Secrets
The following secrets are typically required:

1. **E-commerce**
   - `SHOPIFY_SHOP_DOMAIN` - Your Shopify domain
   - `SHOPIFY_ADMIN_API_ACCESS_TOKEN` - Shopify Admin API token
   - `SHOPIFY_API_VERSION` - API version (e.g., "2024-01")
   - `PRINTFUL_API_KEY` - Printful API key

2. **External APIs**
   - `YOUTUBE_API_KEY` - YouTube Data API v3 key
   - `DISCORD_CLIENT_ID` - Discord OAuth app ID
   - `DISCORD_CLIENT_SECRET` - Discord OAuth secret

3. **Other Services**
   - `FINGERPRINT_API_KEY` - Device fingerprinting
   - Email service keys (SendGrid, Mailchimp, etc.)

### How to Get Secret Values

1. **From Production Supabase Dashboard**:
   ```
   https://app.supabase.com/project/dlmbqojnhjsecajxltzj/settings/vault
   ```

2. **From Your Team**:
   - Ask for API credentials
   - Check shared password manager
   - Review deployment documentation

3. **Apply Secrets Locally**:
   ```bash
   # Edit the template
   nano scripts/production-secrets-template.sh
   
   # Fill in values, then run:
   ./scripts/production-secrets-template.sh
   ```

## Storage Files Sync

The storage sync script only creates bucket structures. To sync actual files:

### Option 1: Manual Download/Upload
1. Go to production storage: https://app.supabase.com/project/dlmbqojnhjsecajxltzj/storage
2. Download needed files
3. Upload to local: http://localhost:54323/project/default/storage

### Option 2: API-based Sync
See `storage-buckets-backup/README.md` for code examples

## Troubleshooting

### "Supabase is not running"
```bash
npx supabase start
```

### "Not logged into Supabase CLI"
```bash
npx supabase login
```

### Database sync fails
- Check if Docker is running
- Verify database password is correct
- Ensure you have enough disk space

### Edge functions not working
- Check if secrets are configured
- Verify functions are deployed: `npx supabase functions list`
- Check logs: `npx supabase functions logs <function-name>`

### Can't access secret values
- Secret values are write-only in Supabase
- You need to get them from your team or original sources
- Check production deployment configs

## Best Practices

1. **Before Syncing**:
   - Commit any local changes
   - Back up important local data
   - Ensure Docker is running

2. **After Syncing**:
   - Run `./scripts/check-sync-status.sh` to verify
   - Test critical functions
   - Restart your dev server

3. **Security**:
   - Never commit secrets to git
   - Use `.env.local` for local secrets
   - Keep production data secure

## Common Use Cases

### Fresh Development Setup
```bash
# 1. Clone the repo
# 2. Install dependencies
npm install

# 3. Start Supabase
npx supabase start

# 4. Run full sync
./scripts/sync-all-production.sh

# 5. Configure secrets
# Edit and run: ./scripts/production-secrets-template.sh

# 6. Start development
npm run dev
```

### Update Only Database
```bash
./scripts/sync-production-db.sh
```

### Update Only Shopify Orders
```bash
./scripts/sync-shopify-orders.sh
# or
./scripts/sync-all-shopify-orders.cjs
```

### Update Only Edge Functions
```bash
./scripts/sync-edge-functions.sh
npx supabase functions deploy
```

## Notes

- Database sync includes all tables except system tables
- Edge functions sync includes all 31 production functions
- Storage sync creates bucket structure but not file contents
- Secrets must be manually configured for security
- Some scripts require production access (Supabase login)