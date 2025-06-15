#!/bin/bash

# Clone Production Environment Orchestrator
# This script manages the complete production cloning process
# Usage: ./clone-production.sh [options]

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLONE_SCRIPTS_DIR="$SCRIPT_DIR/clone-production"
LOG_DIR="$SCRIPT_DIR/logs"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
MAIN_LOG="$LOG_DIR/clone_production_${TIMESTAMP}.log"
SUMMARY_FILE="$LOG_DIR/clone_summary_${TIMESTAMP}.txt"

# Default options
SKIP_PREPARE=false
SKIP_DATABASE=false
SKIP_FUNCTIONS=false
SKIP_STORAGE=false
SKIP_VERIFY=false
VERBOSE=false
DRY_RUN=false
AUTO_YES=false

# Track execution status
declare -A PHASE_STATUS
declare -A PHASE_DURATION
START_TIME=$(date +%s)

# Source common functions
if [ -f "$CLONE_SCRIPTS_DIR/common.sh" ]; then
    source "$CLONE_SCRIPTS_DIR/common.sh"
else
    echo "Error: Could not find common.sh in $CLONE_SCRIPTS_DIR"
    exit 1
fi

# Function to display usage
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Orchestrates the complete production environment cloning process.

OPTIONS:
    -h, --help              Show this help message
    -v, --verbose           Enable verbose output
    -y, --yes               Automatically answer yes to prompts
    --dry-run               Show what would be executed without running
    --skip-prepare          Skip environment preparation phase
    --skip-database         Skip database sync phase
    --skip-functions        Skip edge functions sync phase
    --skip-storage          Skip storage sync phase
    --skip-verify           Skip verification phase
    --only <phase>          Run only the specified phase
                           (prepare|database|functions|storage|verify)

EXAMPLES:
    # Run complete clone process
    ./clone-production.sh

    # Skip storage sync (useful for quick updates)
    ./clone-production.sh --skip-storage

    # Run only database sync
    ./clone-production.sh --only database

    # Dry run to see what would be executed
    ./clone-production.sh --dry-run

EOF
}

# Function to log messages
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    echo "[$timestamp] [$level] $message" >> "$MAIN_LOG"
    
    case $level in
        ERROR)
            echo -e "${RED}[ERROR]${NC} $message" >&2
            ;;
        WARNING)
            echo -e "${YELLOW}[WARNING]${NC} $message"
            ;;
        INFO)
            echo -e "${BLUE}[INFO]${NC} $message"
            ;;
        SUCCESS)
            echo -e "${GREEN}[SUCCESS]${NC} $message"
            ;;
        PROGRESS)
            echo -e "${CYAN}[PROGRESS]${NC} $message"
            ;;
        *)
            echo "$message"
            ;;
    esac
}

# Function to create required directories
setup_directories() {
    mkdir -p "$LOG_DIR"
    mkdir -p "$CLONE_SCRIPTS_DIR/logs"
}

# Function to check prerequisites
check_prerequisites() {
    log "INFO" "Checking prerequisites..."
    
    local missing_tools=()
    
    # Check required tools
    for tool in git docker node npm npx; do
        if ! command -v $tool &> /dev/null; then
            missing_tools+=($tool)
        fi
    done
    
    # Check for Supabase CLI via npx
    if ! npx supabase --version &> /dev/null; then
        missing_tools+=("supabase-cli")
    fi
    
    # Check for psql - but it's optional since we can use Docker
    if ! command -v psql &> /dev/null; then
        log "WARNING" "psql not found - will use Docker containers for database operations"
    fi
    
    if [ ${#missing_tools[@]} -gt 0 ]; then
        log "ERROR" "Missing required tools: ${missing_tools[*]}"
        log "ERROR" "Please install missing tools before proceeding"
        return 1
    fi
    
    # Check if we're in a git repository
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        log "ERROR" "Not in a git repository"
        return 1
    fi
    
    # Check if clone scripts exist
    local required_scripts=(
        "01-prepare-environment.sh"
        "02-sync-database.sh"
        "03-sync-edge-functions.sh"
        "04-sync-storage.sh"
        "07-verify-clone.sh"
    )
    
    for script in "${required_scripts[@]}"; do
        if [ ! -f "$CLONE_SCRIPTS_DIR/$script" ]; then
            log "ERROR" "Missing required script: $script"
            return 1
        fi
    done
    
    log "SUCCESS" "All prerequisites satisfied"
    return 0
}

# Function to display progress bar
show_progress() {
    local current=$1
    local total=$2
    local phase=$3
    local percent=$((current * 100 / total))
    local filled=$((percent / 2))
    local empty=$((50 - filled))
    
    printf "\r${CYAN}[PROGRESS]${NC} %s: [" "$phase"
    printf "%${filled}s" | tr ' ' '='
    printf "%${empty}s" | tr ' ' ' '
    printf "] %d%%" "$percent"
    
    if [ $current -eq $total ]; then
        echo
    fi
}

# Function to execute a phase
execute_phase() {
    local phase_name=$1
    local script_name=$2
    local description=$3
    
    if [ "$DRY_RUN" = true ]; then
        log "INFO" "[DRY RUN] Would execute: $phase_name - $description"
        PHASE_STATUS[$phase_name]="SKIPPED (DRY RUN)"
        return 0
    fi
    
    log "PROGRESS" "Starting $phase_name: $description"
    
    local phase_start=$(date +%s)
    local phase_log="$LOG_DIR/${phase_name}_${TIMESTAMP}.log"
    
    # Execute the script
    if [ "$VERBOSE" = true ]; then
        if bash "$CLONE_SCRIPTS_DIR/$script_name" 2>&1 | tee "$phase_log"; then
            PHASE_STATUS[$phase_name]="SUCCESS"
            log "SUCCESS" "Completed $phase_name"
        else
            PHASE_STATUS[$phase_name]="FAILED"
            log "ERROR" "Failed $phase_name - check $phase_log for details"
            return 1
        fi
    else
        if bash "$CLONE_SCRIPTS_DIR/$script_name" > "$phase_log" 2>&1; then
            PHASE_STATUS[$phase_name]="SUCCESS"
            log "SUCCESS" "Completed $phase_name"
        else
            PHASE_STATUS[$phase_name]="FAILED"
            log "ERROR" "Failed $phase_name - check $phase_log for details"
            return 1
        fi
    fi
    
    local phase_end=$(date +%s)
    PHASE_DURATION[$phase_name]=$((phase_end - phase_start))
    
    return 0
}

# Function to confirm action
confirm_action() {
    local message=$1
    
    if [ "$AUTO_YES" = true ]; then
        return 0
    fi
    
    echo -e "${YELLOW}$message${NC}"
    read -p "Continue? (y/N) " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        return 1
    fi
    
    return 0
}

# Function to generate summary report
generate_summary() {
    local end_time=$(date +%s)
    local total_duration=$((end_time - START_TIME))
    
    {
        echo "======================================"
        echo "Production Clone Summary Report"
        echo "======================================"
        echo "Date: $(date)"
        echo "Total Duration: $(format_duration $total_duration)"
        echo ""
        echo "Phase Results:"
        echo "--------------------------------------"
        
        for phase in "PREPARE" "DATABASE" "FUNCTIONS" "STORAGE" "VERIFY"; do
            if [ -n "${PHASE_STATUS[$phase]:-}" ]; then
                local status="${PHASE_STATUS[$phase]}"
                local duration="${PHASE_DURATION[$phase]:-0}"
                printf "%-15s %-20s %s\n" "$phase:" "$status" "$(format_duration $duration)"
            fi
        done
        
        echo ""
        echo "Log Files:"
        echo "--------------------------------------"
        echo "Main Log: $MAIN_LOG"
        
        for phase in "PREPARE" "DATABASE" "FUNCTIONS" "STORAGE" "VERIFY"; do
            if [ -n "${PHASE_STATUS[$phase]:-}" ]; then
                echo "$phase Log: $LOG_DIR/${phase}_${TIMESTAMP}.log"
            fi
        done
        
        echo ""
        echo "Next Steps:"
        echo "--------------------------------------"
        
        # Check for any failures
        local has_failure=false
        for phase in "${!PHASE_STATUS[@]}"; do
            if [[ "${PHASE_STATUS[$phase]}" == "FAILED" ]]; then
                has_failure=true
                echo "- Review and fix issues in $phase phase"
            fi
        done
        
        if [ "$has_failure" = false ]; then
            echo "- All phases completed successfully!"
            echo "- Your local environment is now a clone of production"
            echo "- Remember to update any local-specific configurations"
            echo "- Test thoroughly before making changes"
        fi
        
        echo "======================================"
    } | tee "$SUMMARY_FILE"
    
    log "INFO" "Summary report saved to: $SUMMARY_FILE"
}

# Function to format duration
format_duration() {
    local duration=$1
    local hours=$((duration / 3600))
    local minutes=$(((duration % 3600) / 60))
    local seconds=$((duration % 60))
    
    if [ $hours -gt 0 ]; then
        printf "%dh %dm %ds" $hours $minutes $seconds
    elif [ $minutes -gt 0 ]; then
        printf "%dm %ds" $minutes $seconds
    else
        printf "%ds" $seconds
    fi
}

# Function to handle cleanup on exit
cleanup() {
    local exit_code=$?
    
    if [ $exit_code -ne 0 ]; then
        log "WARNING" "Script interrupted or failed"
    fi
    
    generate_summary
    
    exit $exit_code
}

# Main execution function
main() {
    # Set up signal handlers
    trap cleanup EXIT INT TERM
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                usage
                exit 0
                ;;
            -v|--verbose)
                VERBOSE=true
                shift
                ;;
            -y|--yes)
                AUTO_YES=true
                shift
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --skip-prepare)
                SKIP_PREPARE=true
                shift
                ;;
            --skip-database)
                SKIP_DATABASE=true
                shift
                ;;
            --skip-functions)
                SKIP_FUNCTIONS=true
                shift
                ;;
            --skip-storage)
                SKIP_STORAGE=true
                shift
                ;;
            --skip-verify)
                SKIP_VERIFY=true
                shift
                ;;
            --only)
                shift
                case $1 in
                    prepare)
                        SKIP_DATABASE=true
                        SKIP_FUNCTIONS=true
                        SKIP_STORAGE=true
                        SKIP_VERIFY=true
                        ;;
                    database)
                        SKIP_PREPARE=true
                        SKIP_FUNCTIONS=true
                        SKIP_STORAGE=true
                        SKIP_VERIFY=true
                        ;;
                    functions)
                        SKIP_PREPARE=true
                        SKIP_DATABASE=true
                        SKIP_STORAGE=true
                        SKIP_VERIFY=true
                        ;;
                    storage)
                        SKIP_PREPARE=true
                        SKIP_DATABASE=true
                        SKIP_FUNCTIONS=true
                        SKIP_VERIFY=true
                        ;;
                    verify)
                        SKIP_PREPARE=true
                        SKIP_DATABASE=true
                        SKIP_FUNCTIONS=true
                        SKIP_STORAGE=true
                        ;;
                    *)
                        log "ERROR" "Invalid phase: $1"
                        usage
                        exit 1
                        ;;
                esac
                shift
                ;;
            *)
                log "ERROR" "Unknown option: $1"
                usage
                exit 1
                ;;
        esac
    done
    
    # Setup directories
    setup_directories
    
    # Start logging
    log "INFO" "Starting production clone process"
    log "INFO" "Log file: $MAIN_LOG"
    
    # Check prerequisites
    if ! check_prerequisites; then
        log "ERROR" "Prerequisites check failed"
        exit 1
    fi
    
    # Display clone plan
    echo
    log "INFO" "Clone Execution Plan:"
    [ "$SKIP_PREPARE" = false ] && log "INFO" "  ✓ Environment Preparation"
    [ "$SKIP_DATABASE" = false ] && log "INFO" "  ✓ Database Sync"
    [ "$SKIP_FUNCTIONS" = false ] && log "INFO" "  ✓ Edge Functions Sync"
    [ "$SKIP_STORAGE" = false ] && log "INFO" "  ✓ Storage Sync"
    [ "$SKIP_VERIFY" = false ] && log "INFO" "  ✓ Verification"
    echo
    
    # Confirm before proceeding
    if ! confirm_action "This will clone the production environment to your local setup."; then
        log "INFO" "Clone process cancelled by user"
        exit 0
    fi
    
    # Execute phases
    local total_phases=0
    local current_phase=0
    
    # Count total phases
    [ "$SKIP_PREPARE" = false ] && ((total_phases++)) || true
    [ "$SKIP_DATABASE" = false ] && ((total_phases++)) || true
    [ "$SKIP_FUNCTIONS" = false ] && ((total_phases++)) || true
    [ "$SKIP_STORAGE" = false ] && ((total_phases++)) || true
    [ "$SKIP_VERIFY" = false ] && ((total_phases++)) || true
    
    # Phase 1: Environment Preparation
    if [ "$SKIP_PREPARE" = false ]; then
        ((current_phase++)) || true
        show_progress $current_phase $total_phases "Environment Preparation"
        if ! execute_phase "PREPARE" "01-prepare-environment.sh" "Preparing local environment"; then
            log "ERROR" "Environment preparation failed"
            exit 1
        fi
    fi
    
    # Phase 2: Database Sync
    if [ "$SKIP_DATABASE" = false ]; then
        ((current_phase++)) || true
        show_progress $current_phase $total_phases "Database Sync"
        if ! execute_phase "DATABASE" "02-sync-database.sh" "Syncing production database"; then
            log "ERROR" "Database sync failed"
            exit 1
        fi
    fi
    
    # Phase 3: Edge Functions Sync
    if [ "$SKIP_FUNCTIONS" = false ]; then
        ((current_phase++)) || true
        show_progress $current_phase $total_phases "Edge Functions"
        if ! execute_phase "FUNCTIONS" "03-sync-edge-functions.sh" "Syncing edge functions"; then
            log "ERROR" "Edge functions sync failed"
            exit 1
        fi
    fi
    
    # Phase 4: Storage Sync
    if [ "$SKIP_STORAGE" = false ]; then
        ((current_phase++)) || true
        show_progress $current_phase $total_phases "Storage Sync"
        if ! execute_phase "STORAGE" "04-sync-storage.sh" "Syncing storage buckets"; then
            log "ERROR" "Storage sync failed"
            exit 1
        fi
    fi
    
    # Phase 5: Verification
    if [ "$SKIP_VERIFY" = false ]; then
        ((current_phase++)) || true
        show_progress $current_phase $total_phases "Verification"
        if ! execute_phase "VERIFY" "07-verify-clone.sh" "Verifying clone integrity"; then
            log "WARNING" "Verification reported issues - review the logs"
        fi
    fi
    
    log "SUCCESS" "Production clone process completed!"
}

# Execute main function
main "$@"