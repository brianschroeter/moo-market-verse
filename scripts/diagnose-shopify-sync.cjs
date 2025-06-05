#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

async function main() {
  console.log('🔍 Diagnosing Shopify sync pagination...');
  
  try {
    // Use production Supabase
    const supabaseUrl = 'https://dlmbqojnhjsecajxltzj.supabase.co';
    const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbWJxb2puaGpzZWNhanhsdHpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYzMTk2MTIsImV4cCI6MjA2MTg5NTYxMn0.hzwgFpTau4WYyOH_gEgmrdiF8026NnC_Ar2_sdRwkJo';
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    console.log('☁️  Checking production Shopify orders...');
    
    // Get current state
    const { data: currentOrders, error: countError } = await supabase
      .from('shopify_orders')
      .select('shopify_order_number, order_date, created_at, last_shopify_sync_at')
      .order('order_date', { ascending: true });
    
    if (countError) {
      console.error('❌ Error checking current orders:', countError);
      return;
    }
    
    console.log(`📊 Current database: ${currentOrders?.length || 0} orders`);
    
    if (currentOrders && currentOrders.length > 0) {
      const oldest = currentOrders[0];
      const newest = currentOrders[currentOrders.length - 1];
      
      console.log(`📅 Date range:`);
      console.log(`   Oldest: ${oldest.shopify_order_number} - ${oldest.order_date}`);
      console.log(`   Newest: ${newest.shopify_order_number} - ${newest.order_date}`);
      console.log(`   Last sync: ${newest.last_shopify_sync_at}`);
      
      // Check for gaps in order numbers
      const orderNumbers = currentOrders.map(o => parseInt(o.shopify_order_number.replace('#', '')));
      const minOrder = Math.min(...orderNumbers);
      const maxOrder = Math.max(...orderNumbers);
      
      console.log(`🔢 Order number range: #${minOrder} to #${maxOrder}`);
      console.log(`   Expected orders in range: ${maxOrder - minOrder + 1}`);
      console.log(`   Actual orders in database: ${currentOrders.length}`);
      console.log(`   Missing orders: ${(maxOrder - minOrder + 1) - currentOrders.length}`);
      
      if ((maxOrder - minOrder + 1) - currentOrders.length > 0) {
        console.log('⚠️  There are gaps in the order sequence - likely more orders exist!');
      }
    }
    
    console.log('\n🔄 Running sync with detailed logging...');
    
    // Run sync and capture detailed response
    const { data, error } = await supabase.functions.invoke('shopify-orders', {
      body: { 
        action: 'sync-orders-to-db'
      }
    });
    
    if (error) {
      console.error('❌ Sync failed:', error);
      return;
    }
    
    console.log('📊 Sync result:', JSON.stringify(data, null, 2));
    
    // Check if we hit the page limit
    if (data?.message?.includes('max page limit')) {
      console.log('⚠️  HIT PAGE LIMIT! There are more orders to sync.');
      console.log('💡 Solution: Run the sync multiple times or increase maxPages in the function.');
    }
    
    // Get updated count
    const { data: updatedOrders, error: updatedError } = await supabase
      .from('shopify_orders')
      .select('*', { count: 'exact' });
    
    if (!updatedError) {
      const newCount = updatedOrders?.length || 0;
      const added = newCount - (currentOrders?.length || 0);
      console.log(`📈 Updated count: ${newCount} orders (+${added} new)`);
      
      if (added === 0) {
        console.log('🤔 No new orders added. Possible reasons:');
        console.log('   1. All available orders are already synced');
        console.log('   2. Hit pagination limit (check function logs)');
        console.log('   3. Date filters limiting the fetch');
        console.log('   4. Shopify API rate limiting');
      }
    }
    
  } catch (error) {
    console.error('❌ Diagnostic error:', error.message);
  }
}

main();