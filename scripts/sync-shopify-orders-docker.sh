#!/bin/bash

echo "🛒 Syncing ALL Shopify orders from production using Docker..."

# Check if we're logged into Supabase
echo "🔗 Checking Supabase connection..."
npx supabase projects list > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "❌ Not logged into Supabase CLI. Please run: npx supabase login"
    exit 1
fi

# Production database connection details
PROD_HOST="db.dlmbqojnhjsecajxltzj.supabase.co"
PROD_USER="postgres"
PROD_DB="postgres"

# Find the correct Docker container for local Supabase
echo "🐳 Finding Supabase Docker container..."
DB_CONTAINER=$(docker ps --format "table {{.Names}}" | grep supabase_db | head -1)

if [ -z "$DB_CONTAINER" ]; then
    echo "❌ Could not find Supabase database container"
    echo "Available containers:"
    docker ps --format "table {{.Names}}\t{{.Image}}"
    exit 1
fi

echo "📦 Using container: $DB_CONTAINER"

# Get database password
echo "💡 You'll be prompted for your Supabase database password"
read -s -p "Enter Supabase database password: " DB_PASSWORD
echo

# First, let's check how many orders exist in production
echo "📊 Checking total orders in production..."
TOTAL_ORDERS=$(docker exec "$DB_CONTAINER" bash -c "PGPASSWORD='$DB_PASSWORD' psql -h '$PROD_HOST' -U '$PROD_USER' -d '$PROD_DB' -t -c 'SELECT COUNT(*) FROM public.shopify_orders;'" 2>/dev/null | xargs)

if [ -z "$TOTAL_ORDERS" ] || [ "$TOTAL_ORDERS" = "0" ]; then
    echo "❌ Could not connect to production database or no orders found"
    echo "Debug info:"
    docker exec "$DB_CONTAINER" bash -c "PGPASSWORD='$DB_PASSWORD' psql -h '$PROD_HOST' -U '$PROD_USER' -d '$PROD_DB' -c 'SELECT 1;'" 2>&1
    exit 1
fi

echo "📈 Found $TOTAL_ORDERS orders in production"

# Check current local count
LOCAL_COUNT_BEFORE=$(docker exec "$DB_CONTAINER" psql -U postgres -d postgres -t -c "SELECT COUNT(*) FROM public.shopify_orders;" 2>/dev/null | xargs)
echo "📊 Currently have $LOCAL_COUNT_BEFORE orders locally"

# Create a comprehensive dump of just the shopify_orders table using Docker
echo "📥 Dumping shopify_orders table from production..."
docker exec "$DB_CONTAINER" bash -c "PGPASSWORD='$DB_PASSWORD' pg_dump -h '$PROD_HOST' -U '$PROD_USER' -d '$PROD_DB' --data-only --no-owner --no-privileges --table=public.shopify_orders" > shopify_orders_dump.sql

if [ ! -f shopify_orders_dump.sql ]; then
    echo "❌ Failed to create shopify orders dump"
    exit 1
fi

# Check dump file size
DUMP_SIZE=$(stat -c%s shopify_orders_dump.sql 2>/dev/null || stat -f%z shopify_orders_dump.sql)
echo "📊 Dump file size: $(ls -lh shopify_orders_dump.sql | awk '{print $5}')"

if [ "$DUMP_SIZE" -lt 1000 ]; then
    echo "⚠️  Dump file seems too small ($DUMP_SIZE bytes)."
    echo "📄 First few lines of dump:"
    head -10 shopify_orders_dump.sql
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        rm shopify_orders_dump.sql
        exit 1
    fi
fi

# Clear existing shopify_orders data
echo "🗑️  Clearing existing shopify_orders data..."
docker exec "$DB_CONTAINER" psql -U postgres -d postgres -c "TRUNCATE TABLE public.shopify_orders RESTART IDENTITY CASCADE;"

# Import the shopify orders data
echo "📤 Importing shopify orders data..."
docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres < shopify_orders_dump.sql

if [ $? -eq 0 ]; then
    # Verify import
    echo "🔍 Verifying import..."
    LOCAL_COUNT=$(docker exec "$DB_CONTAINER" psql -U postgres -d postgres -t -c "SELECT COUNT(*) FROM public.shopify_orders;" | xargs)
    echo "📊 Local database now has $LOCAL_COUNT shopify orders"
    
    if [ "$LOCAL_COUNT" = "$TOTAL_ORDERS" ]; then
        echo "✅ SUCCESS: All $TOTAL_ORDERS shopify orders synced successfully!"
        echo "📈 Improvement: +$(($LOCAL_COUNT - $LOCAL_COUNT_BEFORE)) orders"
    else
        echo "⚠️  PARTIAL SUCCESS: Expected $TOTAL_ORDERS orders but got $LOCAL_COUNT"
        echo "📈 Still improved by: +$(($LOCAL_COUNT - $LOCAL_COUNT_BEFORE)) orders"
    fi
    
    # Show some sample data
    echo "🔍 Sample of synced orders:"
    docker exec "$DB_CONTAINER" psql -U postgres -d postgres -c "SELECT shopify_order_number, customer_name, total_amount, order_date FROM public.shopify_orders ORDER BY order_date DESC LIMIT 3;"
    
else
    echo "❌ Failed to import shopify orders data"
fi

# Clean up
rm shopify_orders_dump.sql

echo "🎉 Shopify orders sync complete!"