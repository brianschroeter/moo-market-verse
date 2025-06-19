#!/bin/bash

# Script to manually initialize missing collections using the edge function

echo "🚀 Initializing missing collections..."

# Get all collections from Shopify and initialize them
curl -X POST "https://dlmbqojnhjsecajxltzj.supabase.co/functions/v1/sync-shopify-products" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbWJxb2puaGpzZWNhanhsdHpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYzMTk2MTIsImV4cCI6MjA2MTg5NTYxMn0.hzwgFpTau4WYyOH_gEgmrdiF8026NnC_Ar2_sdRwkJo"

echo -e "\n✅ Sync complete! Check your admin panel at /admin/collection-order"