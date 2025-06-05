#!/bin/bash

echo "🛒 Syncing Shopify orders from production (simplified approach)..."

# Production database connection details
PROD_HOST="db.dlmbqojnhjsecajxltzj.supabase.co"
PROD_USER="postgres"
PROD_DB="postgres"

# Find local Supabase container
DB_CONTAINER=$(docker ps --format "table {{.Names}}" | grep supabase_db | head -1)

if [ -z "$DB_CONTAINER" ]; then
    echo "❌ Could not find Supabase database container"
    echo "Available containers:"
    docker ps --format "table {{.Names}}\t{{.Image}}"
    exit 1
fi

echo "🐳 Using container: $DB_CONTAINER"

# Get password
echo "💡 Enter your Supabase database password when prompted"
read -s -p "Database password: " DB_PASSWORD
echo

# Check current local count
LOCAL_COUNT_BEFORE=$(docker exec "$DB_CONTAINER" psql -U postgres -d postgres -t -c "SELECT COUNT(*) FROM public.shopify_orders;" 2>/dev/null | xargs)
echo "📊 Currently have $LOCAL_COUNT_BEFORE orders locally"

# Test connection and get production count
echo "🔗 Testing production connection..."
PROD_COUNT=$(docker exec "$DB_CONTAINER" bash -c "PGPASSWORD='$DB_PASSWORD' psql -h '$PROD_HOST' -U '$PROD_USER' -d '$PROD_DB' -t -c 'SELECT COUNT(*) FROM public.shopify_orders;'" 2>/dev/null | xargs)

if [ -z "$PROD_COUNT" ] || [ "$PROD_COUNT" = "" ]; then
    echo "❌ Could not connect to production database"
    echo "Debug: Testing basic connection..."
    docker exec "$DB_CONTAINER" bash -c "PGPASSWORD='$DB_PASSWORD' psql -h '$PROD_HOST' -U '$PROD_USER' -d '$PROD_DB' -c 'SELECT 1;'" 2>&1
    exit 1
fi

echo "📈 Production has $PROD_COUNT orders"

# Create dump using Docker container's pg_dump
echo "📥 Creating dump from production..."
docker exec "$DB_CONTAINER" bash -c "PGPASSWORD='$DB_PASSWORD' pg_dump -h '$PROD_HOST' -U '$PROD_USER' -d '$PROD_DB' --data-only --no-owner --no-privileges --table=public.shopify_orders" > shopify_orders_production.sql

if [ ! -f shopify_orders_production.sql ]; then
    echo "❌ Failed to create production dump"
    exit 1
fi

# Check dump file
DUMP_SIZE=$(stat -c%s shopify_orders_production.sql 2>/dev/null || stat -f%z shopify_orders_production.sql)
echo "📊 Dump file size: $(ls -lh shopify_orders_production.sql | awk '{print $5}')"

if [ "$DUMP_SIZE" -lt 1000 ]; then
    echo "⚠️  Dump file seems too small"
    echo "First 10 lines:"
    head -10 shopify_orders_production.sql
    exit 1
fi

# Clear local data and import
echo "🗑️  Clearing local shopify_orders..."
docker exec "$DB_CONTAINER" psql -U postgres -d postgres -c "TRUNCATE TABLE public.shopify_orders RESTART IDENTITY CASCADE;"

echo "📤 Importing production data..."
docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres < shopify_orders_production.sql

# Verify result
LOCAL_COUNT_AFTER=$(docker exec "$DB_CONTAINER" psql -U postgres -d postgres -t -c "SELECT COUNT(*) FROM public.shopify_orders;" 2>/dev/null | xargs)
echo "📊 After import: $LOCAL_COUNT_AFTER orders"

# Show results
if [ "$LOCAL_COUNT_AFTER" -eq "$PROD_COUNT" ]; then
    echo "✅ SUCCESS: All $PROD_COUNT orders synced!"
elif [ "$LOCAL_COUNT_AFTER" -gt "$LOCAL_COUNT_BEFORE" ]; then
    echo "✅ PARTIAL SUCCESS: Improved from $LOCAL_COUNT_BEFORE to $LOCAL_COUNT_AFTER orders"
    echo "   Still missing $(($PROD_COUNT - $LOCAL_COUNT_AFTER)) orders"
else
    echo "❌ FAILED: No improvement in order count"
fi

# Sample data
echo "🔍 Sample orders:"
docker exec "$DB_CONTAINER" psql -U postgres -d postgres -c "SELECT shopify_order_number, customer_name, total_amount, order_date FROM public.shopify_orders ORDER BY order_date DESC LIMIT 3;"

# Clean up
rm shopify_orders_production.sql

echo "🎉 Sync complete!"