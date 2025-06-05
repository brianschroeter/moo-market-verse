#!/bin/bash

# Test script for Printful sync function
# This script demonstrates how to call the sync function

SUPABASE_URL="https://dlmbqojnhjsecajxltzj.supabase.co"

# Check if service role key is provided
if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required"
    echo "💡 Usage: SUPABASE_SERVICE_ROLE_KEY=your_key ./scripts/test-printful-sync.sh"
    echo "📍 You can find the service role key in your Supabase project settings > API"
    exit 1
fi

echo "🚀 Testing Printful sync function..."
echo "📍 Endpoint: $SUPABASE_URL/functions/v1/sync-printful-orders"

# First, test with a regular incremental sync to verify the function works
echo "📋 Testing incremental sync first..."
curl -X POST "$SUPABASE_URL/functions/v1/sync-printful-orders" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{}' \
  --max-time 300 \
  --connect-timeout 30

echo -e "\n\n"

# Now test full sync
echo "🔄 Testing FULL SYNC (this will fetch ALL orders from Printful)..."
echo "⚠️  This may take several minutes for ~800 orders"

curl -X POST "$SUPABASE_URL/functions/v1/sync-printful-orders" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"fullSync": true, "forceAllOrders": true}' \
  --max-time 600 \
  --connect-timeout 30

echo -e "\n✅ Sync completed!"