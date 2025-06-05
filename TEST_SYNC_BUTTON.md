# Testing the Sync Button

## Access the Admin Panel
1. Navigate to `http://localhost:8085/admin/printful-orders`
2. You should see "Development Mode" badge in the top right
3. The page should load with existing order data

## Test Sync Functionality

### 1. Test "Sync Latest Orders" Button
- Click the blue "Sync Latest Orders" button
- Should show loading spinner
- Should display toast message explaining this is development mode
- Button should re-enable after completion

### 2. Test "Full Sync" Button  
- Click the "Full Sync" button (outline style)
- Should show loading spinner
- Should display appropriate development mode message
- Button should re-enable after completion

## Expected Behavior

### Development Mode (Current)
- ✅ Buttons work and show loading states
- ✅ Toast notifications explain development limitations
- ✅ UI remains functional and responsive
- ✅ No actual API calls to Printful (graceful degradation)

### Production Mode (When API key is configured)
- ✅ Buttons trigger actual Printful API sync
- ✅ Real order data is fetched and stored
- ✅ Success messages show actual counts
- ✅ Order list refreshes with new data

## Visual Confirmation

The page should show:
1. "Development Mode" badge (top right)
2. Two sync buttons in the filters section
3. Proper loading states when clicked
4. Toast notifications with helpful messages
5. No console errors (only 404 for missing avatar images, which is expected)

## Next Steps for Production

To enable full functionality in production:
1. Add `PRINTFUL_API_KEY` to Supabase project secrets
2. Verify edge function has access to production database
3. Test with actual Printful account data