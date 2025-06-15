#!/bin/bash

echo "🔄 Syncing production database to local using pooler connection..."

# Database credentials
DB_PASSWORD="B445478e84Fknsd312s"
PROJECT_REF="dlmbqojnhjsecajxltzj"

# Pooler connection string (uses IPv4)
POOLER_URL="postgresql://postgres.${PROJECT_REF}:${DB_PASSWORD}@aws-0-us-east-2.pooler.supabase.com:6543/postgres"

# Check if Supabase is running
if ! npx supabase status --local > /dev/null 2>&1; then
    echo "❌ Supabase is not running. Starting it now..."
    npx supabase start
    sleep 5
fi

# Reset local database first
echo "🗑️  Resetting local database..."
npx supabase db reset --local

# Dump production data using pooler connection
echo "📥 Dumping production database via pooler..."
echo "Using pooler connection to avoid IPv6 issues..."

# Create dump using pg_dump directly with pooler URL
PGPASSWORD="${DB_PASSWORD}" pg_dump "${POOLER_URL}" \
    --data-only \
    --no-owner \
    --no-privileges \
    --no-comments \
    --disable-triggers \
    --schema=public \
    --schema=auth \
    -f temp_production_dump.sql

# Check if dump was successful
if [ ! -f temp_production_dump.sql ] || [ ! -s temp_production_dump.sql ]; then
    echo "❌ Failed to create database dump"
    echo "Trying alternative method with Docker..."
    
    # Alternative: Use Docker to run pg_dump
    docker run --rm \
        -e PGPASSWORD="${DB_PASSWORD}" \
        -v "$(pwd):/dump" \
        postgres:15 \
        pg_dump "${POOLER_URL}" \
        --data-only \
        --no-owner \
        --no-privileges \
        --no-comments \
        --disable-triggers \
        --schema=public \
        --schema=auth \
        -f /dump/temp_production_dump.sql
    
    if [ ! -f temp_production_dump.sql ] || [ ! -s temp_production_dump.sql ]; then
        echo "❌ Failed to create database dump with Docker method too"
        exit 1
    fi
fi

echo "✅ Database dump created successfully ($(du -h temp_production_dump.sql | cut -f1))"

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