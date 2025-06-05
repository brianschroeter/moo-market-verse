#!/bin/bash

echo "🔄 Syncing production database to local..."

# Dump production data
echo "📥 Dumping production database..."
npx supabase db dump --data-only --linked -f temp_production_dump.sql

# Reset local database
echo "🗑️  Resetting local database..."
npx supabase db reset --local

# Import production data
echo "📤 Importing production data..."
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres < temp_production_dump.sql

# Clean up
rm temp_production_dump.sql

echo "✅ Production data synced successfully!"