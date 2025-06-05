#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

async function main() {
  console.log('🔄 Running continuous Shopify sync to fetch ALL orders...');
  
  try {
    const supabaseUrl = 'https://dlmbqojnhjsecajxltzj.supabase.co';
    const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbWJxb2puaGpzZWNhanhsdHpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYzMTk2MTIsImV4cCI6MjA2MTg5NTYxMn0.hzwgFpTau4WYyOH_gEgmrdiF8026NnC_Ar2_sdRwkJo';
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Get initial count
    const { data: initialOrders } = await supabase
      .from('shopify_orders')
      .select('*', { count: 'exact' });
    
    let initialCount = initialOrders?.length || 0;
    console.log(`📊 Starting with ${initialCount} orders`);
    
    let attempt = 1;
    let totalNewOrders = 0;
    const maxAttempts = 10; // Safety limit
    
    while (attempt <= maxAttempts) {
      console.log(`\n🔄 Sync attempt ${attempt}/${maxAttempts}...`);
      
      const { data, error } = await supabase.functions.invoke('shopify-orders', {
        body: { 
          action: 'sync-orders-to-db'
        }
      });
      
      if (error) {
        console.error(`❌ Attempt ${attempt} failed:`, error);
        break;
      }
      
      console.log(`📊 Attempt ${attempt} result:`, data);
      
      // Check new count
      const { data: currentOrders } = await supabase
        .from('shopify_orders')
        .select('*', { count: 'exact' });
      
      const currentCount = currentOrders?.length || 0;
      const newInThisAttempt = currentCount - (initialCount + totalNewOrders);
      totalNewOrders += newInThisAttempt;
      
      console.log(`📈 Current total: ${currentCount} orders (+${newInThisAttempt} in this attempt, +${totalNewOrders} total new)`);
      
      // Check if we got new orders
      if (newInThisAttempt === 0) {
        console.log('✅ No new orders in this attempt - sync appears complete');
        break;
      }
      
      // Check if we hit the page limit
      if (data?.message?.includes('max page limit')) {
        console.log('⚠️  Hit page limit - continuing with next sync...');
      }
      
      // Wait a bit to avoid rate limiting
      console.log('⏱️  Waiting 3 seconds before next attempt...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      attempt++;
    }
    
    // Final summary
    console.log(`\n🎉 Sync completed after ${attempt - 1} attempts!`);
    console.log(`📊 Total new orders synced: ${totalNewOrders}`);
    console.log(`📊 Final order count: ${initialCount + totalNewOrders}`);
    
    // Show final order range
    const { data: finalOrders } = await supabase
      .from('shopify_orders')
      .select('shopify_order_number, order_date')
      .order('order_date', { ascending: true });
    
    if (finalOrders && finalOrders.length > 0) {
      const oldest = finalOrders[0];
      const newest = finalOrders[finalOrders.length - 1];
      
      console.log(`📅 Final date range:`);
      console.log(`   Oldest: ${oldest.shopify_order_number} - ${oldest.order_date}`);
      console.log(`   Newest: ${newest.shopify_order_number} - ${newest.order_date}`);
      
      // Check order number gaps
      const orderNumbers = finalOrders.map(o => parseInt(o.shopify_order_number.replace('#', '')));
      const minOrder = Math.min(...orderNumbers);
      const maxOrder = Math.max(...orderNumbers);
      
      console.log(`🔢 Order number range: #${minOrder} to #${maxOrder}`);
      console.log(`   Orders in database: ${finalOrders.length}`);
      console.log(`   Expected in range: ${maxOrder - minOrder + 1}`);
      
      if (finalOrders.length < (maxOrder - minOrder + 1)) {
        console.log(`⚠️  Still missing ${(maxOrder - minOrder + 1) - finalOrders.length} orders in this range`);
        console.log('💡 This suggests orders below #${minOrder} or gaps due to cancelled/deleted orders');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main();