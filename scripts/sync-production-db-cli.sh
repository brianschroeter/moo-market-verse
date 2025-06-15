#!/bin/bash

echo "🔄 Syncing production database to local (using Supabase CLI)..."

# Check if we're logged in to Supabase
echo "🔗 Checking Supabase authentication..."
if ! npx supabase projects list > /dev/null 2>&1; then
    echo "❌ Not logged into Supabase CLI. Please run: npx supabase login"
    exit 1
fi

# Check if we're linked to the project
echo "🔗 Checking project link..."
PROJECT_REF=$(npx supabase projects list 2>/dev/null | grep dlmbqojnhjsecajxltzj | awk '{print $1}')
if [ -z "$PROJECT_REF" ]; then
    echo "🔗 Linking to production project..."
    npx supabase link --project-ref dlmbqojnhjsecajxltzj
fi

# Get database password from environment
DB_PASSWORD="B445478e84Fknsd312s"

# Reset local database first
echo "🗑️  Resetting local database..."
npx supabase db reset --local

# Create dump file name
DUMP_FILE="production_dump_$(date +%Y%m%d_%H%M%S).sql"

# Dump production data using Supabase CLI with correct syntax
echo "📥 Dumping production database (this may take a few minutes)..."
echo "$DB_PASSWORD" | npx supabase db dump --data-only --linked -f "$DUMP_FILE"

if [ ! -f "$DUMP_FILE" ]; then
    echo "❌ Failed to create database dump"
    exit 1
fi

# Check dump file size
DUMP_SIZE=$(stat -c%s "$DUMP_FILE" 2>/dev/null || stat -f%z "$DUMP_FILE")
if [ "$DUMP_SIZE" -lt 1000 ]; then
    echo "❌ Database dump appears to be empty or too small"
    rm -f "$DUMP_FILE"
    exit 1
fi

echo "✅ Database dump created successfully (size: $DUMP_SIZE bytes)"

# Import the data to local database
echo "📤 Importing production data to local database..."

# Find the Docker container
DB_CONTAINER=$(docker ps --format "table {{.Names}}" | grep "supabase_db_" | head -1)
if [ -z "$DB_CONTAINER" ]; then
    echo "❌ Could not find Supabase DB container"
    rm -f "$DUMP_FILE"
    exit 1
fi

# Import using Docker
docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres < "$DUMP_FILE"

if [ $? -ne 0 ]; then
    echo "❌ Failed to import production data"
    rm -f "$DUMP_FILE"
    exit 1
fi

# Clean up
rm -f "$DUMP_FILE"

# Verify the import
echo "🔍 Verifying imported data..."
docker exec "$DB_CONTAINER" psql -U postgres -d postgres -c "
SELECT 
    'Profiles' as table_name, COUNT(*) as count FROM public.profiles
UNION ALL SELECT 
    'Discord Connections', COUNT(*) FROM public.discord_connections  
UNION ALL SELECT 
    'YouTube Connections', COUNT(*) FROM public.youtube_connections
UNION ALL SELECT 
    'Shopify Orders', COUNT(*) FROM public.shopify_orders
UNION ALL SELECT
    'User Devices', COUNT(*) FROM public.user_devices
UNION ALL SELECT
    'Support Tickets', COUNT(*) FROM public.support_tickets
ORDER BY table_name;
"

# Generate TypeScript types
echo "📝 Generating TypeScript types..."
npx supabase gen types typescript --local > src/integrations/supabase/types.ts

echo "✅ Production data synced successfully!"
echo ""
echo "💡 Next steps:"
echo "   - If Shopify orders count is low, run: ./scripts/sync-shopify-orders.sh"
echo "   - Check the data in Supabase Studio: http://127.0.0.1:54323"