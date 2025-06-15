#!/bin/bash

echo "Testing API key debug function..."

curl -X POST "https://dlmbqojnhjsecajxltzj.supabase.co/functions/v1/test-api-key-function" \
  -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"test": true}' | jq '.'