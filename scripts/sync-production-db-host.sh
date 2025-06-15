#!/bin/bash

echo "🔄 Syncing production database to local (host-based version)..."

# Database credentials
DB_PASSWORD="B445478e84Fknsd312s"
PROD_HOST="db.dlmbqojnhjsecajxltzj.supabase.co"
PROD_USER="postgres"
PROD_DB="postgres"

# Check if psql is available on host
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL client (psql) not found. Installing it..."
    
    # Try to install psql based on the system
    if command -v apt-get &> /dev/null; then
        sudo apt-get update && sudo apt-get install -y postgresql-client
    elif command -v brew &> /dev/null; then
        brew install postgresql
    else
        echo "❌ Cannot install psql automatically. Please install PostgreSQL client manually."
        exit 1
    fi
fi

# Check if pg_dump is available
if ! command -v pg_dump &> /dev/null; then
    echo "❌ pg_dump not found. Please install PostgreSQL client tools."
    exit 1
fi

# Check if Supabase is running
echo "🔗 Checking local Supabase status..."
if ! npx supabase status --local > /dev/null 2>&1; then
    echo "❌ Supabase is not running. Starting it now..."
    npx supabase start
    sleep 5
else
    echo "✅ Supabase is running"
fi

# Create dump file
DUMP_FILE="production_dump_$(date +%Y%m%d_%H%M%S).sql"

# Reset local database first
echo "🗑️  Resetting local database..."
npx supabase db reset --local

# Dump production database from host
echo "📥 Dumping production database (this may take a few minutes)..."
PGPASSWORD="$DB_PASSWORD" pg_dump -h "$PROD_HOST" -U "$PROD_USER" -d "$PROD_DB" \
    --no-owner \
    --no-privileges \
    --data-only \
    --exclude-schema=supabase_functions \
    --exclude-schema=storage \
    --exclude-schema=vault \
    --exclude-schema=auth \
    --exclude-schema=supabase_migrations \
    -f "$DUMP_FILE"

if [ $? -ne 0 ]; then
    echo "❌ Failed to dump production database"
    rm -f "$DUMP_FILE"
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

# Import to local database
echo "📤 Importing production data to local database..."
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres < "$DUMP_FILE"

if [ $? -ne 0 ]; then
    echo "❌ Failed to import production data"
    rm -f "$DUMP_FILE"
    exit 1
fi

# Clean up
rm -f "$DUMP_FILE"

# Verify the import
echo "🔍 Verifying imported data..."
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -c "
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