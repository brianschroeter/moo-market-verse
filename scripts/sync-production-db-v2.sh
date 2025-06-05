#!/bin/bash

echo "🔄 Syncing production database to local..."

# Dump production data
echo "📥 Dumping production database..."
npx supabase db dump --data-only --linked -f temp_production_dump.sql

if [ ! -f temp_production_dump.sql ]; then
    echo "❌ Failed to create production dump"
    exit 1
fi

echo "📊 Dump file size: $(ls -lh temp_production_dump.sql | awk '{print $5}')"

# Reset local database
echo "🗑️  Resetting local database..."
npx supabase db reset

# Import production data using Docker
echo "📤 Importing production data..."
docker exec -i supabase_db_dlmbqojnhjsecajxltzj psql -U postgres -d postgres < temp_production_dump.sql

# Verify import
echo "🔍 Verifying import..."
docker exec supabase_db_dlmbqojnhjsecajxltzj psql -U postgres -d postgres -c "SELECT 'Profiles:', COUNT(*) FROM public.profiles;"

# Clean up
rm temp_production_dump.sql

echo "✅ Production data synced successfully!"