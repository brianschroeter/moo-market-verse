#!/bin/bash
# common.sh - Common functions and utilities for clone-production scripts

# Color codes for output
export RED='\033[0;31m'
export GREEN='\033[0;32m'
export YELLOW='\033[1;33m'
export BLUE='\033[0;34m'
export MAGENTA='\033[0;35m'
export CYAN='\033[0;36m'
export NC='\033[0m' # No Color

# Standard paths
export CLONE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export PROJECT_ROOT="$(cd "$CLONE_DIR/../.." && pwd)"
export BACKUP_DIR="$CLONE_DIR/backups"
export LOGS_DIR="$CLONE_DIR/logs"
export TEMPLATES_DIR="$CLONE_DIR/templates"

# Create necessary directories
mkdir -p "$BACKUP_DIR" "$LOGS_DIR"

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

log_section() {
    echo -e "\n${CYAN}=== $1 ===${NC}"
}

# Spinner function for long-running operations
spinner() {
    local pid=$1
    local delay=0.1
    local spinstr='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
    
    while [ "$(ps a | awk '{print $1}' | grep -w $pid)" ]; do
        local temp=${spinstr#?}
        printf " [%c]  " "$spinstr"
        local spinstr=$temp${spinstr%"$temp"}
        sleep $delay
        printf "\b\b\b\b\b\b"
    done
    printf "    \b\b\b\b"
}

# Check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Load environment variables from .env.secrets
load_secrets() {
    local secrets_file="$PROJECT_ROOT/.env.secrets"
    
    if [ ! -f "$secrets_file" ]; then
        log_error "Secrets file not found: $secrets_file"
        log_info "Please copy and fill out the template:"
        log_info "  cp $TEMPLATES_DIR/secrets.template $secrets_file"
        return 1
    fi
    
    # Source the file
    set -a
    source "$secrets_file"
    set +a
    
    log_success "Loaded secrets from .env.secrets"
}

# Check if Supabase is running
is_supabase_running() {
    if command_exists docker; then
        docker ps | grep -q "supabase_db_" && docker ps | grep -q "supabase_kong_"
    else
        return 1
    fi
}

# Start Supabase if not running
ensure_supabase_running() {
    if ! is_supabase_running; then
        log_info "Starting Supabase..."
        cd "$PROJECT_ROOT" && npx supabase start
    else
        log_info "Supabase is already running"
    fi
}

# Create a timestamped backup name
create_backup_name() {
    local prefix=$1
    echo "${prefix}_$(date +%Y%m%d_%H%M%S)"
}

# Clean up old backups (keep last N)
cleanup_old_backups() {
    local pattern=$1
    local keep_count=${2:-5}
    
    local count=$(ls -1 "$BACKUP_DIR"/${pattern}* 2>/dev/null | wc -l)
    if [ $count -gt $keep_count ]; then
        ls -1t "$BACKUP_DIR"/${pattern}* | tail -n +$((keep_count + 1)) | xargs rm -rf
        log_info "Cleaned up old backups (kept last $keep_count)"
    fi
}

# Check prerequisites for all scripts
check_prerequisites() {
    local missing=()
    
    # Check for npx
    if ! command_exists "npx"; then
        missing+=("npx (Node.js)")
    fi
    
    # Check for Docker
    if ! command_exists "docker"; then
        missing+=("docker")
    fi
    
    # Check for Supabase CLI via npx
    if ! npx supabase --version >/dev/null 2>&1; then
        missing+=("supabase CLI (install with: npm install -g supabase)")
    fi
    
    # Check for psql - but it's optional since we can use Docker
    if ! command_exists "psql"; then
        log_warning "psql not found - will use Docker containers for database operations"
    fi
    
    if [ ${#missing[@]} -gt 0 ]; then
        log_error "Missing required tools: ${missing[*]}"
        log_info "Please install the missing tools and try again"
        return 1
    fi
    
    # Check if Docker is running
    if ! docker ps >/dev/null 2>&1; then
        log_error "Docker is not running"
        log_info "Please start Docker and try again"
        return 1
    fi
    
    return 0
}

# Export common variables
export -f log_info log_success log_warning log_error log_section
export -f spinner command_exists load_secrets
export -f is_supabase_running ensure_supabase_running
export -f create_backup_name cleanup_old_backups
export -f check_prerequisites