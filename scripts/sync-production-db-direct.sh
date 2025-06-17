#!/bin/bash

echo "🔄 Syncing production database to local (using direct connection)..."

# Direct database connection from .env.secrets
DATABASE_URL="postgresql://postgres:B445478e84Fknsd312s@db.dlmbqojnhjsecajxltzj.supabase.co:5432/postgres"
DB_HOST="db.dlmbqojnhjsecajxltzj.supabase.co"
DB_USER="postgres"
DB_PASSWORD="B445478e84Fknsd312s"
DB_NAME="postgres"
DB_PORT="5432"

# Local database connection
LOCAL_DB_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"

# Check if Supabase is running
if ! npx supabase status > /dev/null 2>&1; then
    echo "❌ Supabase is not running. Starting it now..."
    npx supabase start
    echo "⏳ Waiting for services to be ready..."
    sleep 10
fi

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to run pg_dump using Docker
pg_dump_docker() {
    echo "🐳 Using Docker for pg_dump (pg_dump not found locally)..."
    docker run --rm \
        -e PGPASSWORD="$DB_PASSWORD" \
        postgres:15-alpine \
        pg_dump \
        --host="$DB_HOST" \
        --port="$DB_PORT" \
        --username="$DB_USER" \
        --dbname="$DB_NAME" \
        --no-owner \
        --no-privileges \
        --no-comments \
        --data-only \
        --disable-triggers \
        --schema=public \
        --schema=auth \
        --exclude-table=public.schema_migrations \
        --exclude-table=public.supabase_migrations \
        --exclude-table=public.supabase_functions \
        --exclude-table=auth.schema_migrations \
        --exclude-table=auth.audit_log_entries \
        --exclude-table=auth.flow_state \
        --exclude-table=auth.refresh_tokens \
        --exclude-table=auth.sessions \
        --exclude-table=auth.sso_providers \
        --exclude-table=auth.sso_domains \
        --exclude-table=auth.saml_providers \
        --exclude-table=auth.saml_relay_states \
        --exclude-table=auth.one_time_tokens
}

# Function to run psql using Docker
psql_docker() {
    local DB_CONTAINER=$(docker ps --format "table {{.Names}}" | grep "supabase_db_" | head -1)
    if [ -z "$DB_CONTAINER" ]; then
        echo "❌ Error: Supabase DB container not found. Is Supabase running?"
        return 1
    fi
    
    # Copy SQL file to container and execute
    docker cp - "$DB_CONTAINER:/tmp/import.sql"
    docker exec "$DB_CONTAINER" psql -U postgres -d postgres -f /tmp/import.sql
    docker exec "$DB_CONTAINER" rm /tmp/import.sql
}

# Reset local database first
echo "🗑️  Resetting local database..."
npx supabase db reset

# Create a temporary file for the dump
DUMP_FILE=$(mktemp /tmp/production_dump.XXXXXX.sql)
trap "rm -f $DUMP_FILE" EXIT

# Dump production data
echo "📥 Dumping production database (this may take a few minutes)..."
echo "📍 Connecting to: $DB_HOST"

if command_exists pg_dump; then
    echo "✅ Using local pg_dump..."
    PGPASSWORD="$DB_PASSWORD" pg_dump \
        --host="$DB_HOST" \
        --port="$DB_PORT" \
        --username="$DB_USER" \
        --dbname="$DB_NAME" \
        --no-owner \
        --no-privileges \
        --no-comments \
        --data-only \
        --disable-triggers \
        --schema=public \
        --schema=auth \
        --exclude-table=public.schema_migrations \
        --exclude-table=public.supabase_migrations \
        --exclude-table=public.supabase_functions \
        --exclude-table=auth.schema_migrations \
        --exclude-table=auth.audit_log_entries \
        --exclude-table=auth.flow_state \
        --exclude-table=auth.refresh_tokens \
        --exclude-table=auth.sessions \
        --exclude-table=auth.sso_providers \
        --exclude-table=auth.sso_domains \
        --exclude-table=auth.saml_providers \
        --exclude-table=auth.saml_relay_states \
        --exclude-table=auth.one_time_tokens \
        > "$DUMP_FILE"
else
    pg_dump_docker > "$DUMP_FILE"
fi

# Check if dump was successful
if [ $? -ne 0 ] || [ ! -s "$DUMP_FILE" ]; then
    echo "❌ Failed to create database dump"
    echo "🔍 Troubleshooting tips:"
    echo "   - Check if the database host is accessible: $DB_HOST"
    echo "   - Verify the password is correct"
    echo "   - Ensure your IP is whitelisted in Supabase dashboard"
    exit 1
fi

DUMP_SIZE=$(ls -lh "$DUMP_FILE" | awk '{print $5}')
echo "✅ Database dump created successfully (Size: $DUMP_SIZE)"

# Import production data
echo "📤 Importing production data to local database..."

if command_exists psql; then
    echo "✅ Using local psql..."
    psql "$LOCAL_DB_URL" < "$DUMP_FILE"
else
    echo "🐳 Using Docker for import..."
    cat "$DUMP_FILE" | psql_docker
fi

if [ $? -ne 0 ]; then
    echo "❌ Failed to import data"
    exit 1
fi

echo "✅ Data imported successfully!"

# Verify the import
echo "🔍 Verifying imported data..."

VERIFY_QUERY="
SELECT 
    'Profiles' as table_name, COUNT(*) as count FROM public.profiles
UNION ALL SELECT 
    'Discord Connections', COUNT(*) FROM public.discord_connections  
UNION ALL SELECT 
    'YouTube Connections', COUNT(*) FROM public.youtube_connections
UNION ALL SELECT 
    'YouTube Channels', COUNT(*) FROM public.youtube_channels
UNION ALL SELECT 
    'YouTube Streams', COUNT(*) FROM public.youtube_streams
UNION ALL SELECT 
    'Shopify Orders', COUNT(*) FROM public.shopify_orders
UNION ALL SELECT
    'User Devices', COUNT(*) FROM public.user_devices
UNION ALL SELECT
    'Support Tickets', COUNT(*) FROM public.support_tickets
ORDER BY table_name;"

if command_exists psql; then
    psql "$LOCAL_DB_URL" -c "$VERIFY_QUERY"
else
    DB_CONTAINER=$(docker ps --format "table {{.Names}}" | grep "supabase_db_" | head -1)
    if [ -n "$DB_CONTAINER" ]; then
        docker exec "$DB_CONTAINER" psql -U postgres -d postgres -c "$VERIFY_QUERY"
    fi
fi

echo ""
echo "✅ Production database synced successfully!"
echo "🔍 You can now run 'npm run dev' to use the production data locally"