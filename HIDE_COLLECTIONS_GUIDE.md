# Guide to Hide Collections

Since the collection_order table requires admin privileges, here's how to hide the requested collections:

## Collections to Hide:
- **Featured Products** (handle: `featured-products`)
- **Home page** (handle: `frontpage`)
- **Lolcow Gaming** (handle: `lolcow-gaming`)
- **Shop All** (handle: `shop-all`)

## Method 1: Using the Admin Interface (Recommended)

1. Make sure you're logged in as an admin user
2. Navigate to `/admin/collection-order` in your browser
3. Click the **"Initialize Missing Collections"** button at the top
   - This will create entries for all collections in the collection_order table
4. Find each of the collections listed above
5. Click the **eye icon** (👁) next to each collection to hide it
   - The icon will change to a crossed-out eye when hidden
6. The changes are saved automatically

## Method 2: Direct Database Update (Requires Supabase Dashboard Access)

If you have access to the Supabase dashboard:

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Run this SQL command:

```sql
-- First, initialize all collections if not already done
INSERT INTO collection_order (collection_handle, display_order, is_visible)
SELECT handle, ROW_NUMBER() OVER (ORDER BY title) - 1, true
FROM shopify_collections
ON CONFLICT (collection_handle) DO NOTHING;

-- Then hide the specific collections
UPDATE collection_order 
SET is_visible = false 
WHERE collection_handle IN (
  'featured-products',
  'frontpage',
  'lolcow-gaming',
  'shop-all'
);
```

## What Happens When Hidden

- Collections will no longer appear on the `/shop` page
- The collections and their products still exist in the database
- Direct URLs like `/collections/featured-products` will still work
- You can unhide them anytime through the admin interface

## Current Status

Currently, the collection_order table is empty, which means all collections are being shown by default. Once you initialize the collections through the admin interface, you'll have full control over their visibility.

## Alternative: Update Shop Page Logic

If you need an immediate solution without database access, I can modify the Shop.tsx component to filter out these collections in the frontend code. This would be a temporary solution until the database is properly configured.