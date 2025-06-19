# Quick Fix: Initialize Collections and Hide Specific Ones

Since your `collection_order` table is empty, you need to initialize it first. Here are two methods:

## Method 1: Using the Admin Interface (Easiest)

1. Go to your shop page: `https://discord.lolcow.co/shop`
2. Since you're an admin and the collection_order table is empty, you should now see the **floating admin button** in the bottom right corner
3. Click **"Initialize Collections"**
4. Then go to `/admin/collection-order` and hide the collections you want

## Method 2: Direct SQL (Fastest)

Run this SQL in your Supabase dashboard:

```sql
-- Initialize all collections and hide the ones you specified
INSERT INTO collection_order (collection_handle, display_order, is_visible, featured)
SELECT 
    handle as collection_handle,
    ROW_NUMBER() OVER (ORDER BY title) - 1 as display_order,
    CASE 
        WHEN handle IN ('featured-products', 'frontpage', 'lolcow-gaming', 'shop-all') 
        THEN false 
        ELSE true 
    END as is_visible,
    CASE 
        WHEN handle IN (
            'lolcow-live', 'lolcow-queen', 'lolcow-queens', 'lolcow-rewind',
            'lolcow-nerd', 'lolcow-test', 'mafia-milkers', 'lolcow-techtalk',
            'lolcow-tech-talk', 'lolcow-cafe', 'lolcow-aussy', 'lolcow-aussie',
            'lolcow-ausi', 'angry-grandpa'
        ) 
        THEN true 
        ELSE false 
    END as featured
FROM shopify_collections
ON CONFLICT (collection_handle) DO NOTHING;
```

This will:
- ✅ Initialize all collections from your Shopify data
- ✅ Automatically hide: featured-products, frontpage, lolcow-gaming, shop-all
- ✅ Mark your main collections as featured
- ✅ Set proper display order

## Method 3: Just Initialize Everything

If you prefer to manually configure visibility after initialization:

```sql
-- Simple initialization - all visible by default
INSERT INTO collection_order (collection_handle, display_order, is_visible, featured)
SELECT 
    handle,
    ROW_NUMBER() OVER (ORDER BY title) - 1,
    true,
    false
FROM shopify_collections
ON CONFLICT (collection_handle) DO NOTHING;
```

Then use the admin interface to hide/feature collections as needed.

## After Running Either Method

1. Go to `/shop` - you should no longer see the hidden collections
2. Go to `/admin/collection-order` - you can now manage all collections
3. The floating button will disappear since all collections are initialized