#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

async function main() {
  console.log('🛒 Syncing ALL Shopify orders to Supabase database...');
  
  try {
    // Initialize Supabase client (use local for development)
    const useLocal = process.env.USE_LOCAL === 'true' || process.argv.includes('--local');
    
    let supabaseUrl, supabaseAnonKey;
    if (useLocal) {
      console.log('🔧 Using LOCAL Supabase instance...');
      supabaseUrl = 'http://localhost:54321';
      supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
    } else {
      console.log('☁️  Using PRODUCTION Supabase instance...');
      supabaseUrl = process.env.VITE_PUBLIC_SUPABASE_URL || 'https://dlmbqojnhjsecajxltzj.supabase.co';
      supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbWJxb2puaGpzZWNhanhsdHpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYzMTk2MTIsImV4cCI6MjA2MTg5NTYxMn0.hzwgFpTau4WYyOH_gEgmrdiF8026NnC_Ar2_sdRwkJo';
    }
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    console.log('📊 Checking current order count...');
    const { data: currentOrders, error: countError } = await supabase
      .from('shopify_orders')
      .select('*', { count: 'exact' });
    
    if (countError) {
      console.error('❌ Error checking current orders:', countError);
      return;
    }
    
    console.log(`   Current local orders: ${currentOrders?.length || 0}`);
    
    console.log('🔄 Triggering Shopify sync...');
    console.log('⚠️  This requires Shopify API credentials to be configured in Supabase');
    
    // Call the shopify-orders edge function with sync action
    const headers = useLocal 
      ? { 'Authorization': 'Bearer dev-access-token' } // Development mode
      : {}; // Production mode - use normal auth
      
    const { data, error } = await supabase.functions.invoke('shopify-orders', {
      body: { 
        action: 'sync-orders-to-db'
      },
      headers
    });
    
    if (error) {
      console.error('❌ Sync failed:', error);
      
      if (error.message?.includes('Shopify API credentials missing') || 
          error.message?.includes('SHOPIFY_SHOP_DOMAIN') ||
          error.message?.includes('SHOPIFY_ADMIN_API_ACCESS_TOKEN')) {
        console.log('\n📋 SETUP REQUIRED:');
        console.log('To sync orders from Shopify, you need to configure these environment variables:');
        console.log('');
        console.log('1. SHOPIFY_SHOP_DOMAIN - Your Shopify store domain (e.g., your-store.myshopify.com)');
        console.log('2. SHOPIFY_ADMIN_API_ACCESS_TOKEN - Your Shopify Admin API access token');
        console.log('3. SHOPIFY_API_VERSION - (Optional) API version, defaults to 2024-04');
        console.log('');
        console.log('🔧 To set these up:');
        console.log('1. Go to your Shopify Admin → Apps → Develop apps');
        console.log('2. Create a new private app or use existing one');
        console.log('3. Enable Admin API access with read_orders scope');
        console.log('4. Copy the Admin API access token');
        console.log('5. Add to your Supabase project environment variables:');
        console.log('   - Via Supabase Dashboard → Project Settings → Environment Variables');
        console.log('   - Or via local .env.local file for development');
        console.log('');
        console.log('💡 Once configured, run this script again to sync all orders!');
      }
      return;
    }
    
    console.log('✅ Sync completed successfully!');
    console.log('📊 Result:', data);
    
    // Check final count
    const { data: finalOrders, error: finalCountError } = await supabase
      .from('shopify_orders')
      .select('*', { count: 'exact' });
    
    if (!finalCountError) {
      const finalCount = finalOrders?.length || 0;
      const improvement = finalCount - (currentOrders?.length || 0);
      console.log(`📈 Final count: ${finalCount} orders (+${improvement} new)`);
      
      if (improvement > 0) {
        console.log('🎉 Successfully synced new orders from Shopify!');
        
        // Show sample of recent orders
        const { data: recentOrders } = await supabase
          .from('shopify_orders')
          .select('shopify_order_number, customer_name, total_amount, order_date')
          .order('order_date', { ascending: false })
          .limit(5);
        
        if (recentOrders && recentOrders.length > 0) {
          console.log('🔍 Recent orders:');
          recentOrders.forEach(order => {
            const date = new Date(order.order_date).toISOString().split('T')[0];
            console.log(`   ${order.shopify_order_number} - ${order.customer_name} - $${order.total_amount} - ${date}`);
          });
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Check if required npm packages are installed
try {
  require('@supabase/supabase-js');
} catch (e) {
  console.error('❌ Missing dependency: @supabase/supabase-js');
  console.error('💡 Run: npm install @supabase/supabase-js');
  process.exit(1);
}

main();