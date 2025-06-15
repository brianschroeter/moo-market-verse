# Clone Production Scripts

This directory contains scripts and utilities for cloning the production Supabase environment to create development or staging instances.

## Directory Structure

### `/utils/`
Contains utility scripts and helper functions used by the main cloning scripts:
- Database connection utilities
- Schema comparison tools
- Data transformation helpers
- Environment validation scripts
- Progress tracking and logging utilities

### `/templates/`
Contains template files and configurations:
- Environment variable templates (`.env.template`)
- Supabase configuration templates
- SQL script templates for data migration
- Edge function deployment templates
- RLS policy templates

## Cloning Process Overview

The production cloning process involves several steps:

1. **Schema Export**: Export the complete database schema from production
2. **Data Export**: Selectively export production data (with sensitive data handling)
3. **Environment Setup**: Create new Supabase project and configure settings
4. **Schema Import**: Apply schema to the new environment
5. **Data Import**: Import sanitized production data
6. **Edge Functions**: Deploy edge functions to the new environment
7. **Configuration**: Apply environment-specific configurations
8. **Validation**: Verify the clone is functioning correctly

## Usage

### Prerequisites
1. Supabase CLI installed (`npm install -g supabase`)
2. PostgreSQL client tools (`pg_dump`, `psql`)
3. `jq` for JSON processing
4. Docker running for local Supabase
5. Production database access credentials

### Scripts

1. **`01-prepare-environment.sh`**
   - Checks all prerequisites
   - Creates backup directories
   - Backs up existing local environment
   - Generates `.env.secrets` template

2. **`02-sync-database.sh`**
   - Dumps production database schema and data
   - Applies to local/target Supabase instance
   - Handles migrations and RLS policies

3. **`03-sync-edge-functions.sh`**
   - Backs up existing edge functions
   - Deploys all edge functions to target environment
   - Sets required secrets from `.env.secrets`
   - Validates function deployment
   - Includes progress indicators and error handling

4. **`04-sync-storage.sh`**
   - Syncs storage buckets and policies
   - Handles file migrations
   - Preserves bucket configurations

5. **`06-sync-data.sh`**
   - Syncs order data from external services (Shopify, Printful)
   - Supports both incremental and full sync modes
   - Handles API rate limits gracefully
   - Shows progress for long-running operations
   - Provides detailed summary of synced data
   - Options:
     - `--auto` or `--incremental`: Run incremental sync automatically
     - `--full`: Run full sync automatically
     - Interactive mode: Choose sync type via menu

6. **`07-verify-clone.sh`**
   - Verifies the cloned environment
   - Checks database connectivity
   - Validates edge functions
   - Tests API endpoints

### Step-by-Step Process

1. Run the preparation script:
   ```bash
   ./01-prepare-environment.sh
   ```

2. Fill in all required values in `.env.secrets`

3. Sync the database:
   ```bash
   ./02-sync-database.sh
   ```

4. Sync edge functions:
   ```bash
   ./03-sync-edge-functions.sh
   ```

5. Sync storage (if needed):
   ```bash
   ./04-sync-storage.sh
   ```

6. Sync order data:
   ```bash
   # For incremental sync (recommended)
   ./06-sync-data.sh --incremental
   
   # For full sync
   ./06-sync-data.sh --full
   
   # For interactive mode
   ./06-sync-data.sh
   ```

7. Verify the clone:
   ```bash
   ./07-verify-clone.sh
   ```

## Security Considerations

- Production credentials should never be committed to the repository
- Sensitive data (PII, tokens, etc.) must be sanitized during cloning
- Access to production cloning scripts should be restricted
- All clone operations should be logged for audit purposes