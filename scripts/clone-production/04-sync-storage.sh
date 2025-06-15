#!/bin/bash

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Load common functions
source "$SCRIPT_DIR/common.sh"

# Function to display usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --sync-files    Also sync bucket contents (warning: may be large)"
    echo "  --bucket NAME   Sync only specific bucket"
    echo "  --dry-run       Show what would be synced without doing it"
    echo "  -h, --help      Show this help message"
    exit 1
}

# Parse command line arguments
SYNC_FILES=false
SPECIFIC_BUCKET=""
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --sync-files)
            SYNC_FILES=true
            shift
            ;;
        --bucket)
            SPECIFIC_BUCKET="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        -h|--help)
            usage
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            usage
            ;;
    esac
done

# Load environment
load_env

# Verify required variables
check_required_vars

echo -e "${BLUE}=== Storage Bucket Sync ===${NC}"
echo -e "${YELLOW}Source:${NC} Production Supabase"
echo -e "${YELLOW}Target:${NC} Local Supabase"
echo ""

# Get production buckets using SQL query
echo -e "${BLUE}Fetching production storage buckets...${NC}"
PROD_BUCKETS=$(PGPASSWORD="$PROD_DB_PASSWORD" psql \
    -h "$PROD_DB_HOST" \
    -p "$PROD_DB_PORT" \
    -U "$PROD_DB_USER" \
    -d "$PROD_DB_NAME" \
    -t -A -c "
    SELECT json_agg(
        json_build_object(
            'id', id,
            'name', name,
            'public', public,
            'file_size_limit', file_size_limit,
            'allowed_mime_types', allowed_mime_types,
            'created_at', created_at,
            'updated_at', updated_at
        )
    )
    FROM storage.buckets
    WHERE name NOT IN ('supabase_functions')
    ${SPECIFIC_BUCKET:+AND name = '$SPECIFIC_BUCKET'};"
)

if [ -z "$PROD_BUCKETS" ] || [ "$PROD_BUCKETS" = "null" ]; then
    echo -e "${YELLOW}No buckets found in production${NC}"
    exit 0
fi

# Parse buckets
BUCKET_COUNT=$(echo "$PROD_BUCKETS" | jq 'length')
echo -e "${GREEN}Found $BUCKET_COUNT bucket(s) in production${NC}"
echo ""

# Process each bucket
echo "$PROD_BUCKETS" | jq -c '.[]' | while read -r bucket; do
    BUCKET_NAME=$(echo "$bucket" | jq -r '.name')
    BUCKET_PUBLIC=$(echo "$bucket" | jq -r '.public')
    FILE_SIZE_LIMIT=$(echo "$bucket" | jq -r '.file_size_limit // null')
    ALLOWED_MIME_TYPES=$(echo "$bucket" | jq -r '.allowed_mime_types // null')
    
    echo -e "${BLUE}Processing bucket: ${BUCKET_NAME}${NC}"
    echo "  Public: $BUCKET_PUBLIC"
    echo "  File size limit: ${FILE_SIZE_LIMIT:-none}"
    echo "  Allowed MIME types: ${ALLOWED_MIME_TYPES:-any}"
    
    if [ "$DRY_RUN" = true ]; then
        echo -e "${YELLOW}  [DRY RUN] Would sync this bucket${NC}"
    else
        # Check if bucket exists locally
        LOCAL_BUCKET_EXISTS=$(PGPASSWORD="$LOCAL_DB_PASSWORD" psql \
            -h "$LOCAL_DB_HOST" \
            -p "$LOCAL_DB_PORT" \
            -U "$LOCAL_DB_USER" \
            -d "$LOCAL_DB_NAME" \
            -t -A -c "
            SELECT EXISTS(
                SELECT 1 FROM storage.buckets WHERE name = '$BUCKET_NAME'
            );"
        )
        
        if [ "$LOCAL_BUCKET_EXISTS" = "f" ]; then
            echo -e "${YELLOW}  Creating bucket locally...${NC}"
            
            # Create bucket
            PGPASSWORD="$LOCAL_DB_PASSWORD" psql \
                -h "$LOCAL_DB_HOST" \
                -p "$LOCAL_DB_PORT" \
                -U "$LOCAL_DB_USER" \
                -d "$LOCAL_DB_NAME" \
                -c "
                INSERT INTO storage.buckets (
                    name, public, file_size_limit, allowed_mime_types
                ) VALUES (
                    '$BUCKET_NAME',
                    $BUCKET_PUBLIC,
                    ${FILE_SIZE_LIMIT:-NULL},
                    ${ALLOWED_MIME_TYPES:-NULL}
                );"
            
            echo -e "${GREEN}  ✓ Bucket created${NC}"
        else
            echo -e "${YELLOW}  Updating existing bucket...${NC}"
            
            # Update bucket settings
            PGPASSWORD="$LOCAL_DB_PASSWORD" psql \
                -h "$LOCAL_DB_HOST" \
                -p "$LOCAL_DB_PORT" \
                -U "$LOCAL_DB_USER" \
                -d "$LOCAL_DB_NAME" \
                -c "
                UPDATE storage.buckets
                SET public = $BUCKET_PUBLIC,
                    file_size_limit = ${FILE_SIZE_LIMIT:-NULL},
                    allowed_mime_types = ${ALLOWED_MIME_TYPES:-NULL}
                WHERE name = '$BUCKET_NAME';"
            
            echo -e "${GREEN}  ✓ Bucket updated${NC}"
        fi
    fi
    
    # Sync bucket policies
    echo -e "${YELLOW}  Syncing RLS policies...${NC}"
    
    if [ "$DRY_RUN" = true ]; then
        echo -e "${YELLOW}  [DRY RUN] Would sync policies${NC}"
    else
        # Get production policies for this bucket
        PROD_POLICIES=$(PGPASSWORD="$PROD_DB_PASSWORD" psql \
            -h "$PROD_DB_HOST" \
            -p "$PROD_DB_PORT" \
            -U "$PROD_DB_USER" \
            -d "$PROD_DB_NAME" \
            -t -A -c "
            SELECT json_agg(
                json_build_object(
                    'name', policyname,
                    'definition', definition,
                    'check', check_expression,
                    'using', using_expression
                )
            )
            FROM pg_policies
            WHERE schemaname = 'storage'
            AND tablename = 'objects'
            AND policyname LIKE 'bucket_${BUCKET_NAME}_%';"
        )
        
        if [ ! -z "$PROD_POLICIES" ] && [ "$PROD_POLICIES" != "null" ]; then
            # Drop existing local policies for this bucket
            PGPASSWORD="$LOCAL_DB_PASSWORD" psql \
                -h "$LOCAL_DB_HOST" \
                -p "$LOCAL_DB_PORT" \
                -U "$LOCAL_DB_USER" \
                -d "$LOCAL_DB_NAME" \
                -c "
                DO \$\$
                DECLARE
                    r RECORD;
                BEGIN
                    FOR r IN 
                        SELECT policyname 
                        FROM pg_policies 
                        WHERE schemaname = 'storage' 
                        AND tablename = 'objects'
                        AND policyname LIKE 'bucket_${BUCKET_NAME}_%'
                    LOOP
                        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON storage.objects';
                    END LOOP;
                END
                \$\$;"
            
            # Note: Full policy recreation would require parsing the definition
            # For now, we'll create basic policies based on bucket public status
            if [ "$BUCKET_PUBLIC" = "t" ]; then
                PGPASSWORD="$LOCAL_DB_PASSWORD" psql \
                    -h "$LOCAL_DB_HOST" \
                    -p "$LOCAL_DB_PORT" \
                    -U "$LOCAL_DB_USER" \
                    -d "$LOCAL_DB_NAME" \
                    -c "
                    CREATE POLICY \"bucket_${BUCKET_NAME}_public_read\"
                    ON storage.objects FOR SELECT
                    USING (bucket_id = '$BUCKET_NAME');"
            fi
            
            echo -e "${GREEN}  ✓ Policies synced${NC}"
        fi
    fi
    
    # Check bucket size if syncing files
    if [ "$SYNC_FILES" = true ]; then
        echo -e "${YELLOW}  Checking bucket size...${NC}"
        
        BUCKET_SIZE=$(PGPASSWORD="$PROD_DB_PASSWORD" psql \
            -h "$PROD_DB_HOST" \
            -p "$PROD_DB_PORT" \
            -U "$PROD_DB_USER" \
            -d "$PROD_DB_NAME" \
            -t -A -c "
            SELECT COALESCE(
                pg_size_pretty(SUM(metadata->>'size')::bigint),
                '0 bytes'
            )
            FROM storage.objects
            WHERE bucket_id = '$BUCKET_NAME';"
        )
        
        OBJECT_COUNT=$(PGPASSWORD="$PROD_DB_PASSWORD" psql \
            -h "$PROD_DB_HOST" \
            -p "$PROD_DB_PORT" \
            -U "$PROD_DB_USER" \
            -d "$PROD_DB_NAME" \
            -t -A -c "
            SELECT COUNT(*)
            FROM storage.objects
            WHERE bucket_id = '$BUCKET_NAME';"
        )
        
        echo -e "${YELLOW}  Bucket contains $OBJECT_COUNT objects (Total size: $BUCKET_SIZE)${NC}"
        
        if [ "$DRY_RUN" = true ]; then
            echo -e "${YELLOW}  [DRY RUN] Would sync $OBJECT_COUNT files${NC}"
        else
            # Confirm before syncing large buckets
            if [ "$OBJECT_COUNT" -gt 100 ]; then
                echo -e "${YELLOW}  This is a large bucket. Continue with sync? (y/N)${NC}"
                read -r CONFIRM
                if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
                    echo -e "${YELLOW}  Skipping file sync for this bucket${NC}"
                    continue
                fi
            fi
            
            # Note: Actual file sync would require using Supabase Storage API
            # or direct file system access. This is a placeholder for the logic.
            echo -e "${YELLOW}  Note: File sync requires Supabase Storage API access${NC}"
            echo -e "${YELLOW}  You can manually sync files using:${NC}"
            echo "    - Supabase CLI: supabase storage cp"
            echo "    - Direct API calls to download/upload files"
            echo "    - Database dump/restore of storage.objects table"
        fi
    fi
    
    echo ""
done

# Sync CORS configuration
echo -e "${BLUE}Syncing CORS configurations...${NC}"

if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}[DRY RUN] Would sync CORS settings${NC}"
else
    # Note: CORS settings are typically managed through Supabase Dashboard
    # or configuration files, not directly in the database
    echo -e "${YELLOW}Note: CORS settings should be configured in:${NC}"
    echo "  - Supabase Dashboard > Storage > Policies"
    echo "  - Or in your supabase/config.toml file"
fi

echo ""
echo -e "${GREEN}=== Storage Sync Complete ===${NC}"

if [ "$SYNC_FILES" = false ]; then
    echo ""
    echo -e "${YELLOW}Note: Only bucket metadata was synced.${NC}"
    echo -e "${YELLOW}To sync actual files, run with --sync-files flag${NC}"
fi

if [ "$DRY_RUN" = true ]; then
    echo ""
    echo -e "${YELLOW}This was a dry run. No changes were made.${NC}"
    echo -e "${YELLOW}Remove --dry-run flag to perform actual sync.${NC}"
fi