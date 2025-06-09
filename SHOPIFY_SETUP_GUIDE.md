# Shopify Setup Guide

## Quick Setup for Testing

Since you're ready to test the Shop functionality, here's how to set up the Shopify integration:

## Option 1: Test with Mock Data (Immediate Testing)

For immediate testing without Shopify credentials, the edge function will return mock data. You can test the UI functionality right now by visiting:

- **Shop Page**: http://localhost:8082/shop
- The app will show error states gracefully when no Shopify credentials are configured

## Option 2: Full Shopify Integration

### Step 1: Create Shopify Storefront API Access

1. **Go to your Shopify Admin**:
   - Navigate to: Apps → App and sales channel settings → Develop apps
   - Click "Create an app"
   - Name it: "LolCow Portal Integration"

2. **Configure Storefront API Scopes**:
   - Go to the "Configuration" tab
   - Under "Storefront API access scopes", enable:
     - ✅ `unauthenticated_read_product_listings`
     - ✅ `unauthenticated_read_product_inventory`
     - ✅ `unauthenticated_read_collection_listings`
     - ✅ `unauthenticated_read_product_tags`

3. **Install and Generate Token**:
   - Click "Install app" 
   - Copy the **Storefront access token** (starts with `shpat_`)

### Step 2: Add Environment Variables to Supabase

1. **Go to your Supabase Dashboard**:
   - Project: https://supabase.com/dashboard/project/dlmbqojnhjsecajxltzj
   - Navigate to: Settings → Edge Functions → Environment Variables

2. **Add these secrets**:
   ```bash
   SHOPIFY_STOREFRONT_ACCESS_TOKEN=shpat_xxxxxxxxxxxxxxxxxxxxx
   SHOPIFY_SHOP_DOMAIN=your-shop-name.myshopify.com
   SHOPIFY_STOREFRONT_API_VERSION=2024-04
   ```

### Step 3: Test the Integration

Once environment variables are set:

1. **Test the Edge Function directly**:
   ```bash
   curl "https://dlmbqojnhjsecajxltzj.supabase.co/functions/v1/shopify-storefront/collections"
   ```

2. **Test in the application**:
   - Visit: http://localhost:8082/shop
   - Collections should load from your Shopify store
   - Click on any collection to view products

## Current Status ✅

### What's Working Now:
- ✅ Shop page loads with search functionality
- ✅ Navigation includes "Shop" link
- ✅ Collection browsing UI is complete
- ✅ Product grid with "Shop Now" buttons
- ✅ Error handling for missing credentials
- ✅ Responsive design
- ✅ Edge function deployed and ready

### What Happens Without Shopify Credentials:
- Shop page shows a graceful error message
- UI components are fully functional
- Ready for immediate Shopify integration

## Quick Test Commands

### Test the Edge Function:
```bash
# Test collections endpoint
curl "https://dlmbqojnhjsecajxltzj.supabase.co/functions/v1/shopify-storefront/collections"

# Test specific collection (replace 'collection-handle' with actual handle)
curl "https://dlmbqojnhjsecajxltzj.supabase.co/functions/v1/shopify-storefront/collections/collection-handle"

# Test specific product (replace 'product-handle' with actual handle)
curl "https://dlmbqojnhjsecajxltzj.supabase.co/functions/v1/shopify-storefront/products/product-handle"
```

### Test the Frontend:
```bash
# Start dev server (already running)
npm run dev

# Visit these URLs:
# http://localhost:8082/shop - Main shop page
# http://localhost:8082/shop/any-collection - Collection page (will show 404 until Shopify is connected)
```

## Troubleshooting

### Common Issues:
1. **"Missing Shopify configuration" error**: Environment variables not set in Supabase
2. **GraphQL errors**: Check Shopify API token permissions
3. **404 errors for collections**: Collection handles need to match exactly
4. **CORS errors**: Edge function handles CORS automatically

### Debug Steps:
1. Check Supabase Edge Function logs in dashboard
2. Verify environment variables are set correctly
3. Test API token directly in Shopify GraphQL explorer
4. Check browser developer console for errors

## Next Steps

Once Shopify is connected, you can:
1. ✅ Browse all your collections
2. ✅ View products within collections
3. ✅ Search collections by name
4. ✅ Click through to purchase on Shopify
5. 🔄 Implement product detail pages (Phase 2)
6. 🔄 Add advanced search and filtering (Phase 3)

The foundation is complete and ready for your Shopify store!