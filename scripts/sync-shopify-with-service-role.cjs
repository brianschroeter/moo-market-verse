#!/usr/bin/env node

async function main() {
  console.log('🛒 Syncing ALL Shopify orders using service role...');
  
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    console.error('❌ Please set SUPABASE_SERVICE_ROLE_KEY environment variable');
    console.error('💡 This key provides admin access and should be kept secure');
    return;
  }
  
  try {
    const supabaseUrl = 'https://dlmbqojnhjsecajxltzj.supabase.co';
    
    console.log('📊 Checking current order count...');
    
    // Direct HTTP call using service role key
    const response = await fetch(`${supabaseUrl}/functions/v1/shopify-orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`
      },
      body: JSON.stringify({ 
        action: 'sync-orders-to-db'
      })
    });
    
    console.log('Response status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Sync failed:', errorText);
      return;
    }
    
    const data = await response.json();
    console.log('✅ Sync completed successfully!');
    console.log('📊 Result:', JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Check if service role key is provided
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  console.error('💡 Usage: SUPABASE_SERVICE_ROLE_KEY=your_service_role_key node scripts/sync-shopify-with-service-role.cjs');
  console.error('');
  console.error('🔐 You can find your service role key in:');
  console.error('   Supabase Dashboard → Project Settings → API → service_role key');
  console.error('');
  console.error('⚠️  WARNING: The service role key bypasses RLS and should be kept secure!');
  process.exit(1);
}

main();