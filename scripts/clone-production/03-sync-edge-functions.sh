#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKUP_DIR="$SCRIPT_DIR/backups/$(date +%Y%m%d_%H%M%S)_functions"
SECRETS_FILE="$SCRIPT_DIR/.env.secrets"

# Function to print colored messages
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "\n${BLUE}===================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}===================================${NC}\n"
}

print_progress() {
    echo -e "${CYAN}[PROGRESS]${NC} $1"
}

# Function to check if secrets file exists
check_secrets_file() {
    if [ ! -f "$SECRETS_FILE" ]; then
        print_error "Secrets file not found: $SECRETS_FILE"
        print_info "Please run ./01-prepare-environment.sh first and fill in the secrets"
        exit 1
    fi
}

# Function to load secrets
load_secrets() {
    source "$SECRETS_FILE"
    
    # Check required secrets for edge functions
    local missing_secrets=()
    
    # Core secrets
    [ -z "$SUPABASE_SERVICE_ROLE_KEY" ] && missing_secrets+=("SUPABASE_SERVICE_ROLE_KEY")
    
    # Integration secrets
    [ -z "$PRINTFUL_API_KEY" ] && missing_secrets+=("PRINTFUL_API_KEY")
    [ -z "$SHOPIFY_ADMIN_API_ACCESS_TOKEN" ] && missing_secrets+=("SHOPIFY_ADMIN_API_ACCESS_TOKEN")
    [ -z "$SHOPIFY_SHOP_DOMAIN" ] && missing_secrets+=("SHOPIFY_SHOP_DOMAIN")
    [ -z "$SHOPIFY_API_VERSION" ] && missing_secrets+=("SHOPIFY_API_VERSION")
    [ -z "$DISCORD_CLIENT_ID" ] && missing_secrets+=("DISCORD_CLIENT_ID")
    [ -z "$DISCORD_CLIENT_SECRET" ] && missing_secrets+=("DISCORD_CLIENT_SECRET")
    [ -z "$YOUTUBE_API_KEY" ] && missing_secrets+=("YOUTUBE_API_KEY")
    [ -z "$FINGERPRINT_API_KEY" ] && missing_secrets+=("FINGERPRINT_API_KEY")
    [ -z "$RESEND_API_KEY" ] && missing_secrets+=("RESEND_API_KEY")
    
    if [ ${#missing_secrets[@]} -ne 0 ]; then
        print_error "Missing required secrets:"
        for secret in "${missing_secrets[@]}"; do
            echo "  - $secret"
        done
        print_info "Please fill in all required values in $SECRETS_FILE"
        exit 1
    fi
}

# Function to check if Supabase CLI is available
check_supabase_cli() {
    if ! command -v supabase &> /dev/null && ! npx supabase --version &> /dev/null; then
        print_error "Supabase CLI not found"
        print_info "Please install Supabase CLI: npm install -g supabase"
        exit 1
    fi
}

# Function to check if project is linked
check_project_linked() {
    if [ ! -f "$PROJECT_ROOT/supabase/.temp/project-ref" ]; then
        print_error "Supabase project not linked"
        print_info "Please run: npx supabase link --project-ref YOUR_PROJECT_REF"
        exit 1
    fi
    
    PROJECT_REF=$(cat "$PROJECT_ROOT/supabase/.temp/project-ref")
    print_info "Working with project: $PROJECT_REF"
}

# Function to get list of edge functions
get_edge_functions() {
    local functions_dir="$PROJECT_ROOT/supabase/functions"
    local functions=()
    
    if [ -d "$functions_dir" ]; then
        for func_dir in "$functions_dir"/*; do
            if [ -d "$func_dir" ]; then
                local func_name=$(basename "$func_dir")
                # Skip the _shared directory
                if [ "$func_name" != "_shared" ]; then
                    functions+=("$func_name")
                fi
            fi
        done
    fi
    
    echo "${functions[@]}"
}

# Function to backup existing functions
backup_functions() {
    print_header "Backing Up Existing Functions"
    
    mkdir -p "$BACKUP_DIR"
    
    local functions_dir="$PROJECT_ROOT/supabase/functions"
    if [ -d "$functions_dir" ]; then
        cp -r "$functions_dir" "$BACKUP_DIR/"
        print_success "Backed up functions to: $BACKUP_DIR"
        
        # Create restoration script
        cat > "$BACKUP_DIR/restore-functions.sh" << 'EOF'
#!/bin/bash
# Restore functions from this backup

BACKUP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$BACKUP_DIR/../../../.." && pwd)"

echo "Restoring functions from: $BACKUP_DIR"

# Remove current functions
rm -rf "$PROJECT_ROOT/supabase/functions"

# Restore backed up functions
cp -r "$BACKUP_DIR/functions" "$PROJECT_ROOT/supabase/"

echo "Functions restored successfully!"
echo ""
echo "Next steps:"
echo "1. Deploy the restored functions: npx supabase functions deploy"
echo "2. Set the required secrets again"
EOF
        
        chmod +x "$BACKUP_DIR/restore-functions.sh"
        print_success "Created restoration script"
    else
        print_warning "No existing functions directory to backup"
    fi
}

# Function to sync functions from production
sync_functions_from_production() {
    print_header "Syncing Functions from Production"
    
    print_warning "Note: Supabase doesn't provide direct function download. We'll use the local functions."
    print_info "Make sure your local functions match the production deployment!"
    
    # Get list of functions
    local functions=($(get_edge_functions))
    
    print_info "Found ${#functions[@]} functions to deploy:"
    for func in "${functions[@]}"; do
        echo "  - $func"
    done
}

# Function to set edge function secrets
set_function_secrets() {
    print_header "Setting Edge Function Secrets"
    
    local secrets_to_set=(
        "SUPABASE_SERVICE_ROLE_KEY"
        "PRINTFUL_API_KEY"
        "SHOPIFY_ADMIN_API_ACCESS_TOKEN"
        "SHOPIFY_SHOP_DOMAIN"
        "SHOPIFY_API_VERSION"
        "DISCORD_CLIENT_ID"
        "DISCORD_CLIENT_SECRET"
        "YOUTUBE_API_KEY"
        "FINGERPRINT_API_KEY"
        "RESEND_API_KEY"
    )
    
    # Add optional secrets if they exist
    [ -n "$SMTP_HOST" ] && secrets_to_set+=("SMTP_HOST")
    [ -n "$SMTP_PORT" ] && secrets_to_set+=("SMTP_PORT")
    [ -n "$SMTP_USER" ] && secrets_to_set+=("SMTP_USER")
    [ -n "$SMTP_PASS" ] && secrets_to_set+=("SMTP_PASS")
    [ -n "$SMTP_FROM_EMAIL" ] && secrets_to_set+=("SMTP_FROM_EMAIL")
    [ -n "$SHOPIFY_WEBHOOK_SECRET" ] && secrets_to_set+=("SHOPIFY_WEBHOOK_SECRET")
    [ -n "$PRINTFUL_WEBHOOK_SECRET" ] && secrets_to_set+=("PRINTFUL_WEBHOOK_SECRET")
    
    local total_secrets=${#secrets_to_set[@]}
    local current=0
    
    for secret_name in "${secrets_to_set[@]}"; do
        current=$((current + 1))
        print_progress "Setting secret $current/$total_secrets: $secret_name"
        
        # Get the secret value
        local secret_value="${!secret_name}"
        
        if [ -n "$secret_value" ]; then
            # Set the secret using Supabase CLI
            if npx supabase secrets set "$secret_name=$secret_value" &> /dev/null; then
                print_success "Set secret: $secret_name"
            else
                print_error "Failed to set secret: $secret_name"
                return 1
            fi
        else
            print_warning "Skipping empty secret: $secret_name"
        fi
    done
    
    print_success "All secrets have been set"
}

# Function to deploy edge functions
deploy_functions() {
    print_header "Deploying Edge Functions"
    
    local functions=($(get_edge_functions))
    local total_functions=${#functions[@]}
    local current=0
    local failed_functions=()
    
    for func in "${functions[@]}"; do
        current=$((current + 1))
        print_progress "Deploying function $current/$total_functions: $func"
        
        # Check if function has special configuration in config.toml
        local verify_jwt_flag=""
        if grep -q "\[functions.$func\]" "$PROJECT_ROOT/supabase/config.toml"; then
            if grep -A5 "\[functions.$func\]" "$PROJECT_ROOT/supabase/config.toml" | grep -q "verify_jwt = false"; then
                verify_jwt_flag="--no-verify-jwt"
                print_info "Function $func configured with no JWT verification"
            fi
        fi
        
        # Deploy the function
        if npx supabase functions deploy "$func" $verify_jwt_flag; then
            print_success "Deployed: $func"
        else
            print_error "Failed to deploy: $func"
            failed_functions+=("$func")
        fi
        
        # Add a small delay to avoid rate limiting
        sleep 1
    done
    
    if [ ${#failed_functions[@]} -eq 0 ]; then
        print_success "All functions deployed successfully!"
    else
        print_error "Failed to deploy ${#failed_functions[@]} functions:"
        for func in "${failed_functions[@]}"; do
            echo "  - $func"
        done
        return 1
    fi
}

# Function to validate deployed functions
validate_functions() {
    print_header "Validating Deployed Functions"
    
    print_info "Listing deployed functions..."
    
    # List deployed functions
    if npx supabase functions list; then
        print_success "Functions listing successful"
    else
        print_error "Failed to list functions"
        return 1
    fi
    
    # Test a simple function if available
    local test_function="get-schedule"
    if [[ " $(get_edge_functions) " =~ " $test_function " ]]; then
        print_info "Testing function: $test_function"
        
        # Get the project URL
        local project_url=$(npx supabase status --output json 2>/dev/null | jq -r '.api_url' 2>/dev/null || echo "")
        
        if [ -n "$project_url" ]; then
            local function_url="$project_url/functions/v1/$test_function"
            print_info "Testing URL: $function_url"
            
            # Test the function
            local response=$(curl -s -o /dev/null -w "%{http_code}" "$function_url")
            
            if [ "$response" == "200" ] || [ "$response" == "401" ] || [ "$response" == "403" ]; then
                print_success "Function is responding (HTTP $response)"
            else
                print_warning "Function returned unexpected status: HTTP $response"
            fi
        else
            print_warning "Could not determine project URL for testing"
        fi
    fi
}

# Function to generate summary report
generate_summary() {
    print_header "Edge Functions Sync Summary"
    
    local summary_file="$BACKUP_DIR/sync-summary.txt"
    
    {
        echo "Edge Functions Sync Summary"
        echo "=========================="
        echo "Date: $(date)"
        echo "Project: $PROJECT_REF"
        echo ""
        echo "Functions Deployed:"
        for func in $(get_edge_functions); do
            echo "  - $func"
        done
        echo ""
        echo "Secrets Set:"
        echo "  - SUPABASE_SERVICE_ROLE_KEY"
        echo "  - PRINTFUL_API_KEY"
        echo "  - SHOPIFY_ADMIN_API_ACCESS_TOKEN"
        echo "  - SHOPIFY_SHOP_DOMAIN"
        echo "  - SHOPIFY_API_VERSION"
        echo "  - DISCORD_CLIENT_ID"
        echo "  - DISCORD_CLIENT_SECRET"
        echo "  - YOUTUBE_API_KEY"
        echo "  - FINGERPRINT_API_KEY"
        echo "  - RESEND_API_KEY"
        echo ""
        echo "Backup Location: $BACKUP_DIR"
    } > "$summary_file"
    
    print_success "Summary saved to: $summary_file"
    cat "$summary_file"
}

# Main execution
main() {
    print_header "Production Edge Functions Sync Script"
    
    # Step 1: Check prerequisites
    print_progress "Checking prerequisites..."
    check_supabase_cli
    check_project_linked
    check_secrets_file
    load_secrets
    print_success "Prerequisites check passed"
    
    # Step 2: Backup existing functions
    backup_functions
    
    # Step 3: Sync functions from production
    sync_functions_from_production
    
    # Step 4: Set function secrets
    if ! set_function_secrets; then
        print_error "Failed to set function secrets"
        exit 1
    fi
    
    # Step 5: Deploy functions
    if ! deploy_functions; then
        print_error "Some functions failed to deploy"
        print_info "Check the errors above and try deploying failed functions individually"
        exit 1
    fi
    
    # Step 6: Validate deployment
    validate_functions
    
    # Step 7: Generate summary
    generate_summary
    
    print_header "Edge Functions Sync Complete!"
    print_success "All edge functions have been synced successfully"
    print_info "Backup created at: $BACKUP_DIR"
    print_warning "\nImportant Notes:"
    echo "1. Functions are now deployed with production secrets"
    echo "2. Test your functions to ensure they work correctly"
    echo "3. If you need to restore, run: $BACKUP_DIR/restore-functions.sh"
    echo ""
    print_info "Next steps:"
    echo "1. Test critical functions through the Supabase dashboard"
    echo "2. Monitor function logs for any errors"
    echo "3. Update any function-specific configuration if needed"
}

# Run main function
main "$@"