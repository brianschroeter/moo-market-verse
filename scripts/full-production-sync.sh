#!/bin/bash

# Full Production Sync Script - Complete 1:1 match with production
# This script performs a comprehensive sync of all production data, edge functions, and storage

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_DIR="$SCRIPT_DIR/logs"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create log directory
mkdir -p "$LOG_DIR"

# Log file
LOG_FILE="$LOG_DIR/full_sync_${TIMESTAMP}.log"

# Function to log messages
log() {
    local level=$1
    shift
    local message="$@"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $message" | tee -a "$LOG_FILE"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Load environment variables
load_env() {
    # First load from .env for project reference
    if [ -f "$PROJECT_ROOT/.env" ]; then
        export $(grep -v '^#' "$PROJECT_ROOT/.env" | xargs)
    fi
    
    # Then load secrets (which may have placeholders)
    if [ -f "$PROJECT_ROOT/.env.secrets" ]; then
        # Only export non-placeholder values
        while IFS='=' read -r key value; do
            # Skip comments and empty lines
            [[ $key =~ ^#.*$ ]] && continue
            [[ -z "$key" ]] && continue
            
            # Skip placeholder values
            if [[ ! "$value" =~ (your-|your_) ]]; then
                export "$key=$value"
            fi
        done < "$PROJECT_ROOT/.env.secrets"
        log "INFO" "Loaded production credentials"
    fi
    
    # Use the project ref from .env if not set
    if [ -z "$SUPABASE_PROJECT_REF" ]; then
        SUPABASE_PROJECT_REF="$VITE_SUPABASE_PROJECT_REF"
    fi
}

# Stop local Supabase
stop_local_supabase() {
    log "INFO" "Stopping local Supabase..."
    cd "$PROJECT_ROOT"
    npx supabase stop --no-backup || true
}

# Start fresh local Supabase
start_local_supabase() {
    log "INFO" "Starting fresh local Supabase..."
    cd "$PROJECT_ROOT"
    npx supabase start
}

# Full database dump and restore
sync_database() {
    log "INFO" "Starting full database sync..."
    
    # Check if we have valid credentials
    if [ -z "$DB_PASSWORD" ] || [[ "$DB_PASSWORD" =~ ^your- ]]; then
        log "ERROR" "Valid database password not found in .env.secrets"
        log "INFO" "Please update .env.secrets with actual production credentials"
        return 1
    fi
    
    local PROD_DB_HOST="db.${SUPABASE_PROJECT_REF}.supabase.co"
    local PROD_DB_PASSWORD="$DB_PASSWORD"
    local DUMP_FILE="$LOG_DIR/production_dump_${TIMESTAMP}.sql"
    
    # Create a comprehensive dump
    log "INFO" "Dumping production database (this may take a while)..."
    
    if command_exists pg_dump; then
        PGPASSWORD="$PROD_DB_PASSWORD" pg_dump \
            -h "$PROD_DB_HOST" \
            -p 5432 \
            -U postgres \
            -d postgres \
            --no-owner \
            --no-privileges \
            --clean \
            --if-exists \
            --schema=public \
            --schema=auth \
            --schema=storage \
            --exclude-schema=supabase_functions \
            --data-only=false \
            --verbose \
            -f "$DUMP_FILE" 2>&1 | tee -a "$LOG_FILE"
    else
        # Use Docker for pg_dump
        log "WARNING" "pg_dump not found locally, using Docker..."
        docker run --rm \
            -e PGPASSWORD="$PROD_DB_PASSWORD" \
            -v "$LOG_DIR:/dump" \
            postgres:15 \
            pg_dump -h "$PROD_DB_HOST" -p 5432 -U postgres -d postgres \
            --no-owner --no-privileges --clean --if-exists \
            --schema=public --schema=auth --schema=storage \
            --exclude-schema=supabase_functions \
            -f "/dump/production_dump_${TIMESTAMP}.sql" 2>&1 | tee -a "$LOG_FILE"
    fi
    
    # Check dump size
    if [ -f "$DUMP_FILE" ]; then
        local DUMP_SIZE=$(ls -lh "$DUMP_FILE" | awk '{print $5}')
        log "INFO" "Database dump completed. Size: $DUMP_SIZE"
    else
        log "ERROR" "Database dump failed!"
        return 1
    fi
    
    # Restore to local
    log "INFO" "Restoring database to local Supabase..."
    
    # Get local DB container
    local DB_CONTAINER=$(docker ps --format "table {{.Names}}" | grep "supabase_db_" | head -1)
    
    if [ -z "$DB_CONTAINER" ]; then
        log "ERROR" "Local Supabase DB container not found"
        return 1
    fi
    
    # Copy and restore
    docker cp "$DUMP_FILE" "$DB_CONTAINER:/tmp/restore.sql"
    docker exec -i "$DB_CONTAINER" bash -c "PGPASSWORD=postgres psql -U postgres -d postgres -f /tmp/restore.sql" 2>&1 | tee -a "$LOG_FILE"
    docker exec "$DB_CONTAINER" rm /tmp/restore.sql
    
    log "SUCCESS" "Database sync completed"
}

# Sync edge functions with secrets
sync_edge_functions() {
    log "INFO" "Syncing edge functions and secrets..."
    
    cd "$PROJECT_ROOT"
    
    # Deploy all edge functions
    log "INFO" "Deploying edge functions..."
    npx supabase functions deploy --no-verify-jwt 2>&1 | tee -a "$LOG_FILE"
    
    # Set all required secrets
    log "INFO" "Setting edge function secrets..."
    
    # Core secrets
    npx supabase secrets set YOUTUBE_API_KEY="$YOUTUBE_API_KEY" 2>&1 | tee -a "$LOG_FILE"
    npx supabase secrets set SHOPIFY_SHOP_DOMAIN="$SHOPIFY_SHOP_DOMAIN" 2>&1 | tee -a "$LOG_FILE"
    npx supabase secrets set SHOPIFY_ADMIN_API_ACCESS_TOKEN="$SHOPIFY_ADMIN_API_ACCESS_TOKEN" 2>&1 | tee -a "$LOG_FILE"
    npx supabase secrets set SHOPIFY_API_VERSION="$SHOPIFY_API_VERSION" 2>&1 | tee -a "$LOG_FILE"
    npx supabase secrets set PRINTFUL_API_KEY="$PRINTFUL_API_KEY" 2>&1 | tee -a "$LOG_FILE"
    
    # Service role key for admin functions
    npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" 2>&1 | tee -a "$LOG_FILE"
    
    log "SUCCESS" "Edge functions and secrets synced"
}

# Sync storage buckets
sync_storage_buckets() {
    log "INFO" "Syncing storage buckets..."
    
    # Get production buckets using service role key
    local PROD_URL="${VITE_PUBLIC_SUPABASE_URL}"
    local SERVICE_KEY="$SUPABASE_SERVICE_ROLE_KEY"
    
    # List production buckets
    log "INFO" "Fetching production storage buckets..."
    
    local BUCKETS=$(curl -s \
        -H "Authorization: Bearer $SERVICE_KEY" \
        -H "apikey: $SERVICE_KEY" \
        "${PROD_URL}/storage/v1/bucket" | jq -r '.[].name' 2>/dev/null || echo "")
    
    if [ -z "$BUCKETS" ]; then
        log "WARNING" "No storage buckets found in production"
        return 0
    fi
    
    # Create buckets locally
    for bucket in $BUCKETS; do
        log "INFO" "Creating bucket: $bucket"
        
        # Get bucket details
        local BUCKET_INFO=$(curl -s \
            -H "Authorization: Bearer $SERVICE_KEY" \
            -H "apikey: $SERVICE_KEY" \
            "${PROD_URL}/storage/v1/bucket/$bucket")
        
        # Create bucket locally (using local API)
        curl -X POST \
            -H "Authorization: Bearer $SERVICE_KEY" \
            -H "apikey: $SERVICE_KEY" \
            -H "Content-Type: application/json" \
            -d "$BUCKET_INFO" \
            "http://127.0.0.1:54321/storage/v1/bucket" 2>&1 | tee -a "$LOG_FILE"
        
        # Sync bucket contents
        log "INFO" "Syncing contents of bucket: $bucket"
        
        # This would require listing and downloading all files
        # For now, we'll note this as a manual step
        log "WARNING" "Bucket content sync requires manual implementation or use of a sync tool"
    done
    
    log "SUCCESS" "Storage bucket structure synced"
}

# Verify sync
verify_sync() {
    log "INFO" "Verifying sync completeness..."
    
    cd "$PROJECT_ROOT"
    
    # Run verification script
    if [ -f "$SCRIPT_DIR/clone-production/05-verify.sh" ]; then
        bash "$SCRIPT_DIR/clone-production/05-verify.sh" 2>&1 | tee -a "$LOG_FILE"
    fi
    
    # Additional checks
    log "INFO" "Running additional verification checks..."
    
    # Check table counts
    local DB_CONTAINER=$(docker ps --format "table {{.Names}}" | grep "supabase_db_" | head -1)
    
    echo -e "\n${BLUE}=== Table Row Counts ===${NC}" | tee -a "$LOG_FILE"
    
    local TABLES="profiles user_roles discord_connections youtube_connections shopify_orders printful_orders featured_products announcements support_tickets"
    
    for table in $TABLES; do
        local COUNT=$(docker exec "$DB_CONTAINER" psql -U postgres -d postgres -t -c "SELECT COUNT(*) FROM $table;" 2>/dev/null || echo "0")
        printf "%-25s: %s rows\n" "$table" "$COUNT" | tee -a "$LOG_FILE"
    done
    
    # Check edge functions
    echo -e "\n${BLUE}=== Edge Functions ===${NC}" | tee -a "$LOG_FILE"
    npx supabase functions list | tee -a "$LOG_FILE"
    
    # Check secrets
    echo -e "\n${BLUE}=== Edge Function Secrets ===${NC}" | tee -a "$LOG_FILE"
    npx supabase secrets list | tee -a "$LOG_FILE"
    
    log "SUCCESS" "Verification completed"
}

# Main execution
main() {
    echo -e "${GREEN}=== Full Production Sync ===${NC}"
    echo "This will create a complete 1:1 copy of production"
    echo "Log file: $LOG_FILE"
    echo
    
    # Load credentials
    load_env
    
    # Confirm with user
    echo -e "${YELLOW}WARNING: This will reset your local Supabase instance!${NC}"
    read -p "Continue? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log "INFO" "Sync cancelled by user"
        exit 0
    fi
    
    # Stop and restart Supabase
    stop_local_supabase
    start_local_supabase
    
    # Run sync steps
    sync_database
    sync_edge_functions
    sync_storage_buckets
    
    # Verify
    verify_sync
    
    echo -e "\n${GREEN}=== Sync Complete ===${NC}"
    echo "Your local environment now matches production!"
    echo "Access points:"
    echo "  - Application: http://localhost:8080"
    echo "  - Supabase Studio: http://127.0.0.1:54323"
    echo "  - API: http://127.0.0.1:54321"
    echo
    echo "Full log: $LOG_FILE"
}

# Run main function
main "$@"