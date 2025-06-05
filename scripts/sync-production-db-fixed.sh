#!/bin/bash

echo "🔄 Syncing production database to local..."

# Check if we're linked to production
echo "🔗 Checking Supabase connection..."
npx supabase projects list > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "❌ Not logged into Supabase CLI. Please run: npx supabase login"
    exit 1
fi

# Dump production data with password prompt
echo "📥 Dumping production database..."
echo "💡 You'll be prompted for your Supabase database password"
npx supabase db dump --data-only --linked -f temp_production_dump.sql

if [ ! -f temp_production_dump.sql ]; then
    echo "❌ Failed to create production dump"
    exit 1
fi

# Check if dump has actual data (not just schema)
DUMP_SIZE=$(stat -c%s temp_production_dump.sql 2>/dev/null || stat -f%z temp_production_dump.sql)
if [ "$DUMP_SIZE" -lt 1000 ]; then
    echo "⚠️  Dump file seems too small ($DUMP_SIZE bytes). May be schema-only or empty."
    echo "📄 First few lines of dump:"
    head -10 temp_production_dump.sql
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        rm temp_production_dump.sql
        exit 1
    fi
fi

echo "📊 Dump file size: $(ls -lh temp_production_dump.sql | awk '{print $5}')"

# Reset local database
echo "🗑️  Resetting local database..."
npx supabase db reset

# Find the correct Docker container for local Supabase
echo "🐳 Finding Supabase Docker container..."
DB_CONTAINER=$(docker ps --format "table {{.Names}}" | grep supabase_db | head -1)

if [ -z "$DB_CONTAINER" ]; then
    echo "❌ Could not find Supabase database container"
    echo "Available containers:"
    docker ps --format "table {{.Names}}\t{{.Image}}"
    rm temp_production_dump.sql
    exit 1
fi

echo "📤 Importing production data using container: $DB_CONTAINER"
docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres < temp_production_dump.sql

if [ $? -eq 0 ]; then
    # Verify import
    echo "🔍 Verifying import..."
    docker exec "$DB_CONTAINER" psql -U postgres -d postgres -c "SELECT 'Profiles:', COUNT(*) FROM public.profiles;"
    docker exec "$DB_CONTAINER" psql -U postgres -d postgres -c "SELECT 'Discord Connections:', COUNT(*) FROM public.discord_connections;"
    docker exec "$DB_CONTAINER" psql -U postgres -d postgres -c "SELECT 'YouTube Connections:', COUNT(*) FROM public.youtube_connections;"
    
    echo "✅ Production data synced successfully!"
else
    echo "❌ Failed to import production data"
fi

# Clean up
rm temp_production_dump.sql