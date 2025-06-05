#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

async function main() {
  console.log('🔍 Testing production sync with different auth methods...');
  
  try {
    const supabaseUrl = 'https://dlmbqojnhjsecajxltzj.supabase.co';
    const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbWJxb2puaGpzZWNhanhsdHpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYzMTk2MTIsImV4cCI6MjA2MTg5NTYxMn0.hzwgFpTau4WYyOH_gEgmrdiF8026NnC_Ar2_sdRwkJo';
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Test 1: No auth headers
    console.log('🔄 Test 1: No auth headers...');
    try {
      const { data, error } = await supabase.functions.invoke('shopify-orders', {
        body: { action: 'sync-orders-to-db' }
      });
      
      if (error) {
        console.log('❌ Error:', error.message);
        // Try to get more details from the response
        if (error.context && error.context.headers) {
          console.log('Response headers:', Object.fromEntries(error.context.headers.entries()));
        }
      } else {
        console.log('✅ Success:', data);
      }
    } catch (e) {
      console.log('❌ Exception:', e.message);
    }
    
    // Test 2: With Authorization header
    console.log('\n🔄 Test 2: With Authorization header...');
    try {
      const { data, error } = await supabase.functions.invoke('shopify-orders', {
        body: { action: 'sync-orders-to-db' },
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`
        }
      });
      
      if (error) {
        console.log('❌ Error:', error.message);
      } else {
        console.log('✅ Success:', data);
      }
    } catch (e) {
      console.log('❌ Exception:', e.message);
    }
    
    // Test 3: Direct HTTP call to see actual error response
    console.log('\n🔄 Test 3: Direct HTTP call...');
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/shopify-orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify({ action: 'sync-orders-to-db' })
      });
      
      console.log('Status:', response.status, response.statusText);
      const responseText = await response.text();
      console.log('Response body:', responseText);
      
    } catch (e) {
      console.log('❌ Exception:', e.message);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main();