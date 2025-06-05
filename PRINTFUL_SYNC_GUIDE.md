# Printful Orders Sync Guide

## Overview
The admin panel now includes sync functionality to fetch the latest Printful orders into the database.

## Features Added

### 🔄 Sync Buttons in Admin Panel
Located at: `http://localhost:8085/admin/printful-orders`

**Two sync options:**
1. **"Sync Latest Orders"** (Blue button) - Incremental sync for recent orders
2. **"Full Sync"** (Outline button) - Complete sync of ALL orders from Printful

### 🏗️ Technical Implementation

#### Service Function
- `syncPrintfulOrders()` in `/src/services/printfulService.ts`
- Calls the `sync-printful-orders` edge function
- Works in both development and production environments

#### UI Components
- Loading states with spinners
- Toast notifications for success/error feedback
- Disabled state management during sync operations
- Automatic refresh of orders list after successful sync

#### Edge Function Enhancement
- Modified `/supabase/functions/sync-printful-orders/index.ts`
- Added support for `fullSync` and `forceAllOrders` parameters
- Removed safety limits for full sync operations
- Enhanced pagination to fetch all available orders

## Usage

### Development Mode
- Dev mode is enabled (`VITE_DEVMODE=true`)
- Uses mocked authentication
- Sync buttons will work if Printful API key is configured in Supabase secrets

### Production Mode
- Requires proper authentication as admin user
- Full Printful API integration
- Complete order sync capability

## Environment Requirements

### Required Supabase Secrets
The edge function requires these environment variables to be set in Supabase:
- `PRINTFUL_API_KEY` - Your Printful API key
- `SUPABASE_URL` - Supabase project URL  
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for admin operations

### Development Testing
If you need to test without Printful API:
1. The buttons will show appropriate error messages
2. Mock data can be added to the database for UI testing
3. All UI functionality works regardless of API availability

## Sync Process Flow

1. **User clicks sync button** → Loading state activated
2. **Service function called** → Calls edge function with parameters
3. **Edge function executes** → Fetches orders from Printful API
4. **Database updated** → Orders and items upserted to database
5. **UI refreshes** → Success toast shown, orders list updated

## Error Handling

- **Network errors** - Graceful error messages
- **API failures** - Detailed error descriptions
- **Authentication issues** - Clear feedback to user
- **Timeout handling** - Appropriate messaging for long-running syncs

## Performance Notes

- **Incremental sync** - Usually completes in 30-60 seconds
- **Full sync** - Can take 5-10 minutes for ~800 orders
- **Progress indication** - Loading states keep user informed
- **Non-blocking** - Other admin functions remain available

## Monitoring

Check the browser console and Supabase logs for detailed sync information:
- Order counts processed
- Error details if sync fails
- Performance timing information