#!/bin/bash

echo "Testing manage-youtube-api-keys function with test action..."

curl -X POST "https://dlmbqojnhjsecajxltzj.supabase.co/functions/v1/manage-youtube-api-keys" \
  -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "test",
    "api_key": "test-key-123"
  }' | jq '.'