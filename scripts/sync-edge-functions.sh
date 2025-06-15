#!/bin/bash
# sync-edge-functions.sh - Download all edge functions from production
set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Production project reference
PROJECT_REF="dlmbqojnhjsecajxltzj"

# List of all edge functions (31 total)
FUNCTIONS=(
  "add-user-connection"
  "admin-schedule-slots-create"
  "admin-schedule-slots-delete"
  "admin-schedule-slots-list"
  "admin-schedule-slots-update"
  "admin-youtube-channels-create"
  "admin-youtube-channels-delete"
  "admin-youtube-channels-list"
  "admin-youtube-channels-update"
  "delete-newsletter-signup"
  "delete-ticket-response"
  "delete-user-connection"
  "delete-user"
  "get-enhanced-fingerprints"
  "get-leaderboard-stats"
  "get-newsletter-signups"
  "get-schedule"
  "get-shared-fingerprints"
  "get-shared-youtube-connections"
  "get-youtube-channel-details"
  "newsletter-subscribe"
  "order-linking"
  "printful-orders"
  "proxy-image"
  "shopify-orders"
  "shopify-storefront"
  "sync-printful-orders"
  "sync-youtube-streams"
  "update-ticket-response"
  "upsert-device"
  "verify-youtube"
)

echo -e "${GREEN}=== Edge Functions Sync Script ===${NC}"
echo "This script will download all edge functions from production"
echo "Project Reference: $PROJECT_REF"
echo "Total Functions: ${#FUNCTIONS[@]}"
echo ""

# Check if logged into Supabase CLI
echo -e "${YELLOW}Checking Supabase CLI login status...${NC}"
if ! npx supabase projects list &>/dev/null; then
    echo -e "${RED}Error: Not logged into Supabase CLI${NC}"
    echo "Please run: npx supabase login"
    exit 1
fi

# Confirm before proceeding
read -p "This will overwrite local edge functions. Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Operation cancelled"
    exit 0
fi

# Create backup of existing functions
if [ -d "supabase/functions" ]; then
    echo -e "${YELLOW}Creating backup of existing functions...${NC}"
    backup_dir="supabase/functions.backup.$(date +%Y%m%d_%H%M%S)"
    cp -r supabase/functions "$backup_dir"
    echo -e "${GREEN}Backup created: $backup_dir${NC}"
fi

# Download each function
success_count=0
failed_functions=()

for func in "${FUNCTIONS[@]}"; do
    echo -e "${YELLOW}Downloading: $func${NC}"
    if npx supabase functions download "$func" --project-ref "$PROJECT_REF" 2>/dev/null; then
        echo -e "${GREEN}✓ Downloaded: $func${NC}"
        ((success_count++))
    else
        echo -e "${RED}✗ Failed: $func${NC}"
        failed_functions+=("$func")
    fi
done

echo ""
echo -e "${GREEN}=== Summary ===${NC}"
echo "Successfully downloaded: $success_count/${#FUNCTIONS[@]} functions"

if [ ${#failed_functions[@]} -gt 0 ]; then
    echo -e "${RED}Failed functions:${NC}"
    for func in "${failed_functions[@]}"; do
        echo "  - $func"
    done
    echo ""
    echo "Note: Some functions may not exist in production or require special permissions"
fi

# Deploy functions locally
echo ""
echo -e "${YELLOW}Deploying functions to local Supabase...${NC}"
if npx supabase functions deploy; then
    echo -e "${GREEN}✓ Functions deployed successfully${NC}"
else
    echo -e "${RED}✗ Function deployment failed${NC}"
    echo "Please check the error messages above and try:"
    echo "  npx supabase functions deploy"
fi

echo ""
echo -e "${GREEN}Edge functions sync complete!${NC}"
echo ""

# Fetch and display production secrets
echo -e "${YELLOW}Fetching production secrets...${NC}"
SECRETS_OUTPUT=$(npx supabase secrets list --project-ref "$PROJECT_REF" 2>&1)

if [[ $? -eq 0 ]]; then
    echo ""
    echo "Production secrets found:"
    echo "$SECRETS_OUTPUT" | grep -E "^\s+[A-Z_]+" | sed 's/^[[:space:]]*/  - /'
    
    # Create secrets template
    SECRETS_FILE="scripts/production-secrets-template.sh"
    echo "#!/bin/bash" > "$SECRETS_FILE"
    echo "# Production secrets template - fill in the values" >> "$SECRETS_FILE"
    echo "# Generated on $(date)" >> "$SECRETS_FILE"
    echo "" >> "$SECRETS_FILE"
    echo "npx supabase secrets set \\" >> "$SECRETS_FILE"
    echo "$SECRETS_OUTPUT" | grep -E "^\s+[A-Z_]+" | while read -r line; do
        SECRET_NAME=$(echo "$line" | awk '{print $1}')
        echo "  $SECRET_NAME=\"YOUR_VALUE_HERE\" \\" >> "$SECRETS_FILE"
    done | sed '$ s/ \\$//' >> "$SECRETS_FILE"
    echo "  --local" >> "$SECRETS_FILE"
    chmod +x "$SECRETS_FILE"
    
    echo ""
    echo -e "${GREEN}Created secrets template: $SECRETS_FILE${NC}"
fi

echo ""
echo "Next steps:"
echo "1. Fill in and run the secrets template: ./scripts/production-secrets-template.sh"
echo "2. Test functions: curl http://localhost:54321/functions/v1/<function-name>"
echo "3. Check logs: npx supabase functions logs <function-name>"
echo ""
echo "Common secrets you'll need:"
echo "  - SHOPIFY_SHOP_DOMAIN"
echo "  - SHOPIFY_ADMIN_API_ACCESS_TOKEN"
echo "  - PRINTFUL_API_KEY"
echo "  - YOUTUBE_API_KEY"