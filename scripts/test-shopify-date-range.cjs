#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

async function main() {
  console.log('🔍 Testing Shopify date range sync...');
  
  try {
    const supabaseUrl = 'https://dlmbqojnhjsecajxltzj.supabase.co';
    const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbWJxb2puaGpzZWNhanhsdHpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYzMTk2MTIsImV4cCI6MjA2MTg5NTYxMn0.hzwgFpTau4WYyOH_gEgmrdiF8026NnC_Ar2_sdRwkJo';
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    console.log('📊 Current orders in database:');
    const { data: currentOrders } = await supabase
      .from('shopify_orders')
      .select('shopify_order_number, order_date')
      .order('order_date', { ascending: true });
    
    if (currentOrders && currentOrders.length > 0) {
      console.log(`   Total: ${currentOrders.length}`);
      console.log(`   Oldest: ${currentOrders[0].shopify_order_number} - ${currentOrders[0].order_date}`);
      console.log(`   Newest: ${currentOrders[currentOrders.length-1].shopify_order_number} - ${currentOrders[currentOrders.length-1].order_date}`);
    }
    
    // Try to fetch orders using the regular shopify-orders function with different parameters
    console.log('\n🔍 Testing direct Shopify API call with different date ranges...');
    
    // Test 1: Recent orders (should get current ones)
    console.log('\n📅 Test 1: Fetching recent orders (last 30 days)...');
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: recentTest, error: recentError } = await supabase.functions.invoke('shopify-orders', {
      body: {
        date_from: thirtyDaysAgo,
        limit: 250,
        sort_by: 'created_at',
        sort_order: 'desc'
      }
    });
    
    if (recentError) {
      console.log('❌ Recent test failed:', recentError);
    } else {
      console.log(`✅ Found ${recentTest?.data?.length || 0} recent orders`);
      if (recentTest?.data?.length > 0) {
        console.log(`   Oldest: ${recentTest.data[recentTest.data.length-1].shopify_order_number}`);
        console.log(`   Newest: ${recentTest.data[0].shopify_order_number}`);
      }
    }
    
    // Test 2: Much older orders
    console.log('\n📅 Test 2: Fetching older orders (before May 2025)...');
    const mayFirst = '2025-05-01T00:00:00Z';
    const { data: olderTest, error: olderError } = await supabase.functions.invoke('shopify-orders', {
      body: {
        date_to: mayFirst,
        limit: 250,
        sort_by: 'created_at',  
        sort_order: 'desc'
      }
    });
    
    if (olderError) {
      console.log('❌ Older test failed:', olderError);
    } else {
      console.log(`✅ Found ${olderTest?.data?.length || 0} orders before May 2025`);
      if (olderTest?.data?.length > 0) {
        console.log(`   Sample orders:`);
        olderTest.data.slice(0, 5).forEach(order => {
          console.log(`     ${order.shopify_order_number} - ${order.order_date}`);
        });
      }
    }
    
    // Test 3: All time without date filters
    console.log('\n📅 Test 3: Fetching all orders (no date filter)...');
    const { data: allTest, error: allError } = await supabase.functions.invoke('shopify-orders', {
      body: {
        limit: 250,
        sort_by: 'created_at',
        sort_order: 'asc' // Oldest first to see the full range
      }
    });
    
    if (allError) {
      console.log('❌ All orders test failed:', allError);
    } else {
      console.log(`✅ Found ${allTest?.data?.length || 0} orders (oldest first)`);
      if (allTest?.data?.length > 0) {
        console.log(`   Oldest: ${allTest.data[0].shopify_order_number} - ${allTest.data[0].order_date}`);
        console.log(`   Newest: ${allTest.data[allTest.data.length-1].shopify_order_number} - ${allTest.data[allTest.data.length-1].order_date}`);
        
        // Check for gaps
        const orderNums = allTest.data.map(o => parseInt(o.shopify_order_number.replace('#', '')));
        const min = Math.min(...orderNums);
        const max = Math.max(...orderNums);
        console.log(`   Order number range: #${min} to #${max} (${max - min + 1} expected vs ${orderNums.length} actual)`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main();