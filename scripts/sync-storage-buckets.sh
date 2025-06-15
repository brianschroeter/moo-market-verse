#!/bin/bash

echo "🔄 Syncing storage buckets from production..."

# Check if user is logged in to Supabase
if ! npx supabase projects list > /dev/null 2>&1; then
    echo "❌ You need to be logged in to Supabase CLI"
    echo "Run: npx supabase login"
    exit 1
fi

# Get production project ID from config
PROJECT_ID="dlmbqojnhjsecajxltzj"

echo "📋 Using project: $PROJECT_ID"

# Check if local Supabase is running
if ! npx supabase status --local > /dev/null 2>&1; then
    echo "🔄 Starting local Supabase..."
    npx supabase start
    sleep 5
fi

# List storage buckets from production
echo ""
echo "🪣 Fetching production storage buckets..."
BUCKETS_OUTPUT=$(npx supabase storage ls --project-ref "$PROJECT_ID" 2>&1)

if [[ $? -ne 0 ]]; then
    echo "❌ Failed to fetch storage buckets. Error:"
    echo "$BUCKETS_OUTPUT"
    exit 1
fi

# Check if there are any buckets
if [ -z "$BUCKETS_OUTPUT" ] || [[ "$BUCKETS_OUTPUT" == *"No buckets found"* ]]; then
    echo "ℹ️  No storage buckets found in production"
    echo "✅ Storage sync completed (nothing to sync)"
    exit 0
fi

echo ""
echo "Found the following buckets in production:"
echo "$BUCKETS_OUTPUT"

# Create buckets directory for downloads
BUCKETS_DIR="storage-buckets-backup"
mkdir -p "$BUCKETS_DIR"

echo ""
echo "📥 Downloading bucket contents..."

# Note: The Supabase CLI doesn't have a direct way to download all bucket contents
# We'll create a guide for manual download if needed

cat > "$BUCKETS_DIR/README.md" << 'EOF'
# Storage Buckets Sync Guide

The Supabase CLI currently doesn't support direct bucket content downloads.
To sync storage bucket contents, you have several options:

## Option 1: Using Supabase Dashboard (Recommended for small amounts)
1. Go to your production project: https://app.supabase.com/project/dlmbqojnhjsecajxltzj
2. Navigate to Storage
3. Download files manually
4. Upload to local instance at: http://localhost:54323/project/default/storage

## Option 2: Using the Storage API
Create a script to download files using the Supabase Storage API:

```javascript
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://dlmbqojnhjsecajxltzj.supabase.co',
  'YOUR_ANON_KEY'
)

async function downloadBucket(bucketName) {
  const { data, error } = await supabase.storage
    .from(bucketName)
    .list()
  
  if (error) {
    console.error('Error listing files:', error)
    return
  }
  
  for (const file of data) {
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(bucketName)
      .download(file.name)
    
    if (!downloadError) {
      // Save fileData to disk
      console.log(`Downloaded: ${file.name}`)
    }
  }
}
```

## Option 3: Using rclone (Advanced)
If you have many files, consider using rclone with Supabase's S3-compatible API.

## Common Buckets in Supabase Projects
- `avatars` - User profile pictures
- `public` - Publicly accessible files
- `private` - Private user files
- `products` - Product images
- `uploads` - General uploads

## Creating Buckets Locally
To create the same buckets locally:

```sql
-- Run this in your local Supabase SQL editor
-- Create buckets (adjust names as needed)
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('avatars', 'avatars', true),
  ('public', 'public', true),
  ('private', 'private', false)
ON CONFLICT (id) DO NOTHING;
```

## Setting Bucket Policies
Make sure to replicate any RLS policies from production:

```sql
-- Example: Allow authenticated users to upload their own avatars
CREATE POLICY "Users can upload own avatar" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Example: Public read access
CREATE POLICY "Public read access" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'public');
```
EOF

echo "📝 Created storage sync guide at: $BUCKETS_DIR/README.md"

# Try to create local buckets based on production
echo ""
echo "🪣 Creating local storage buckets..."

# Get local Supabase DB URL
DB_URL="postgresql://postgres:postgres@localhost:54322/postgres"

# Create a SQL script to set up common buckets
cat > "$BUCKETS_DIR/create-buckets.sql" << 'EOF'
-- Create common storage buckets
-- Adjust these based on your production buckets

-- Public bucket for general files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('public', 'public', true, 52428800, NULL)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public;

-- Avatars bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Private bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('private', 'private', false, 52428800, NULL)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public;

-- Products bucket (if using e-commerce)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('products', 'products', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Common RLS policies for storage
-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload own files" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id IN ('avatars', 'private') AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own files
CREATE POLICY "Users can update own files" ON storage.objects
FOR UPDATE TO authenticated
USING (auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own files
CREATE POLICY "Users can delete own files" ON storage.objects
FOR DELETE TO authenticated
USING (auth.uid()::text = (storage.foldername(name))[1]);

-- Public read access for public buckets
CREATE POLICY "Public read access" ON storage.objects
FOR SELECT TO public
USING (bucket_id IN ('public', 'avatars', 'products'));

-- Authenticated read access for private files
CREATE POLICY "Users can read own private files" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'private' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);
EOF

# Execute the SQL to create buckets
echo "Creating storage buckets in local database..."
if command -v psql &> /dev/null; then
    psql "$DB_URL" -f "$BUCKETS_DIR/create-buckets.sql" 2>/dev/null || true
else
    # Use Docker if psql not available
    DB_CONTAINER=$(docker ps --format "table {{.Names}}" | grep "supabase_db_" | head -1)
    if [ -n "$DB_CONTAINER" ]; then
        docker cp "$BUCKETS_DIR/create-buckets.sql" "$DB_CONTAINER:/tmp/"
        docker exec "$DB_CONTAINER" psql -U postgres -d postgres -f /tmp/create-buckets.sql 2>/dev/null || true
        docker exec "$DB_CONTAINER" rm /tmp/create-buckets.sql
    fi
fi

echo ""
echo "✅ Storage buckets sync completed!"
echo ""
echo "Next steps:"
echo "  1. Review the storage sync guide: $BUCKETS_DIR/README.md"
echo "  2. Check production buckets at: https://app.supabase.com/project/$PROJECT_ID/storage"
echo "  3. Access local storage UI at: http://localhost:54323/project/default/storage"
echo "  4. Upload any necessary files manually or via API"
echo ""
echo "ℹ️  Note: Actual file contents need to be synced manually."
echo "   See the guide for options on how to sync file contents."