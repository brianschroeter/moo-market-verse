#!/bin/bash

echo "🔗 Testing production database connection using Docker..."

# Production database connection details
PROD_HOST="db.dlmbqojnhjsecajxltzj.supabase.co"
PROD_USER="postgres"
PROD_DB="postgres"

echo "Host: $PROD_HOST"
echo "User: $PROD_USER"
echo "Database: $PROD_DB"
echo

# Get password
read -s -p "Enter Supabase database password: " DB_PASSWORD
echo
echo

# Find local Supabase container to use psql from it
DB_CONTAINER=$(docker ps --format "table {{.Names}}" | grep supabase_db | head -1)

if [ -z "$DB_CONTAINER" ]; then
    echo "❌ Could not find Supabase database container"
    echo "Available containers:"
    docker ps --format "table {{.Names}}\t{{.Image}}"
    exit 1
fi

echo "🐳 Using container: $DB_CONTAINER"
echo

# Test basic connection
echo "🧪 Testing basic connection..."
docker exec "$DB_CONTAINER" bash -c "PGPASSWORD='$DB_PASSWORD' psql -h '$PROD_HOST' -U '$PROD_USER' -d '$PROD_DB' -c \"SELECT 'Connection successful!' as status;\"" 2>&1

echo
echo "📊 Testing shopify_orders count..."
docker exec "$DB_CONTAINER" bash -c "PGPASSWORD='$DB_PASSWORD' psql -h '$PROD_HOST' -U '$PROD_USER' -d '$PROD_DB' -c \"SELECT COUNT(*) as shopify_orders_count FROM public.shopify_orders;\"" 2>&1

echo
echo "📊 Testing recent orders (sample)..."
docker exec "$DB_CONTAINER" bash -c "PGPASSWORD='$DB_PASSWORD' psql -h '$PROD_HOST' -U '$PROD_USER' -d '$PROD_DB' -c \"SELECT shopify_order_number, customer_name, total_amount, order_date FROM public.shopify_orders ORDER BY order_date DESC LIMIT 5;\"" 2>&1

echo
echo "📊 Testing table sizes..."
docker exec "$DB_CONTAINER" bash -c "PGPASSWORD='$DB_PASSWORD' psql -h '$PROD_HOST' -U '$PROD_USER' -d '$PROD_DB' -c \"
SELECT 
    tablename,
    pg_size_pretty(pg_total_relation_size('public.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN ('shopify_orders', 'profiles', 'discord_connections', 'youtube_connections')
ORDER BY pg_total_relation_size('public.'||tablename) DESC;
\"" 2>&1