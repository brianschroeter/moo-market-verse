#!/bin/bash

# 02-sync-database.sh - Enhanced database sync script with backup and validation
# This script wraps the existing sync-production-db.sh with additional safety features

set -euo pipefail

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Progress indicator
show_progress() {
    local pid=$1
    local message=$2
    local delay=0.1
    local spinstr='|/-\'
    
    echo -n "$message "
    while [ "$(ps a | awk '{print $1}' | grep $pid)" ]; do
        local temp=${spinstr#?}
        printf " [%c]  " "$spinstr"
        local spinstr=$temp${spinstr%"$temp"}
        sleep $delay
        printf "\b\b\b\b\b\b"
    done
    printf "    \b\b\b\b"
    echo ""
}

# Check if Supabase is running
check_supabase_status() {
    log_info "Checking Supabase status..."
    
    if ! npx supabase status --local > /dev/null 2>&1; then
        log_error "Supabase is not running locally"
        log_info "Starting Supabase..."
        npx supabase start
        
        # Wait for services to be ready
        sleep 5
    else
        log_success "Supabase is running"
    fi
}

# Create database backup
create_backup() {
    local backup_dir="$PROJECT_ROOT/backups"
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$backup_dir/local_db_backup_${timestamp}.sql"
    
    log_info "Creating backup of local database..."
    
    # Create backup directory if it doesn't exist
    mkdir -p "$backup_dir"
    
    # Create backup
    if pg_dump postgresql://postgres:postgres@127.0.0.1:54322/postgres > "$backup_file" 2>/dev/null; then
        log_success "Backup created: $backup_file"
        echo "$backup_file"
    else
        log_warning "No existing database to backup (this is normal for first sync)"
        echo ""
    fi
}

# Validate database connection
validate_connection() {
    log_info "Validating database connection..."
    
    if psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -c '\q' 2>/dev/null; then
        log_success "Database connection validated"
        return 0
    else
        log_error "Cannot connect to local database"
        return 1
    fi
}

# Count tables and rows
get_db_stats() {
    local db_url=$1
    local table_count=$(psql "$db_url" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';" 2>/dev/null | tr -d ' ')
    
    echo "$table_count"
}

# Run the sync
run_sync() {
    log_info "Starting database sync from production..."
    
    # Change to project root
    cd "$PROJECT_ROOT"
    
    # Check if sync script exists
    if [ ! -f "scripts/sync-production-db.sh" ]; then
        log_error "sync-production-db.sh not found"
        return 1
    fi
    
    # Make sure script is executable
    chmod +x scripts/sync-production-db.sh
    
    # Database password
    DB_PASSWORD="B445478e84Fknsd312s"
    
    # Run the sync script with password piped in
    echo "$DB_PASSWORD" | ./scripts/sync-production-db.sh
}

# Validate sync results
validate_sync() {
    log_info "Validating sync results..."
    
    local db_url="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
    
    # Check if we can connect
    if ! validate_connection; then
        return 1
    fi
    
    # Count tables
    local table_count=$(get_db_stats "$db_url")
    
    if [ "$table_count" -gt 0 ]; then
        log_success "Database contains $table_count tables"
        
        # Check for key tables
        local key_tables=("profiles" "discord_connections" "youtube_connections" "shopify_orders" "support_tickets")
        local missing_tables=()
        
        for table in "${key_tables[@]}"; do
            if ! psql "$db_url" -t -c "SELECT 1 FROM information_schema.tables WHERE table_name = '$table';" | grep -q 1; then
                missing_tables+=("$table")
            fi
        done
        
        if [ ${#missing_tables[@]} -eq 0 ]; then
            log_success "All key tables present"
        else
            log_warning "Missing tables: ${missing_tables[*]}"
        fi
        
        # Show row counts for key tables
        log_info "Row counts for key tables:"
        for table in "${key_tables[@]}"; do
            if psql "$db_url" -t -c "SELECT 1 FROM information_schema.tables WHERE table_name = '$table';" | grep -q 1; then
                local count=$(psql "$db_url" -t -c "SELECT COUNT(*) FROM $table;" 2>/dev/null | tr -d ' ')
                echo "  - $table: $count rows"
            fi
        done
        
        return 0
    else
        log_error "No tables found in database"
        return 1
    fi
}

# Check for pending migrations
check_migrations() {
    log_info "Checking for pending migrations..."
    
    cd "$PROJECT_ROOT"
    
    # Get list of migration files
    local migration_count=$(ls -1 supabase/migrations/*.sql 2>/dev/null | wc -l)
    
    if [ "$migration_count" -gt 0 ]; then
        log_info "Found $migration_count migration files"
        
        # Check if migrations have been applied
        local applied_count=$(psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -t -c "SELECT COUNT(*) FROM supabase_migrations.schema_migrations;" 2>/dev/null | tr -d ' ')
        
        if [ -n "$applied_count" ] && [ "$applied_count" -lt "$migration_count" ]; then
            log_warning "There may be pending migrations (applied: $applied_count, total: $migration_count)"
            
            read -p "Run migrations now? (y/N) " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                log_info "Running migrations..."
                npx supabase db push --local
                log_success "Migrations applied"
            fi
        else
            log_success "All migrations appear to be applied"
        fi
    fi
}

# Generate TypeScript types
generate_types() {
    log_info "Generating TypeScript types from database schema..."
    
    cd "$PROJECT_ROOT"
    
    if npx supabase gen types typescript --local > src/integrations/supabase/types.ts.tmp 2>/dev/null; then
        mv src/integrations/supabase/types.ts.tmp src/integrations/supabase/types.ts
        log_success "TypeScript types generated"
    else
        log_error "Failed to generate TypeScript types"
        rm -f src/integrations/supabase/types.ts.tmp
    fi
}

# Main execution
main() {
    echo "======================================"
    echo "Database Sync Script"
    echo "======================================"
    echo ""
    
    # Check prerequisites
    log_info "Checking prerequisites..."
    
    # Check if we're in the right directory
    if [ ! -f "$PROJECT_ROOT/package.json" ]; then
        log_error "This script must be run from the moo-market-verse project"
        exit 1
    fi
    
    # Check Supabase CLI (via npx)
    if ! npx supabase --version &> /dev/null; then
        log_error "Supabase CLI not found. Please install it first."
        exit 1
    fi
    
    # Check PostgreSQL client (optional - can use Docker)
    if ! command -v psql &> /dev/null; then
        log_warning "PostgreSQL client (psql) not found - will use Docker containers for database operations"
        USE_DOCKER_PSQL=true
    else
        USE_DOCKER_PSQL=false
    fi
    
    # Check Supabase status
    check_supabase_status
    
    # Create backup
    echo ""
    backup_file=$(create_backup)
    
    # Confirm before proceeding
    echo ""
    log_warning "This will replace your local database with production data!"
    if [ -n "$backup_file" ]; then
        log_info "Backup saved to: $backup_file"
    fi
    
    read -p "Continue with sync? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Sync cancelled"
        exit 0
    fi
    
    # Run the sync
    echo ""
    if run_sync; then
        log_success "Sync completed"
    else
        log_error "Sync failed"
        
        if [ -n "$backup_file" ]; then
            log_info "You can restore from backup with:"
            echo "  psql postgresql://postgres:postgres@127.0.0.1:54322/postgres < $backup_file"
        fi
        exit 1
    fi
    
    # Validate results
    echo ""
    if validate_sync; then
        log_success "Database validation passed"
    else
        log_error "Database validation failed"
        
        if [ -n "$backup_file" ]; then
            log_info "You can restore from backup with:"
            echo "  psql postgresql://postgres:postgres@127.0.0.1:54322/postgres < $backup_file"
        fi
        exit 1
    fi
    
    # Check for migrations
    echo ""
    check_migrations
    
    # Generate types
    echo ""
    generate_types
    
    # Final summary
    echo ""
    echo "======================================"
    log_success "Database sync completed successfully!"
    echo "======================================"
    echo ""
    log_info "Next steps:"
    echo "  1. Review the synced data"
    echo "  2. Test your local environment"
    echo "  3. If needed, restore from backup: $backup_file"
    echo ""
    
    # Clean up old backups (keep last 5)
    if [ -d "$PROJECT_ROOT/backups" ]; then
        log_info "Cleaning up old backups (keeping last 5)..."
        ls -t "$PROJECT_ROOT/backups"/local_db_backup_*.sql 2>/dev/null | tail -n +6 | xargs -r rm
    fi
}

# Run main function
main "$@"