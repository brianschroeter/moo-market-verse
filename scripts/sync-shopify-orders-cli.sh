#!/bin/bash

echo "🛒 Syncing ALL Shopify orders using Supabase CLI..."

# Check if we're logged into Supabase
echo "🔗 Checking Supabase connection..."
npx supabase projects list > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "❌ Not logged into Supabase CLI. Please run: npx supabase login"
    exit 1
fi

# Check current local count
DB_CONTAINER=$(docker ps --format "table {{.Names}}" | grep supabase_db | head -1)
if [ -z "$DB_CONTAINER" ]; then
    echo "❌ Could not find Supabase database container"
    exit 1
fi

LOCAL_COUNT_BEFORE=$(docker exec "$DB_CONTAINER" psql -U postgres -d postgres -t -c "SELECT COUNT(*) FROM public.shopify_orders;" 2>/dev/null | xargs)
echo "📊 Currently have $LOCAL_COUNT_BEFORE orders locally"

# Try multiple approaches to get all the data

echo "🔄 Attempt 1: Using Supabase CLI with shopify_orders table only..."
npx supabase db dump --data-only --linked --table=shopify_orders -f shopify_orders_only.sql

if [ -f shopify_orders_only.sql ]; then
    DUMP_SIZE=$(stat -c%s shopify_orders_only.sql 2>/dev/null || stat -f%z shopify_orders_only.sql)
    echo "📊 Shopify-only dump size: $(ls -lh shopify_orders_only.sql | awk '{print $5}')"
    
    if [ "$DUMP_SIZE" -gt 5000 ]; then
        echo "📤 Importing shopify-only dump..."
        
        # Clear existing data
        docker exec "$DB_CONTAINER" psql -U postgres -d postgres -c "TRUNCATE TABLE public.shopify_orders RESTART IDENTITY CASCADE;"
        
        # Import
        docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres < shopify_orders_only.sql
        
        # Check result
        LOCAL_COUNT_AFTER=$(docker exec "$DB_CONTAINER" psql -U postgres -d postgres -t -c "SELECT COUNT(*) FROM public.shopify_orders;" 2>/dev/null | xargs)
        echo "📊 After import: $LOCAL_COUNT_AFTER orders"
        
        if [ "$LOCAL_COUNT_AFTER" -gt "$LOCAL_COUNT_BEFORE" ]; then
            echo "✅ SUCCESS: Improved from $LOCAL_COUNT_BEFORE to $LOCAL_COUNT_AFTER orders (+$(($LOCAL_COUNT_AFTER - $LOCAL_COUNT_BEFORE)))"
            rm shopify_orders_only.sql
            exit 0
        fi
    fi
    rm shopify_orders_only.sql
fi

echo "🔄 Attempt 2: Using full dump with larger timeout..."
timeout 300 npx supabase db dump --data-only --linked -f full_production_dump.sql

if [ -f full_production_dump.sql ]; then
    DUMP_SIZE=$(stat -c%s full_production_dump.sql 2>/dev/null || stat -f%z full_production_dump.sql)
    echo "📊 Full dump size: $(ls -lh full_production_dump.sql | awk '{print $5}')"
    
    if [ "$DUMP_SIZE" -gt 10000 ]; then
        echo "📤 Importing full dump..."
        
        # Reset database
        npx supabase db reset
        
        # Import
        docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres < full_production_dump.sql
        
        # Check result
        LOCAL_COUNT_AFTER=$(docker exec "$DB_CONTAINER" psql -U postgres -d postgres -t -c "SELECT COUNT(*) FROM public.shopify_orders;" 2>/dev/null | xargs)
        echo "📊 After full import: $LOCAL_COUNT_AFTER orders"
        
        rm full_production_dump.sql
        
        if [ "$LOCAL_COUNT_AFTER" -gt 50 ]; then
            echo "✅ SUCCESS: Full import resulted in $LOCAL_COUNT_AFTER orders"
            exit 0
        fi
    fi
fi

echo "🔄 Attempt 3: Using remote SQL query (requires installation of postgresql-client)..."
echo "💡 This would require installing psql on your system:"
echo "   Ubuntu/Debian: sudo apt install postgresql-client"
echo "   MacOS: brew install postgresql"
echo "   Or use: sudo apt update && sudo apt install -y postgresql-client"

read -p "Would you like to install postgresql-client and try direct connection? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📦 Installing postgresql-client..."
    
    # Detect OS and install psql
    if command -v apt > /dev/null; then
        sudo apt update && sudo apt install -y postgresql-client
    elif command -v brew > /dev/null; then
        brew install postgresql
    elif command -v yum > /dev/null; then
        sudo yum install -y postgresql
    else
        echo "❌ Could not detect package manager. Please install postgresql-client manually."
        exit 1
    fi
    
    if command -v psql > /dev/null; then
        echo "✅ psql installed successfully!"
        echo "🔄 Now you can run: ./scripts/sync-shopify-orders.sh"
    else
        echo "❌ psql installation failed"
    fi
fi

echo "📋 Summary of attempts:"
echo "   - Table-specific dump: Failed or insufficient data"
echo "   - Full dump: Failed or insufficient data" 
echo "   - Direct psql: Requires installation"
echo ""
echo "💡 Recommendations:"
echo "1. Install postgresql-client and use ./scripts/sync-shopify-orders.sh"
echo "2. Check if production database has network restrictions"
echo "3. Verify your Supabase project settings allow external connections"