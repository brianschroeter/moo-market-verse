#!/bin/bash

# Test YouTube sync using local anon key instead of edge function

set -euo pipefail

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== Direct YouTube Sync Test ===${NC}"

# Get local anon key
ANON_KEY=$(npx supabase status | grep "anon key" | awk '{print $3}')
API_URL="http://127.0.0.1:54321"

echo -e "${YELLOW}Testing edge function directly...${NC}"

# Test with minimal config first
CONFIG='{
  "lookBackHours": 24,
  "lookAheadHours": 24,
  "maxResults": 5
}'

# Call the edge function with local anon key
RESPONSE=$(curl -s -X POST \
  "$API_URL/functions/v1/sync-youtube-streams" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "$CONFIG")

echo -e "${BLUE}Response:${NC}"
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"

# If it still fails, let's check what env vars the edge function can see
echo -e "\n${YELLOW}Checking edge function environment...${NC}"

# Create a test edge function to check env vars
mkdir -p supabase/functions/test-env

cat > supabase/functions/test-env/index.ts << 'EOF'
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const envVars = {
    YOUTUBE_API_KEY: Deno.env.get('YOUTUBE_API_KEY') || 'NOT_SET',
    SUPABASE_URL: Deno.env.get('SUPABASE_URL') || 'NOT_SET',
    hasYouTubeKey: !!Deno.env.get('YOUTUBE_API_KEY'),
    allEnvKeys: Object.keys(Deno.env.toObject()).filter(k => !k.includes('SUPABASE_SERVICE_ROLE'))
  }

  return new Response(
    JSON.stringify(envVars, null, 2),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
EOF

echo -e "${BLUE}Testing environment variables...${NC}"
curl -s "$API_URL/functions/v1/test-env" \
  -H "Authorization: Bearer $ANON_KEY" | python3 -m json.tool 2>/dev/null || echo "Failed to check env"

# Clean up test function
rm -rf supabase/functions/test-env