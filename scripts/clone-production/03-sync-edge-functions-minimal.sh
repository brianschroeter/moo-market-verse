#!/bin/bash

# Minimal Edge Functions Sync - Only deploy essential functions with available secrets

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SECRETS_FILE="$SCRIPT_DIR/.env.secrets"

echo -e "${BLUE}===================================${NC}"
echo -e "${BLUE}Minimal Edge Functions Deployment${NC}"
echo -e "${BLUE}===================================${NC}"

# Load available secrets
if [ -f "$SECRETS_FILE" ]; then
    source "$SECRETS_FILE"
fi

cd "$PROJECT_ROOT"

# Deploy edge functions
echo -e "${BLUE}Deploying edge functions...${NC}"
npx supabase functions deploy

# Set only available secrets
echo -e "${BLUE}Setting available secrets...${NC}"

# Core secrets (required)
if [ ! -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo -e "${GREEN}Setting SUPABASE_SERVICE_ROLE_KEY${NC}"
    npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY"
fi

# YouTube API (available)
if [ ! -z "$YOUTUBE_API_KEY" ]; then
    echo -e "${GREEN}Setting YOUTUBE_API_KEY${NC}"
    npx supabase secrets set YOUTUBE_API_KEY="$YOUTUBE_API_KEY"
fi

# Shopify (available)
if [ ! -z "$SHOPIFY_ADMIN_API_ACCESS_TOKEN" ]; then
    echo -e "${GREEN}Setting Shopify secrets${NC}"
    npx supabase secrets set SHOPIFY_ADMIN_API_ACCESS_TOKEN="$SHOPIFY_ADMIN_API_ACCESS_TOKEN"
    npx supabase secrets set SHOPIFY_SHOP_DOMAIN="$SHOPIFY_SHOP_DOMAIN"
    npx supabase secrets set SHOPIFY_API_VERSION="$SHOPIFY_API_VERSION"
fi

# Printful (available)
if [ ! -z "$PRINTFUL_API_KEY" ]; then
    echo -e "${GREEN}Setting PRINTFUL_API_KEY${NC}"
    npx supabase secrets set PRINTFUL_API_KEY="$PRINTFUL_API_KEY"
fi

# Set placeholder values for missing optional secrets (for local dev only)
echo -e "${YELLOW}Setting placeholder values for optional secrets...${NC}"
npx supabase secrets set DISCORD_CLIENT_ID="placeholder-local-dev"
npx supabase secrets set DISCORD_CLIENT_SECRET="placeholder-local-dev"
npx supabase secrets set FINGERPRINT_API_KEY="placeholder-local-dev"
npx supabase secrets set RESEND_API_KEY="placeholder-local-dev"

echo -e "${GREEN}✅ Edge functions deployed with available secrets!${NC}"
echo -e "${YELLOW}Note: Discord OAuth, Fingerprint, and Resend features won't work with placeholders${NC}"