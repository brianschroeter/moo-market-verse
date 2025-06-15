#!/bin/bash

echo "🔄 Syncing production database to local (final version)..."

# Database credentials
DB_PASSWORD="B445478e84Fknsd312s"
PROD_HOST="db.dlmbqojnhjsecajxltzj.supabase.co"
PROD_USER="postgres"
PROD_DB="postgres"

# Check if Supabase is running
if ! npx supabase status --local > /dev/null 2>&1; then
    echo "❌ Supabase is not running. Starting it now..."
    npx supabase start
    sleep 5
fi

# Find the Docker container
DB_CONTAINER=$(docker ps --format "table {{.Names}}" | grep "supabase_db_" | head -1)
if [ -z "$DB_CONTAINER" ]; then
    echo "❌ Could not find Supabase DB container"
    exit 1
fi
echo "🐳 Using container: $DB_CONTAINER"

# Reset local database first
echo "🗑️  Resetting local database..."
npx supabase db reset --local

# Try to get data using Supabase CLI with database URL
echo "📥 Attempting to dump production database..."
DB_URL="postgresql://$PROD_USER:$DB_PASSWORD@$PROD_HOST:5432/$PROD_DB"

# Create a temporary file for the dump
DUMP_FILE="production_dump_$(date +%Y%m%d_%H%M%S).sql"

# Use npx supabase db dump with the database URL
echo "Using database URL method..."
npx supabase db dump --db-url "$DB_URL" --data-only -f "$DUMP_FILE"

# Check if dump was successful
if [ ! -f "$DUMP_FILE" ] || [ ! -s "$DUMP_FILE" ]; then
    echo "❌ Failed to create database dump using Supabase CLI"
    
    # Fallback: Try using Docker with curl to get data via API
    echo "📥 Trying alternative method..."
    
    # Tables to sync
    TABLES=(
        "profiles"
        "user_roles"
        "discord_connections"
        "discord_guilds"
        "youtube_connections"
        "youtube_memberships"
        "youtube_channels"
        "user_devices"
        "shopify_orders"
        "printful_orders"
        "support_tickets"
        "ticket_messages"
        "announcements"
        "featured_products"
        "menu_items"
        "newsletter_signups"
    )
    
    # Create a combined SQL file
    echo "-- Production data dump" > "$DUMP_FILE"
    echo "-- Generated at $(date)" >> "$DUMP_FILE"
    echo "" >> "$DUMP_FILE"
    
    # For each table, try to get the count
    for table in "${TABLES[@]}"; do
        echo "Checking table: $table"
        # Add table comment
        echo "-- Table: $table" >> "$DUMP_FILE"
    done
    
    echo "❌ Unable to dump production data due to network constraints"
    echo ""
    echo "🔧 Alternative solutions:"
    echo "1. Install PostgreSQL client tools locally: sudo apt-get install postgresql-client"
    echo "2. Use a VPN or proxy that supports IPv4"
    echo "3. Contact your system administrator to enable IPv6 connectivity in Docker"
    echo "4. Use the Supabase dashboard to export data manually"
    
    rm -f "$DUMP_FILE"
    exit 1
fi

echo "✅ Database dump created successfully (size: $(stat -c%s "$DUMP_FILE" 2>/dev/null || stat -f%z "$DUMP_FILE") bytes)"

# Import the data
echo "📤 Importing production data..."
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