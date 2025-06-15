#!/bin/bash

# Set Edge Function Secrets for Local Development
# This script sets all required secrets for edge functions

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== Setting Edge Function Secrets ===${NC}"
echo

# Load environment variables from .env.secrets
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if [ -f "$PROJECT_ROOT/.env.secrets" ]; then
    # Source the file to get variables
    set -a
    source "$PROJECT_ROOT/.env.secrets"
    set +a
    echo -e "${GREEN}✅ Loaded secrets from .env.secrets${NC}"
else
    echo -e "${YELLOW}⚠️  No .env.secrets file found${NC}"
    echo "Please ensure .env.secrets contains your production credentials"
    exit 1
fi

# Set secrets
echo -e "\n${YELLOW}Setting secrets...${NC}"

# YouTube API Key
if [ ! -z "${YOUTUBE_API_KEY:-}" ] && [[ ! "$YOUTUBE_API_KEY" =~ ^your- ]]; then
    npx supabase secrets set YOUTUBE_API_KEY="$YOUTUBE_API_KEY"
    echo -e "${GREEN}✅ Set YOUTUBE_API_KEY${NC}"
else
    echo -e "${YELLOW}⚠️  Skipped YOUTUBE_API_KEY (not configured)${NC}"
fi

# Shopify Configuration
if [ ! -z "${SHOPIFY_SHOP_DOMAIN:-}" ] && [[ ! "$SHOPIFY_SHOP_DOMAIN" =~ ^your- ]]; then
    npx supabase secrets set SHOPIFY_SHOP_DOMAIN="$SHOPIFY_SHOP_DOMAIN"
    npx supabase secrets set SHOPIFY_ADMIN_API_ACCESS_TOKEN="$SHOPIFY_ADMIN_API_ACCESS_TOKEN"
    npx supabase secrets set SHOPIFY_API_VERSION="$SHOPIFY_API_VERSION"
    echo -e "${GREEN}✅ Set Shopify secrets${NC}"
else
    echo -e "${YELLOW}⚠️  Skipped Shopify secrets (not configured)${NC}"
fi

# Printful API Key
if [ ! -z "${PRINTFUL_API_KEY:-}" ] && [[ ! "$PRINTFUL_API_KEY" =~ ^your- ]]; then
    npx supabase secrets set PRINTFUL_API_KEY="$PRINTFUL_API_KEY"
    echo -e "${GREEN}✅ Set PRINTFUL_API_KEY${NC}"
else
    echo -e "${YELLOW}⚠️  Skipped PRINTFUL_API_KEY (not configured)${NC}"
fi

# Service Role Key (for admin functions)
if [ ! -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ] && [[ ! "$SUPABASE_SERVICE_ROLE_KEY" =~ ^your- ]]; then
    npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY"
    echo -e "${GREEN}✅ Set SUPABASE_SERVICE_ROLE_KEY${NC}"
else
    echo -e "${YELLOW}⚠️  Skipped SUPABASE_SERVICE_ROLE_KEY (not configured)${NC}"
fi

echo -e "\n${BLUE}Verifying secrets...${NC}"
npx supabase secrets list

echo -e "\n${GREEN}✅ Secrets configuration complete!${NC}"
