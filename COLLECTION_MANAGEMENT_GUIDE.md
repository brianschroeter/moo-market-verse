# Collection Management Guide

## Current Status

Based on your setup:
1. ✅ The `featured` column migration has been applied to your production database
2. ✅ All code has been deployed to production
3. ✅ The admin interface at `/admin/collection-order` is available

## Why You Don't See the Buttons

The floating admin button and initialize button only appear when there are **uninitialized collections** (collections in Shopify that don't have entries in the collection_order table). Since all your collections are likely already initialized, these buttons won't appear.

## How to Manage Collections

### Via the Admin Interface (Recommended)

1. **Navigate to the Admin Panel**
   - Go to: `https://discord.lolcow.co/admin/collection-order`
   - Make sure you're logged in as an admin

2. **Hide Collections**
   - Find each collection you want to hide:
     - `featured-products`
     - `frontpage` 
     - `lolcow-gaming`
     - `shop-all`
   - Click the **eye icon** (👁) next to each collection
   - The icon will change to a crossed-out eye (👁️‍🗨️) when hidden

3. **Mark Collections as Featured**
   - Click the **star icon** (⭐) next to collections you want to feature
   - Featured collections appear at the top of the shop page

4. **Reorder Collections**
   - Drag and drop collections to reorder them
   - Or use the up/down arrow buttons

### Via Direct Database Update

If you need to update via SQL:

```sql
-- Hide specific collections
UPDATE collection_order 
SET is_visible = false 
WHERE collection_handle IN (
  'featured-products',
  'frontpage',
  'lolcow-gaming',
  'shop-all'
);

-- Mark collections as featured
UPDATE collection_order 
SET featured = true 
WHERE collection_handle IN (
  'lolcow-live',
  'lolcow-queen',
  'lolcow-queens',
  -- ... other collections you want featured
);
```

## Troubleshooting

### If Collections Don't Appear in Admin

Run a sync to ensure all collections are in the database:
```bash
./scripts/sync-shopify-products.sh
```

### If Changes Don't Show on Shop Page

1. Clear your browser cache
2. Check that you're not in development mode
3. Invalidate the React Query cache by refreshing the page

### To Force Re-initialization

If you need to see the initialize button again:
1. Delete entries from collection_order table (requires SQL access)
2. The button will reappear on the shop page and admin page

## Collection Visibility Logic

- **Shop Page** (`/shop`): Only shows collections where `is_visible = true`
- **Ordering**: Collections are sorted by:
  1. Featured status (featured first)
  2. Display order (ascending)
- **Admin Page**: Shows all collections regardless of visibility

## Quick Actions

To immediately hide the collections you mentioned:
1. Go to `/admin/collection-order`
2. Look for these collections and click their eye icons:
   - `featured-products`
   - `frontpage`
   - `lolcow-gaming`  
   - `shop-all`