#!/bin/bash

# Sync Shopify products to database using edge function

# Check if environment file exists
if [ ! -f .env ]; then
    echo "Error: .env file not found"
    exit 1
fi

# Load environment variables
export $(cat .env | xargs)

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "Starting Shopify product sync..."

# Call the edge function
curl -X POST \
  "${VITE_PUBLIC_SUPABASE_URL}/functions/v1/sync-shopify-products" \
  -H "Authorization: Bearer ${VITE_SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{}' \
  -w "\n" | jq '.'

# Check if jq is installed for pretty printing
if ! command -v jq &> /dev/null; then
    echo -e "${RED}Warning: jq is not installed. Install it for pretty JSON output.${NC}"
fi

echo -e "${GREEN}Sync request sent!${NC}"