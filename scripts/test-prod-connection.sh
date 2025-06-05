#!/bin/bash

echo "🔗 Testing production database connection..."

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

# Test basic connection
echo "🧪 Testing basic connection..."
PGPASSWORD="$DB_PASSWORD" psql -h "$PROD_HOST" -U "$PROD_USER" -d "$PROD_DB" -c "SELECT 'Connection successful!' as status;" 2>&1

echo
echo "📊 Testing shopify_orders count..."
PGPASSWORD="$DB_PASSWORD" psql -h "$PROD_HOST" -U "$PROD_USER" -d "$PROD_DB" -c "SELECT COUNT(*) as shopify_orders_count FROM public.shopify_orders;" 2>&1

echo
echo "📊 Testing other table counts..."
PGPASSWORD="$DB_PASSWORD" psql -h "$PROD_HOST" -U "$PROD_USER" -d "$PROD_DB" -c "
SELECT 
    schemaname,
    tablename,
    n_tup_ins as estimated_rows
FROM pg_stat_user_tables 
WHERE schemaname = 'public' 
    AND tablename IN ('shopify_orders', 'profiles', 'discord_connections')
ORDER BY estimated_rows DESC;
" 2>&1