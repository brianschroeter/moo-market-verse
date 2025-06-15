#!/bin/bash

# Storage Buckets Sync - Fixed for local
# This script creates storage buckets locally matching production

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo -e "${GREEN}=== Storage Buckets Sync ===${NC}"
echo "Creating storage buckets for local development"
echo

# Common buckets for LolCow Portal
BUCKETS=(
    "avatars:public"
    "public:public"
    "private:private"
    "products:public"
    "tickets:private"
)

# Local Supabase Storage API
LOCAL_STORAGE_URL="http://127.0.0.1:54321/storage/v1"
LOCAL_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"
LOCAL_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"

# Function to create bucket
create_bucket() {
    local name=$1
    local public=$2
    
    echo -e "${YELLOW}Creating bucket: $name (${public})${NC}"
    
    # Create bucket payload
    local payload=$(cat <<EOF
{
    "id": "$name",
    "name": "$name",
    "public": $([ "$public" == "public" ] && echo "true" || echo "false"),
    "file_size_limit": 52428800,
    "allowed_mime_types": null
}
EOF
)
    
    # Create bucket
    local response=$(curl -s -X POST \
        -H "Authorization: Bearer $LOCAL_SERVICE_KEY" \
        -H "apikey: $LOCAL_SERVICE_KEY" \
        -H "Content-Type: application/json" \
        -d "$payload" \
        "$LOCAL_STORAGE_URL/bucket")
    
    # Check if bucket was created or already exists
    if echo "$response" | grep -q "Bucket already exists" || echo "$response" | grep -q "\"id\":\"$name\""; then
        echo -e "${GREEN}✅ Bucket '$name' ready${NC}"
    else
        echo -e "${RED}❌ Failed to create bucket '$name': $response${NC}"
    fi
}

# Create all buckets
for bucket_config in "${BUCKETS[@]}"; do
    IFS=':' read -r name visibility <<< "$bucket_config"
    create_bucket "$name" "$visibility"
done

# Set up RLS policies for buckets
echo -e "\n${YELLOW}Setting up RLS policies...${NC}"

# Create SQL file for policies
cat > "$SCRIPT_DIR/storage-policies.sql" << 'EOF'
-- Storage bucket policies for LolCow Portal

-- Avatars bucket: Public read, authenticated users can upload their own
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Public bucket: Public read, admin write
CREATE POLICY "Public files are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'public');

CREATE POLICY "Only admins can upload to public bucket"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'public' 
    AND EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    )
);

-- Products bucket: Public read, admin write
CREATE POLICY "Product images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'products');

CREATE POLICY "Only admins can manage product images"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'products' 
    AND EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    )
);

-- Private bucket: Authenticated read, admin write
CREATE POLICY "Authenticated users can view private files"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'private' 
    AND auth.uid() IS NOT NULL
);

CREATE POLICY "Only admins can upload to private bucket"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'private' 
    AND EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    )
);

-- Tickets bucket: Users can access their own ticket attachments
CREATE POLICY "Users can view their own ticket attachments"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'tickets' 
    AND (
        auth.uid()::text = (storage.foldername(name))[1]
        OR EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    )
);

CREATE POLICY "Users can upload ticket attachments"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'tickets' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);
EOF

# Apply policies
echo -e "${YELLOW}Applying storage policies...${NC}"
DB_CONTAINER=$(docker ps --format "table {{.Names}}" | grep "supabase_db_" | head -1)

if [ ! -z "$DB_CONTAINER" ]; then
    docker cp "$SCRIPT_DIR/storage-policies.sql" "$DB_CONTAINER:/tmp/"
    docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres -f /tmp/storage-policies.sql 2>&1 | grep -E "(CREATE POLICY|ERROR)" || true
    docker exec "$DB_CONTAINER" rm /tmp/storage-policies.sql
    rm "$SCRIPT_DIR/storage-policies.sql"
    echo -e "${GREEN}✅ Storage policies applied${NC}"
else
    echo -e "${RED}❌ Could not apply policies - database container not found${NC}"
fi

echo -e "\n${GREEN}✅ Storage buckets sync complete!${NC}"
echo
echo -e "${BLUE}Created buckets:${NC}"
for bucket_config in "${BUCKETS[@]}"; do
    IFS=':' read -r name visibility <<< "$bucket_config"
    echo "  - $name ($visibility)"
done

echo -e "\n${YELLOW}Note:${NC} To sync actual files from production, you'll need to:"
echo "1. Export files from production Supabase dashboard"
echo "2. Upload them to local buckets at: http://127.0.0.1:54323"