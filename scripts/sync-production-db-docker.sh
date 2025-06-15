#!/bin/bash

echo "🔄 Syncing production database to local (Docker-based version)..."

# Database credentials from .env.secrets
DB_PASSWORD="B445478e84Fknsd312s"
PROD_HOST="db.dlmbqojnhjsecajxltzj.supabase.co"
PROD_USER="postgres"
PROD_DB="postgres"

# Check if Supabase is running
echo "🔗 Checking local Supabase status..."
if ! npx supabase status --local > /dev/null 2>&1; then
    echo "❌ Supabase is not running. Starting it now..."
    npx supabase start
    sleep 5
else
    echo "✅ Supabase is running"
fi

# Find the Docker container
DB_CONTAINER=$(docker ps --format "table {{.Names}}" | grep "supabase_db_" | head -1)
if [ -z "$DB_CONTAINER" ]; then
    echo "❌ Could not find Supabase DB container"
    exit 1
fi
echo "🐳 Using container: $DB_CONTAINER"

# Create a temporary dump file
DUMP_FILE="/tmp/production_dump_$(date +%Y%m%d_%H%M%S).sql"

# Dump production database using Docker - try with IPv4 forcing
echo "📥 Dumping production database (this may take a few minutes)..."
# Force IPv4 by using the connection string format
docker exec "$DB_CONTAINER" bash -c "pg_dump 'postgresql://$PROD_USER:$DB_PASSWORD@$PROD_HOST:5432/$PROD_DB?sslmode=require' --no-owner --no-privileges --data-only --exclude-schema=supabase_functions --exclude-schema=storage --exclude-schema=vault --exclude-schema=auth --exclude-schema=supabase_migrations > $DUMP_FILE"

if [ $? -ne 0 ]; then
    echo "❌ Failed to dump production database"
    exit 1
fi

# Check if dump file has content
DUMP_SIZE=$(docker exec "$DB_CONTAINER" stat -c%s "$DUMP_FILE" 2>/dev/null || echo "0")
if [ "$DUMP_SIZE" -lt 1000 ]; then
    echo "❌ Database dump appears to be empty or too small"
    docker exec "$DB_CONTAINER" rm -f "$DUMP_FILE"
    exit 1
fi

echo "✅ Database dump created successfully (size: $DUMP_SIZE bytes)"

# Reset local database first
echo "🗑️  Resetting local database..."
npx supabase db reset --local

# Import the production data
echo "📤 Importing production data..."
docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres < <(docker exec "$DB_CONTAINER" cat "$DUMP_FILE")

if [ $? -ne 0 ]; then
    echo "❌ Failed to import production data"
    docker exec "$DB_CONTAINER" rm -f "$DUMP_FILE"
    exit 1
fi

# Clean up dump file in container
docker exec "$DB_CONTAINER" rm -f "$DUMP_FILE"

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

echo "✅ Production data synced successfully!"
echo ""
echo "💡 Next steps:"
echo "   - Generate TypeScript types: npx supabase gen types typescript --local"
echo "   - If Shopify orders count is low, run: ./scripts/sync-shopify-orders.sh"
echo "   - Check the data in Supabase Studio: http://127.0.0.1:54323"