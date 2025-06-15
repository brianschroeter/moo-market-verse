#!/bin/bash

echo "🔄 Syncing production database to local with custom connection..."

# Database credentials from .env.secrets
DB_PASSWORD="B445478e84Fknsd312s"
PROJECT_REF="dlmbqojnhjsecajxltzj"

# Check if Supabase is running
if ! npx supabase status --local > /dev/null 2>&1; then
    echo "❌ Supabase is not running. Starting it now..."
    npx supabase start
    sleep 5
fi

# Reset local database first
echo "🗑️  Resetting local database..."
npx supabase db reset --local

# Create a temporary .env file with production credentials
cat > .env.production.temp << EOF
POSTGRES_HOST=aws-0-us-east-2.pooler.supabase.com
POSTGRES_PORT=6543
POSTGRES_DB=postgres
POSTGRES_USER=postgres.${PROJECT_REF}
POSTGRES_PASSWORD=${DB_PASSWORD}
EOF

echo "📥 Dumping production database..."
echo ""
echo "Using pooler connection to avoid IPv6 issues..."
echo "Connection: aws-0-us-east-2.pooler.supabase.com:6543"
echo ""

# Use supabase db dump with custom connection string
POSTGRES_URL="postgresql://postgres.${PROJECT_REF}:${DB_PASSWORD}@aws-0-us-east-2.pooler.supabase.com:6543/postgres" \
npx supabase db dump \
    --data-only \
    --db-url "postgresql://postgres.${PROJECT_REF}:${DB_PASSWORD}@aws-0-us-east-2.pooler.supabase.com:6543/postgres" \
    -f temp_production_dump.sql

# Check if dump was successful
if [ ! -f temp_production_dump.sql ] || [ ! -s temp_production_dump.sql ]; then
    echo "❌ Failed to create database dump with supabase CLI"
    echo ""
    echo "Trying alternative method with curl to edge function..."
    
    # Alternative: Try using an edge function to export data
    curl -X POST "https://${PROJECT_REF}.supabase.co/functions/v1/export-database" \
        -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
        -H "Content-Type: application/json" \
        -o temp_production_dump.sql 2>/dev/null || true
    
    if [ ! -f temp_production_dump.sql ] || [ ! -s temp_production_dump.sql ]; then
        echo "❌ Edge function method also failed"
        
        # Final fallback: Direct psql with IPv4 forced
        echo ""
        echo "Final attempt: Using psql with IPv4 forced..."
        
        # Try to get IPv4 address
        IPV4_ADDR=$(host db.${PROJECT_REF}.supabase.co | grep "has address" | head -1 | awk '{print $4}' || echo "")
        
        if [ -n "$IPV4_ADDR" ]; then
            echo "Found IPv4 address: $IPV4_ADDR"
            PGPASSWORD="${DB_PASSWORD}" psql -h "$IPV4_ADDR" -p 5432 -U postgres -d postgres \
                --command "\\copy (SELECT 'Direct connection failed') TO STDOUT"
        fi
        
        # Clean up and exit
        rm -f .env.production.temp
        exit 1
    fi
fi

# Clean up temp env file
rm -f .env.production.temp

echo "✅ Database dump created successfully ($(du -h temp_production_dump.sql | cut -f1))"

# Import production data
echo "📤 Importing production data..."

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

# Clean up
rm -f temp_production_dump.sql

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
ORDER BY table_name;
"

echo "✅ Production data synced successfully!"