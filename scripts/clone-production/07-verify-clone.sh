#!/bin/bash

# Script 07: Verify Clone - Run comprehensive tests on the cloned environment
# This script verifies database connectivity, edge functions, auth, APIs, and storage

set -e  # Exit on error

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
LOG_FILE="${SCRIPT_DIR}/logs/verification-$(date +%Y%m%d_%H%M%S).log"
REPORT_FILE="${SCRIPT_DIR}/logs/verification-report-$(date +%Y%m%d_%H%M%S).md"

# Ensure log directory exists
mkdir -p "${SCRIPT_DIR}/logs"

# Function to log messages
log() {
    echo -e "$1" | tee -a "$LOG_FILE"
}

# Function to log errors
error() {
    echo -e "${RED}ERROR: $1${NC}" | tee -a "$LOG_FILE"
}

# Function to log success
success() {
    echo -e "${GREEN}✓ $1${NC}" | tee -a "$LOG_FILE"
}

# Function to log warnings
warning() {
    echo -e "${YELLOW}⚠ $1${NC}" | tee -a "$LOG_FILE"
}

# Function to log info
info() {
    echo -e "${BLUE}ℹ $1${NC}" | tee -a "$LOG_FILE"
}

# Function to test database connectivity
test_database() {
    log "\n${BLUE}=== Testing Database Connectivity ===${NC}"
    
    # Test basic connection
    if npx supabase db test 2>&1 | tee -a "$LOG_FILE"; then
        success "Database connection successful"
    else
        error "Database connection failed"
        return 1
    fi
    
    # Test key tables existence
    log "\nChecking key tables..."
    local key_tables=(
        "profiles"
        "user_roles"
        "discord_connections"
        "youtube_connections"
        "shopify_orders"
        "printful_orders"
        "featured_products"
        "announcements"
        "support_tickets"
    )
    
    for table in "${key_tables[@]}"; do
        if npx supabase db query "SELECT COUNT(*) FROM $table LIMIT 1" 2>&1 | grep -q "COUNT"; then
            success "Table '$table' exists and is accessible"
        else
            error "Table '$table' is not accessible"
        fi
    done
    
    # Test RLS policies
    log "\nChecking RLS policies..."
    local rls_check=$(npx supabase db query "SELECT tablename, COUNT(*) as policy_count FROM pg_policies GROUP BY tablename ORDER BY tablename" 2>&1)
    if echo "$rls_check" | grep -q "profiles"; then
        success "RLS policies are configured"
        echo "$rls_check" >> "$LOG_FILE"
    else
        warning "Could not verify RLS policies"
    fi
}

# Function to test edge functions
test_edge_functions() {
    log "\n${BLUE}=== Testing Edge Functions ===${NC}"
    
    # Get local API URL
    local api_url="http://localhost:54321"
    local anon_key=$(grep VITE_SUPABASE_ANON_KEY "$PROJECT_ROOT/.env" | cut -d= -f2 | tr -d '"' | tr -d "'")
    
    if [ -z "$anon_key" ]; then
        warning "Could not find anon key, skipping edge function tests"
        return
    fi
    
    # Test health check function if it exists
    log "\nTesting edge function health..."
    local health_response=$(curl -s -X GET \
        "$api_url/functions/v1/health-check" \
        -H "Authorization: Bearer $anon_key" \
        -H "Content-Type: application/json" 2>&1)
    
    if echo "$health_response" | grep -q "ok\|healthy\|success"; then
        success "Edge functions are responding"
    else
        warning "Health check function not available or not responding as expected"
    fi
    
    # List available functions
    log "\nAvailable edge functions:"
    if [ -d "$PROJECT_ROOT/supabase/functions" ]; then
        ls -1 "$PROJECT_ROOT/supabase/functions" | grep -v "^_" | while read func; do
            if [ -d "$PROJECT_ROOT/supabase/functions/$func" ]; then
                info "  - $func"
            fi
        done
    fi
}

# Function to test auth configuration
test_auth_config() {
    log "\n${BLUE}=== Testing Auth Configuration ===${NC}"
    
    # Check Discord OAuth configuration
    log "\nChecking Discord OAuth configuration..."
    if grep -q "discord" "$PROJECT_ROOT/supabase/config.toml"; then
        success "Discord OAuth provider is configured"
        
        # Check for client ID (without exposing it)
        if grep -q "client_id" "$PROJECT_ROOT/supabase/config.toml"; then
            success "Discord client ID is set"
        else
            warning "Discord client ID not found in config"
        fi
    else
        error "Discord OAuth provider not configured"
    fi
    
    # Test auth endpoint
    local auth_health=$(curl -s "http://localhost:54321/auth/v1/health" 2>&1)
    if echo "$auth_health" | grep -q "ok\|healthy"; then
        success "Auth service is healthy"
    else
        warning "Could not verify auth service health"
    fi
}

# Function to test API integrations
test_api_integrations() {
    log "\n${BLUE}=== Testing API Integrations ===${NC}"
    
    # Check YouTube API configuration
    log "\nChecking YouTube API configuration..."
    if grep -q "YOUTUBE_API_KEY" "$PROJECT_ROOT/.env" || [ -n "$YOUTUBE_API_KEY" ]; then
        success "YouTube API key is configured"
    else
        warning "YouTube API key not found"
    fi
    
    # Check Shopify configuration
    log "\nChecking Shopify configuration..."
    if grep -q "SHOPIFY_SHOP_DOMAIN" "$PROJECT_ROOT/.env" || [ -n "$SHOPIFY_SHOP_DOMAIN" ]; then
        success "Shopify configuration found"
    else
        warning "Shopify configuration not found"
    fi
    
    # Check Printful configuration
    log "\nChecking Printful configuration..."
    local printful_check=$(npx supabase secrets list 2>&1 | grep -i printful || true)
    if [ -n "$printful_check" ]; then
        success "Printful API key is configured in secrets"
    else
        warning "Printful API key not found in secrets"
    fi
}

# Function to test storage buckets
test_storage_buckets() {
    log "\n${BLUE}=== Testing Storage Buckets ===${NC}"
    
    # List storage buckets
    local buckets=$(npx supabase storage list 2>&1)
    if echo "$buckets" | grep -q "error"; then
        warning "Could not list storage buckets"
    else
        success "Storage service is accessible"
        echo "$buckets" | tee -a "$LOG_FILE"
    fi
}

# Function to test local development server
test_local_server() {
    log "\n${BLUE}=== Testing Local Development Server ===${NC}"
    
    # Check if dev server is running
    if curl -s "http://localhost:8080" > /dev/null 2>&1; then
        success "Development server is running on port 8080"
    elif curl -s "http://localhost:8081" > /dev/null 2>&1; then
        success "Development server is running on port 8081"
    else
        warning "Development server is not running (run 'npm run dev' to start)"
    fi
}

# Function to generate verification report
generate_report() {
    log "\n${BLUE}=== Generating Verification Report ===${NC}"
    
    cat > "$REPORT_FILE" << EOF
# Clone Verification Report

Generated: $(date)

## Summary

This report contains the results of the automated verification tests run on the cloned production environment.

## Test Results

### Database Connectivity
$(grep -A 20 "Testing Database Connectivity" "$LOG_FILE" | grep -E "✓|ERROR:|⚠" || echo "No results")

### Edge Functions
$(grep -A 20 "Testing Edge Functions" "$LOG_FILE" | grep -E "✓|ERROR:|⚠|  -" || echo "No results")

### Auth Configuration
$(grep -A 10 "Testing Auth Configuration" "$LOG_FILE" | grep -E "✓|ERROR:|⚠" || echo "No results")

### API Integrations
$(grep -A 10 "Testing API Integrations" "$LOG_FILE" | grep -E "✓|ERROR:|⚠" || echo "No results")

### Storage Buckets
$(grep -A 10 "Testing Storage Buckets" "$LOG_FILE" | grep -E "✓|ERROR:|⚠" || echo "No results")

### Local Development Server
$(grep -A 5 "Testing Local Development Server" "$LOG_FILE" | grep -E "✓|ERROR:|⚠" || echo "No results")

## Next Steps

1. Review any warnings or errors above
2. Start the development server with \`npm run dev\`
3. Access the application at http://localhost:8080 (or the port shown)
4. Test key features:
   - User authentication (Discord OAuth)
   - Admin panel access
   - YouTube integration
   - Shop functionality
   - Support tickets

## Log Files

- Full log: $LOG_FILE
- This report: $REPORT_FILE
EOF
    
    success "Verification report generated: $REPORT_FILE"
}

# Main execution
main() {
    log "${GREEN}=== Starting Clone Verification ===${NC}"
    log "Timestamp: $(date)"
    log "Project Root: $PROJECT_ROOT"
    
    # Run all tests
    test_database
    test_edge_functions
    test_auth_config
    test_api_integrations
    test_storage_buckets
    test_local_server
    
    # Generate report
    generate_report
    
    log "\n${GREEN}=== Verification Complete ===${NC}"
    log "Check the report at: $REPORT_FILE"
    
    # Show summary
    local errors=$(grep -c "ERROR:" "$LOG_FILE" || true)
    local warnings=$(grep -c "⚠" "$LOG_FILE" || true)
    local successes=$(grep -c "✓" "$LOG_FILE" || true)
    
    log "\n${BLUE}Summary:${NC}"
    log "  ${GREEN}Successes: $successes${NC}"
    log "  ${YELLOW}Warnings: $warnings${NC}"
    log "  ${RED}Errors: $errors${NC}"
    
    if [ "$errors" -eq 0 ]; then
        log "\n${GREEN}✅ Clone verification completed successfully!${NC}"
        return 0
    else
        log "\n${YELLOW}⚠️  Clone verification completed with errors. Please review the report.${NC}"
        return 1
    fi
}

# Run main function
main "$@"