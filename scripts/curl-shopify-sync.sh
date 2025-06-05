#!/bin/bash

echo "🛒 Triggering Shopify sync via curl..."

SUPABASE_URL="https://dlmbqojnhjsecajxltzj.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbWJxb2puaGpzZWNhanhsdHpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYzMTk2MTIsImV4cCI6MjA2MTg5NTYxMn0.hzwgFpTau4WYyOH_gEgmrdiF8026NnC_Ar2_sdRwkJo"

echo "📤 Calling shopify-orders function..."

curl -X POST \
  "${SUPABASE_URL}/functions/v1/shopify-orders" \
  -H "Content-Type: application/json" \
  -H "apikey: ${ANON_KEY}" \
  -d '{"action": "sync-orders-to-db"}' \
  -v

echo ""
echo "🎉 Sync request completed!"