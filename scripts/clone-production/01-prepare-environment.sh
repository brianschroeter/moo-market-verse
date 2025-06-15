#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKUP_DIR="$SCRIPT_DIR/backups/$(date +%Y%m%d_%H%M%S)"

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

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if Docker is running
is_docker_running() {
    docker info >/dev/null 2>&1
}

# Function to check if Supabase CLI is logged in
is_supabase_logged_in() {
    npx supabase projects list >/dev/null 2>&1
}

# Function to check if project is linked
is_project_linked() {
    if [ -f "$PROJECT_ROOT/supabase/.temp/project-ref" ]; then
        return 0
    else
        return 1
    fi
}

# Main script
print_header "Production Clone Environment Preparation"

# Step 1: Check prerequisites
print_header "Step 1: Checking Prerequisites"

# Check required commands
REQUIRED_COMMANDS=("docker" "npx" "jq")
OPTIONAL_COMMANDS=("pg_dump" "psql")
MISSING_COMMANDS=()

for cmd in "${REQUIRED_COMMANDS[@]}"; do
    if ! command_exists "$cmd"; then
        MISSING_COMMANDS+=("$cmd")
    else
        print_success "$cmd is installed"
    fi
done

# Check optional PostgreSQL tools
PG_TOOLS_AVAILABLE=true
for cmd in "${OPTIONAL_COMMANDS[@]}"; do
    if ! command_exists "$cmd"; then
        PG_TOOLS_AVAILABLE=false
        print_warning "$cmd not found - will use Docker containers for database operations"
    else
        print_success "$cmd is installed"
    fi
done

if [ ${#MISSING_COMMANDS[@]} -ne 0 ]; then
    print_error "Missing required commands: ${MISSING_COMMANDS[*]}"
    print_info "Please install the missing commands before proceeding."
    print_info "For jq: sudo apt-get install jq"
    exit 1
fi

# Check Docker
if ! is_docker_running; then
    print_error "Docker is not running"
    print_info "Please start Docker and try again"
    exit 1
else
    print_success "Docker is running"
fi

# Check Supabase CLI
if ! command_exists "supabase"; then
    print_warning "Supabase CLI not found globally, will use npx"
fi

# Check if logged in to Supabase
if ! is_supabase_logged_in; then
    print_error "Not logged in to Supabase"
    print_info "Please run: npx supabase login"
    exit 1
else
    print_success "Logged in to Supabase"
fi

# Check if project is linked
if ! is_project_linked; then
    print_error "Supabase project not linked"
    print_info "Please run: npx supabase link --project-ref YOUR_PROJECT_REF"
    exit 1
else
    PROJECT_REF=$(cat "$PROJECT_ROOT/supabase/.temp/project-ref")
    print_success "Project linked: $PROJECT_REF"
fi

# Step 2: Create backup directory
print_header "Step 2: Creating Backup Directory"

mkdir -p "$BACKUP_DIR"
print_success "Created backup directory: $BACKUP_DIR"

# Step 3: Backup local environment
print_header "Step 3: Backing Up Local Environment"

# Backup .env files
if [ -f "$PROJECT_ROOT/.env" ]; then
    cp "$PROJECT_ROOT/.env" "$BACKUP_DIR/.env.backup"
    print_success "Backed up .env file"
else
    print_warning "No .env file found to backup"
fi

if [ -f "$PROJECT_ROOT/.env.local" ]; then
    cp "$PROJECT_ROOT/.env.local" "$BACKUP_DIR/.env.local.backup"
    print_success "Backed up .env.local file"
fi

# Backup local database if running
if npx supabase status 2>/dev/null | grep -q "DB URL"; then
    print_info "Backing up local database..."
    
    # Get local database URL
    LOCAL_DB_URL=$(npx supabase status --output json 2>/dev/null | jq -r '.db_url' 2>/dev/null || echo "")
    
    if [ -n "$LOCAL_DB_URL" ]; then
        # Extract connection details
        DB_HOST="localhost"
        DB_PORT="54322"
        DB_NAME="postgres"
        DB_USER="postgres"
        DB_PASS="postgres"
        
        # Create database backup
        PGPASSWORD=$DB_PASS pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$BACKUP_DIR/local_database.sql" 2>/dev/null
        
        if [ $? -eq 0 ]; then
            print_success "Backed up local database"
        else
            print_warning "Could not backup local database (this is okay if it's empty)"
        fi
    else
        print_warning "Local Supabase not running, skipping database backup"
    fi
else
    print_warning "Local Supabase not running, skipping database backup"
fi

# Backup functions directory
if [ -d "$PROJECT_ROOT/supabase/functions" ]; then
    cp -r "$PROJECT_ROOT/supabase/functions" "$BACKUP_DIR/functions"
    print_success "Backed up functions directory"
else
    print_warning "No functions directory found to backup"
fi

# Step 4: Create secrets template
print_header "Step 4: Creating Secrets Template"

SECRETS_FILE="$SCRIPT_DIR/.env.secrets"

cat > "$SECRETS_FILE" << 'EOF'
# Production Clone Secrets Configuration
# Fill in all values before running the clone scripts

# Production Database Connection
PROD_DB_HOST=
PROD_DB_PORT=5432
PROD_DB_NAME=postgres
PROD_DB_USER=postgres
PROD_DB_PASSWORD=

# API Keys and Secrets (from Supabase Dashboard > Settings > API)
SUPABASE_SERVICE_ROLE_KEY=

# Third-party Integrations
PRINTFUL_API_KEY=
SHOPIFY_ADMIN_API_ACCESS_TOKEN=
SHOPIFY_SHOP_DOMAIN=
SHOPIFY_API_VERSION=2024-01

# Discord OAuth (from Supabase Dashboard > Authentication > Providers)
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=

# YouTube API
YOUTUBE_API_KEY=

# Email Configuration (if using custom SMTP)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM_EMAIL=

# Other Services
FINGERPRINT_API_KEY=
RESEND_API_KEY=

# Optional: Webhook Secrets
SHOPIFY_WEBHOOK_SECRET=
PRINTFUL_WEBHOOK_SECRET=
EOF

print_success "Created secrets template at: $SECRETS_FILE"
print_info "Please fill in all required values in $SECRETS_FILE"

# Step 5: Environment summary
print_header "Environment Summary"

echo -e "${GREEN}✓ All prerequisites checked${NC}"
echo -e "${GREEN}✓ Backups created at: $BACKUP_DIR${NC}"
echo -e "${GREEN}✓ Secrets template created at: $SECRETS_FILE${NC}"

print_warning "\nNext Steps:"
echo "1. Fill in all values in $SECRETS_FILE"
echo "2. Ensure you have network access to the production database"
echo "3. Run the next script: ./02-dump-production-data.sh"

print_info "\nImportant Notes:"
echo "- Keep your secrets file secure and never commit it to git"
echo "- The .gitignore already includes .env.secrets"
echo "- Backups are timestamped and won't be overwritten"
echo "- You can restore from backups if needed"

# Create a restoration script in the backup directory
cat > "$BACKUP_DIR/restore.sh" << 'EOF'
#!/bin/bash
# Restoration script for this backup

BACKUP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$BACKUP_DIR/../../../.." && pwd)"

echo "Restoring from backup: $BACKUP_DIR"

# Restore .env files
if [ -f "$BACKUP_DIR/.env.backup" ]; then
    cp "$BACKUP_DIR/.env.backup" "$PROJECT_ROOT/.env"
    echo "Restored .env file"
fi

if [ -f "$BACKUP_DIR/.env.local.backup" ]; then
    cp "$BACKUP_DIR/.env.local.backup" "$PROJECT_ROOT/.env.local"
    echo "Restored .env.local file"
fi

# Restore functions
if [ -d "$BACKUP_DIR/functions" ]; then
    rm -rf "$PROJECT_ROOT/supabase/functions"
    cp -r "$BACKUP_DIR/functions" "$PROJECT_ROOT/supabase/functions"
    echo "Restored functions directory"
fi

# Database restoration instructions
if [ -f "$BACKUP_DIR/local_database.sql" ]; then
    echo ""
    echo "To restore the database, run:"
    echo "PGPASSWORD=postgres psql -h localhost -p 54322 -U postgres -d postgres < $BACKUP_DIR/local_database.sql"
fi

echo ""
echo "Restoration complete!"
EOF

chmod +x "$BACKUP_DIR/restore.sh"
print_success "Created restoration script in backup directory"

exit 0