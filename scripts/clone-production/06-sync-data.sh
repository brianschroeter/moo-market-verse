#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Load utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/utils/common.sh"

# Environment detection
PROJECT_ROOT=$(get_project_root)
cd "$PROJECT_ROOT"

echo -e "${BLUE}=== MOO MARKET VERSE DATA SYNC ===${NC}"
echo -e "${CYAN}Syncing order data from external services...${NC}"

# Check for required environment variables
check_env() {
    local missing=()
    
    if [[ -z "$SUPABASE_SERVICE_ROLE_KEY" ]]; then
        missing+=("SUPABASE_SERVICE_ROLE_KEY")
    fi
    
    if [[ ${#missing[@]} -gt 0 ]]; then
        echo -e "${RED}❌ Missing required environment variables:${NC}"
        for var in "${missing[@]}"; do
            echo -e "${RED}   - $var${NC}"
        done
        echo -e "${YELLOW}Please check your .env or .env.local file${NC}"
        return 1
    fi
    
    return 0
}

# Progress indicator
show_progress() {
    local pid=$1
    local delay=0.1
    local spinstr='|/-\'
    echo -n " "
    while kill -0 $pid 2>/dev/null; do
        local temp=${spinstr#?}
        printf " [%c]  " "$spinstr"
        local spinstr=$temp${spinstr%"$temp"}
        sleep $delay
        printf "\b\b\b\b\b\b"
    done
    printf "    \b\b\b\b"
}

# Function to sync Shopify orders
sync_shopify_orders() {
    local sync_type="$1"
    
    echo -e "\n${CYAN}🛒 Syncing Shopify Orders (${sync_type})...${NC}"
    
    # Check if Node.js sync script exists
    if [[ ! -f "$PROJECT_ROOT/scripts/sync-all-shopify-orders.cjs" ]]; then
        echo -e "${RED}❌ Shopify sync script not found${NC}"
        return 1
    fi
    
    # Check for npm dependencies
    if ! npm list @supabase/supabase-js >/dev/null 2>&1; then
        echo -e "${YELLOW}📦 Installing required dependencies...${NC}"
        npm install @supabase/supabase-js --no-save
    fi
    
    # Run sync based on type
    local start_time=$(date +%s)
    
    if [[ "$sync_type" == "full" ]]; then
        echo -e "${YELLOW}⚠️  Full sync will fetch ALL orders from Shopify${NC}"
        echo -e "${YELLOW}   This may take several minutes depending on order count${NC}"
    fi
    
    # Execute sync with progress indicator
    (
        USE_LOCAL=${USE_LOCAL:-false} node "$PROJECT_ROOT/scripts/sync-all-shopify-orders.cjs"
    ) &
    
    local sync_pid=$!
    show_progress $sync_pid
    wait $sync_pid
    local exit_code=$?
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    if [[ $exit_code -eq 0 ]]; then
        echo -e "${GREEN}✅ Shopify sync completed in ${duration}s${NC}"
    else
        echo -e "${RED}❌ Shopify sync failed${NC}"
        return 1
    fi
}

# Function to sync Printful orders
sync_printful_orders() {
    local sync_type="$1"
    
    echo -e "\n${CYAN}👕 Syncing Printful Orders (${sync_type})...${NC}"
    
    # Check if Node.js sync script exists
    if [[ ! -f "$PROJECT_ROOT/scripts/sync-all-printful-orders.cjs" ]]; then
        echo -e "${RED}❌ Printful sync script not found${NC}"
        return 1
    fi
    
    # Check for service role key
    if [[ -z "$SUPABASE_SERVICE_ROLE_KEY" ]]; then
        echo -e "${RED}❌ SUPABASE_SERVICE_ROLE_KEY is required for Printful sync${NC}"
        return 1
    fi
    
    # Run sync based on type
    local start_time=$(date +%s)
    
    if [[ "$sync_type" == "full" ]]; then
        echo -e "${YELLOW}⚠️  Full sync will fetch ALL orders from Printful${NC}"
        echo -e "${YELLOW}   This may take 5-10 minutes for ~800 orders${NC}"
    fi
    
    # Execute sync with progress indicator
    (
        if [[ "$sync_type" == "full" ]]; then
            node "$PROJECT_ROOT/scripts/sync-all-printful-orders.cjs"
        else
            # For incremental sync, modify the edge function call
            node -e "
                const { syncAllPrintfulOrders } = require('./scripts/sync-all-printful-orders.cjs');
                syncAllPrintfulOrders().then(() => process.exit(0)).catch(() => process.exit(1));
            " -- --incremental
        fi
    ) &
    
    local sync_pid=$!
    show_progress $sync_pid
    wait $sync_pid
    local exit_code=$?
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    if [[ $exit_code -eq 0 ]]; then
        echo -e "${GREEN}✅ Printful sync completed in ${duration}s${NC}"
    else
        echo -e "${RED}❌ Printful sync failed${NC}"
        return 1
    fi
}

# Function to check current data status
check_data_status() {
    echo -e "\n${CYAN}📊 Checking current data status...${NC}"
    
    # Use npx to run supabase commands
    local shopify_count=$(npx supabase db execute --local \
        --sql "SELECT COUNT(*) as count FROM shopify_orders" 2>/dev/null | grep -oE '[0-9]+' | head -1)
    local printful_count=$(npx supabase db execute --local \
        --sql "SELECT COUNT(*) as count FROM printful_orders" 2>/dev/null | grep -oE '[0-9]+' | head -1)
    
    echo -e "${BLUE}Current order counts:${NC}"
    echo -e "  Shopify orders:  ${shopify_count:-0}"
    echo -e "  Printful orders: ${printful_count:-0}"
}

# Function to handle rate limits
handle_rate_limit() {
    local service="$1"
    local wait_time="${2:-60}"
    
    echo -e "${YELLOW}⏳ Rate limit hit for ${service}. Waiting ${wait_time}s...${NC}"
    sleep "$wait_time"
}

# Main sync menu
show_sync_menu() {
    echo -e "\n${CYAN}Select sync option:${NC}"
    echo "1) Incremental sync (new orders only) - Recommended"
    echo "2) Full sync (all orders) - Use with caution"
    echo "3) Shopify only (incremental)"
    echo "4) Shopify only (full)"
    echo "5) Printful only (incremental)"
    echo "6) Printful only (full)"
    echo "0) Exit"
}

# Summary function
show_summary() {
    local start_count_shopify="$1"
    local start_count_printful="$2"
    
    echo -e "\n${BLUE}=== SYNC SUMMARY ===${NC}"
    
    # Get final counts
    local end_count_shopify=$(npx supabase db execute --local \
        --sql "SELECT COUNT(*) as count FROM shopify_orders" 2>/dev/null | grep -oE '[0-9]+' | head -1)
    local end_count_printful=$(npx supabase db execute --local \
        --sql "SELECT COUNT(*) as count FROM printful_orders" 2>/dev/null | grep -oE '[0-9]+' | head -1)
    
    local new_shopify=$((${end_count_shopify:-0} - ${start_count_shopify:-0}))
    local new_printful=$((${end_count_printful:-0} - ${start_count_printful:-0}))
    
    echo -e "${GREEN}Shopify:${NC}"
    echo -e "  Starting count: ${start_count_shopify:-0}"
    echo -e "  Final count:    ${end_count_shopify:-0}"
    echo -e "  New orders:     ${new_shopify}"
    
    echo -e "\n${GREEN}Printful:${NC}"
    echo -e "  Starting count: ${start_count_printful:-0}"
    echo -e "  Final count:    ${end_count_printful:-0}"
    echo -e "  New orders:     ${new_printful}"
    
    if [[ $new_shopify -gt 0 ]] || [[ $new_printful -gt 0 ]]; then
        echo -e "\n${GREEN}✅ Successfully synced ${new_shopify} Shopify and ${new_printful} Printful orders!${NC}"
    else
        echo -e "\n${YELLOW}ℹ️  No new orders found${NC}"
    fi
}

# Main execution
main() {
    # Check environment
    if ! check_env; then
        exit 1
    fi
    
    # Store initial counts
    local start_count_shopify=$(npx supabase db execute --local \
        --sql "SELECT COUNT(*) as count FROM shopify_orders" 2>/dev/null | grep -oE '[0-9]+' | head -1)
    local start_count_printful=$(npx supabase db execute --local \
        --sql "SELECT COUNT(*) as count FROM printful_orders" 2>/dev/null | grep -oE '[0-9]+' | head -1)
    
    # Check if running in non-interactive mode
    if [[ "$1" == "--auto" ]] || [[ "$1" == "--incremental" ]]; then
        check_data_status
        sync_shopify_orders "incremental"
        sync_printful_orders "incremental"
        show_summary "$start_count_shopify" "$start_count_printful"
        exit 0
    fi
    
    if [[ "$1" == "--full" ]]; then
        check_data_status
        sync_shopify_orders "full"
        sync_printful_orders "full"
        show_summary "$start_count_shopify" "$start_count_printful"
        exit 0
    fi
    
    # Interactive mode
    while true; do
        check_data_status
        show_sync_menu
        
        read -p "Enter choice: " choice
        
        case $choice in
            1)
                sync_shopify_orders "incremental"
                sync_printful_orders "incremental"
                show_summary "$start_count_shopify" "$start_count_printful"
                break
                ;;
            2)
                echo -e "${YELLOW}⚠️  WARNING: Full sync can take a long time and may hit rate limits${NC}"
                read -p "Are you sure? (y/N): " confirm
                if [[ "$confirm" =~ ^[Yy]$ ]]; then
                    sync_shopify_orders "full"
                    sync_printful_orders "full"
                    show_summary "$start_count_shopify" "$start_count_printful"
                fi
                break
                ;;
            3)
                sync_shopify_orders "incremental"
                show_summary "$start_count_shopify" "$start_count_printful"
                break
                ;;
            4)
                sync_shopify_orders "full"
                show_summary "$start_count_shopify" "$start_count_printful"
                break
                ;;
            5)
                sync_printful_orders "incremental"
                show_summary "$start_count_shopify" "$start_count_printful"
                break
                ;;
            6)
                sync_printful_orders "full"
                show_summary "$start_count_shopify" "$start_count_printful"
                break
                ;;
            0)
                echo -e "${CYAN}Exiting...${NC}"
                exit 0
                ;;
            *)
                echo -e "${RED}Invalid choice. Please try again.${NC}"
                ;;
        esac
    done
}

# Run main function
main "$@"