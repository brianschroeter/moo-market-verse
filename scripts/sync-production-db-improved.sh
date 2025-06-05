#!/bin/bash

echo "🔄 Syncing production database to local (improved version)..."

# Check if we're linked to production
echo "🔗 Checking Supabase connection..."
npx supabase projects list > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "❌ Not logged into Supabase CLI. Please run: npx supabase login"
    exit 1
fi

# Get database password
echo "💡 You'll be prompted for your Supabase database password"
read -s -p "Enter Supabase database password: " DB_PASSWORD
echo

# Production database connection details
PROD_HOST="db.dlmbqojnhjsecajxltzj.supabase.co"
PROD_USER="postgres"
PROD_DB="postgres"

# Reset local database first
echo "🗑️  Resetting local database..."
npx supabase db reset

# Tables to sync (in order of dependencies)
TABLES=(
    "public.profiles"
    "public.user_roles" 
    "public.discord_connections"
    "public.discord_guilds"
    "public.youtube_connections"
    "public.youtube_memberships"
    "public.youtube_channels"
    "public.user_devices"
    "public.shopify_orders"
    "public.printful_orders" 
    "public.shopify_printful_order_links"
    "public.order_mappings"
    "public.support_tickets"
    "public.ticket_messages"
    "public.announcements"
    "public.featured_products"
    "public.menu_items"
    "public.newsletter_signups"
)

# Function to sync a single table
sync_table() {
    local table=$1
    echo "📥 Syncing table: $table"
    
    # Get row count from production
    local prod_count=$(PGPASSWORD="$DB_PASSWORD" psql -h "$PROD_HOST" -U "$PROD_USER" -d "$PROD_DB" -t -c "SELECT COUNT(*) FROM $table;" 2>/dev/null | xargs)
    
    if [ -z "$prod_count" ]; then
        echo "⚠️  Could not get count for $table, skipping..."
        return
    fi
    
    echo "   Production has $prod_count rows"
    
    if [ "$prod_count" = "0" ]; then
        echo "   Table is empty, skipping..."
        return
    fi
    
    # Create dump for this table
    local dump_file="${table//\./_}_dump.sql"
    PGPASSWORD="$DB_PASSWORD" pg_dump -h "$PROD_HOST" -U "$PROD_USER" -d "$PROD_DB" \
        --data-only \
        --no-owner \
        --no-privileges \
        --table="$table" \
        --file="$dump_file" 2>/dev/null
    
    if [ ! -f "$dump_file" ]; then
        echo "   ❌ Failed to create dump for $table"
        return
    fi
    
    # Check if dump has reasonable size
    local dump_size=$(stat -c%s "$dump_file" 2>/dev/null || stat -f%z "$dump_file")
    if [ "$dump_size" -lt 100 ]; then
        echo "   ⚠️  Dump file too small, skipping $table"
        rm "$dump_file"
        return
    fi
    
    # Import the data
    local db_container=$(docker ps --format "table {{.Names}}" | grep supabase_db | head -1)
    if [ -z "$db_container" ]; then
        echo "   ❌ Could not find database container"
        rm "$dump_file"
        return
    fi
    
    docker exec -i "$db_container" psql -U postgres -d postgres < "$dump_file" 2>/dev/null
    
    # Verify import
    local local_count=$(docker exec "$db_container" psql -U postgres -d postgres -t -c "SELECT COUNT(*) FROM $table;" 2>/dev/null | xargs)
    echo "   ✅ Imported $local_count rows"
    
    # Clean up
    rm "$dump_file"
}

# Find the correct Docker container for local Supabase
echo "🐳 Finding Supabase Docker container..."
DB_CONTAINER=$(docker ps --format "table {{.Names}}" | grep supabase_db | head -1)

if [ -z "$DB_CONTAINER" ]; then
    echo "❌ Could not find Supabase database container"
    echo "Available containers:"
    docker ps --format "table {{.Names}}\t{{.Image}}"
    exit 1
fi

echo "📦 Found database container: $DB_CONTAINER"

# Sync each table
for table in "${TABLES[@]}"; do
    sync_table "$table"
done

echo "🔍 Final verification..."
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

echo "✅ Production data sync completed!"
echo "💡 If shopify_orders count seems low, try running: ./scripts/sync-shopify-orders.sh"