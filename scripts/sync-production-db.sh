#!/bin/bash

echo "🔄 Syncing production database to local..."

# Database password
DB_PASSWORD="B445478e84Fknsd312s"

# Check if Supabase is running
if ! npx supabase status --local > /dev/null 2>&1; then
    echo "❌ Supabase is not running. Starting it now..."
    npx supabase start
    sleep 5
fi

# Reset local database first
echo "🗑️  Resetting local database..."
npx supabase db reset --local

# Dump production data
echo "📥 Dumping production database..."
echo ""
echo "When prompted, enter this password: $DB_PASSWORD"
echo ""
npx supabase db dump --data-only --linked -f temp_production_dump.sql

# Check if dump was successful
if [ ! -f temp_production_dump.sql ] || [ ! -s temp_production_dump.sql ]; then
    echo "❌ Failed to create database dump"
    exit 1
fi

echo "✅ Database dump created successfully"

# Import production data
echo "📤 Importing production data..."

# Check if psql is available, otherwise use Docker
if command -v psql &> /dev/null; then
    psql postgresql://postgres:postgres@127.0.0.1:54322/postgres < temp_production_dump.sql
else
    echo "Using Docker to import data (psql not found locally)..."
    # Get the Supabase DB container name
    DB_CONTAINER=$(docker ps --format "table {{.Names}}" | grep "supabase_db_" | head -1)
    if [ -z "$DB_CONTAINER" ]; then
        echo "Error: Supabase DB container not found. Is Supabase running?"
        exit 1
    fi
    # Copy SQL file to container and execute
    docker cp temp_production_dump.sql "$DB_CONTAINER:/tmp/"
    docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres -f /tmp/temp_production_dump.sql
    docker exec "$DB_CONTAINER" rm /tmp/temp_production_dump.sql
fi

# Clean up
rm -f temp_production_dump.sql

# Verify the import
echo "🔍 Verifying imported data..."
DB_CONTAINER=$(docker ps --format "table {{.Names}}" | grep "supabase_db_" | head -1)
if [ -n "$DB_CONTAINER" ]; then
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
    ORDER BY table_name;
    "
fi

echo "✅ Production data synced successfully!"