# Production Environment Clone Plan

## Overview
This document outlines a comprehensive plan to create a 1:1 clone of the production Supabase environment for local development. The goal is to enable developers to test all features without worrying about missing data or edge functions.

## Current State Analysis

### Existing Resources
- **Database Sync**: `scripts/sync-production-db.sh` (all-or-nothing sync)
- **Order Sync**: Multiple scripts for Shopify/Printful orders
- **Edge Functions**: 31 functions in production, no sync mechanism
- **Environment**: Split between `.env` (prod) and `.env.local` (local overrides)

### Identified Gaps
1. No edge function download/sync scripts
2. No incremental database sync capability
3. No user connections/support ticket sync
4. Manual secret configuration required
5. No automated verification process

## Implementation Phases

### Phase 1: Preparation & Prerequisites
**Duration**: 1-2 hours
**Objective**: Ensure all requirements are met before starting the clone process

#### Steps:
1. **Backup Current Local Environment**
   ```bash
   # Backup local database
   npx supabase db dump -f local_backup_$(date +%Y%m%d_%H%M%S).sql
   
   # Backup local edge functions
   cp -r supabase/functions supabase/functions.backup
   
   # Backup environment files
   cp .env.local .env.local.backup
   ```

2. **Gather Required Credentials**
   - [ ] Supabase CLI login (`npx supabase login`)
   - [ ] Production project linked (`npx supabase link --project-ref dlmbqojnhjsecajxltzj`)
   - [ ] Production database password
   - [ ] Service role key (from Supabase dashboard)
   - [ ] API Keys: YouTube, Shopify, Printful

3. **Create Secrets Template**
   ```bash
   # Create .env.local.example with all required variables
   cat > .env.local.example << 'EOF'
   # Supabase Core (already in .env.local)
   VITE_PUBLIC_SUPABASE_URL=http://localhost:54321
   VITE_SUPABASE_ANON_KEY=<local-anon-key>
   
   # Service Keys (server-side only)
   SUPABASE_SERVICE_ROLE_KEY=<get-from-dashboard>
   SUPABASE_DB_PASSWORD=<get-from-dashboard>
   
   # Integration APIs
   YOUTUBE_API_KEY=<your-youtube-api-key>
   SHOPIFY_SHOP_DOMAIN=<your-shop>.myshopify.com
   SHOPIFY_ADMIN_API_ACCESS_TOKEN=<shopify-token>
   SHOPIFY_API_VERSION=2024-01
   PRINTFUL_API_KEY=<printful-api-key>
   
   # Development Mode
   VITE_DEVMODE=true
   EOF
   ```

### Phase 2: Core Infrastructure Sync
**Duration**: 2-3 hours
**Objective**: Sync database schema, data, and edge functions

#### Steps:

1. **Database Schema & Data Sync**
   ```bash
   # Use existing script for full database sync
   ./scripts/sync-production-db.sh
   
   # Alternative: Create selective sync (future improvement)
   ```

2. **Edge Functions Sync**
   Create new script `scripts/sync-edge-functions.sh`:
   ```bash
   #!/bin/bash
   set -e
   
   # List of all edge functions
   FUNCTIONS=(
     "verify-youtube"
     "sync-youtube-streams"
     "get-schedule"
     "get-youtube-channel-details"
     "shopify-orders"
     "printful-orders"
     "newsletter-subscribe"
     "upsert-device"
     # ... add all 31 functions
   )
   
   echo "Downloading edge functions from production..."
   PROJECT_REF="dlmbqojnhjsecajxltzj"
   
   for func in "${FUNCTIONS[@]}"; do
     echo "Downloading $func..."
     npx supabase functions download "$func" --project-ref "$PROJECT_REF"
   done
   
   echo "Edge functions sync complete!"
   ```

3. **Storage Buckets Sync**
   ```bash
   # List production buckets
   npx supabase storage ls --project-ref dlmbqojnhjsecajxltzj
   
   # Create matching buckets locally
   # (Manual process - document bucket names and policies)
   ```

### Phase 3: Integration Configuration
**Duration**: 1-2 hours
**Objective**: Configure all external integrations for local environment

#### Steps:

1. **Discord OAuth Configuration**
   - Update `supabase/config.toml` with local redirect URLs
   - Ensure Discord app allows `http://localhost:54321` redirects
   ```toml
   [auth.external.discord]
   enabled = true
   client_id = "your-discord-client-id"
   secret = "your-discord-client-secret"
   redirect_uri = "http://localhost:54321/auth/v1/callback"
   ```

2. **Environment Secrets Setup**
   ```bash
   # Set secrets for edge functions
   npx supabase secrets set YOUTUBE_API_KEY=<your-key>
   npx supabase secrets set SHOPIFY_SHOP_DOMAIN=<your-domain>
   npx supabase secrets set SHOPIFY_ADMIN_API_ACCESS_TOKEN=<your-token>
   npx supabase secrets set SHOPIFY_API_VERSION=2024-01
   npx supabase secrets set PRINTFUL_API_KEY=<your-key>
   ```

3. **Update Local Environment File**
   - Copy values from `.env.local.example` to `.env.local`
   - Add service role key for admin operations
   - Verify all required variables are set

### Phase 4: Data Population & Sync
**Duration**: 1-2 hours (depending on data volume)
**Objective**: Populate with production data for testing

#### Steps:

1. **E-commerce Orders Sync**
   ```bash
   # Sync Shopify orders
   node scripts/sync-all-shopify-orders.cjs
   
   # Sync Printful orders
   node scripts/sync-all-printful-orders.cjs
   ```

2. **User Connections Sync** (New script needed)
   ```sql
   -- Create script to sync discord_connections, youtube_connections
   -- This requires direct database access or new edge function
   ```

3. **Content Data Sync**
   - Featured products
   - Announcements
   - Support tickets
   - YouTube channel data

### Phase 5: Verification & Testing
**Duration**: 30 minutes
**Objective**: Ensure everything is working correctly

#### Verification Checklist:

1. **Core Functionality**
   - [ ] Local Supabase services running (`npx supabase start`)
   - [ ] Web app connects to local Supabase (`npm run dev`)
   - [ ] Development mode authentication works

2. **Edge Functions**
   ```bash
   # Test critical functions
   curl http://localhost:54321/functions/v1/get-schedule
   curl http://localhost:54321/functions/v1/newsletter-subscribe \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com"}'
   ```

3. **Integrations**
   - [ ] Discord OAuth flow completes
   - [ ] YouTube data fetches correctly
   - [ ] Shop displays products
   - [ ] Admin panel accessible

4. **Data Integrity**
   - [ ] User profiles exist
   - [ ] Orders display correctly
   - [ ] Connections show in admin
   - [ ] Schedule loads properly

## Automation Scripts

### Master Clone Script
Create `scripts/clone-production.sh`:
```bash
#!/bin/bash
set -e

echo "🚀 Starting production clone process..."

# Phase 1: Preparation
echo "📋 Phase 1: Preparation"
./scripts/clone-production/01-prepare-environment.sh

# Phase 2: Core Infrastructure
echo "🏗️ Phase 2: Core Infrastructure"
./scripts/clone-production/02-sync-database.sh
./scripts/clone-production/03-sync-edge-functions.sh
./scripts/clone-production/04-sync-storage.sh

# Phase 3: Integration Configuration
echo "🔧 Phase 3: Integration Configuration"
./scripts/clone-production/05-configure-integrations.sh

# Phase 4: Data Population
echo "📊 Phase 4: Data Population"
./scripts/clone-production/06-sync-data.sh

# Phase 5: Verification
echo "✅ Phase 5: Verification"
./scripts/clone-production/07-verify-clone.sh

echo "✨ Production clone complete!"
```

## Security Considerations

### Do's:
- Store service role key in `.env.local` only
- Use `.gitignore` to exclude sensitive files
- Rotate keys after team member changes
- Use read-only credentials where possible

### Don'ts:
- Never commit service role keys
- Don't share production credentials in chat
- Avoid using production APIs from local
- Don't sync sensitive user data unnecessarily

## Troubleshooting

### Common Issues:

1. **Database sync fails**
   - Check Supabase CLI login
   - Verify project is linked
   - Ensure Docker is running

2. **Edge functions not working**
   - Check secrets are set: `npx supabase secrets list`
   - Verify function deployment: `npx supabase functions list`
   - Check function logs: `npx supabase functions logs <function-name>`

3. **OAuth redirect errors**
   - Update Discord app settings
   - Check `supabase/config.toml` redirect URIs
   - Verify local Supabase URL matches config

4. **Missing data**
   - Run specific sync scripts
   - Check RLS policies
   - Verify service role key is set

### Rollback Procedure:

```bash
# Restore database
npx supabase db reset
psql -h localhost -p 54322 -U postgres -d postgres -f local_backup_TIMESTAMP.sql

# Restore edge functions
rm -rf supabase/functions
mv supabase/functions.backup supabase/functions

# Restore environment
mv .env.local.backup .env.local
```

## Future Improvements

1. **Incremental Sync**
   - Timestamp-based database sync
   - Selective table sync options
   - Conflict resolution strategies

2. **Data Anonymization**
   - Script to scramble PII
   - Test data generation
   - Subset of production data

3. **Automation**
   - GitHub Action for nightly sync
   - Docker compose setup
   - One-click clone script

4. **Monitoring**
   - Sync progress indicators
   - Error reporting
   - Performance metrics

## Maintenance

- Review and update edge function list monthly
- Rotate API keys quarterly
- Update sync scripts with schema changes
- Document any new environment variables

## Support

For issues with this clone process:
1. Check troubleshooting section
2. Review Supabase logs: `npx supabase logs`
3. Consult team lead for production credentials
4. File issues in project repository

---

Last Updated: December 2024
Version: 1.0