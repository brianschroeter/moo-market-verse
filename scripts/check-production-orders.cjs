#!/usr/bin/env node

const { Client } = require('pg');

async function main() {
  console.log('🔍 Checking production Shopify orders...');
  
  const password = process.env.SUPABASE_DB_PASSWORD;
  if (!password) {
    console.error('❌ Please set SUPABASE_DB_PASSWORD environment variable');
    process.exit(1);
  }
  
  try {
    // Production database connection
    const prodClient = new Client({
      host: 'aws-0-us-east-2.pooler.supabase.com',
      user: 'postgres.dlmbqojnhjsecajxltzj',
      password: password,
      database: 'postgres',
      port: 6543,
      ssl: { rejectUnauthorized: false }
    });
    
    console.log('🔗 Connecting to production database...');
    await prodClient.connect();
    
    // Check table schema
    console.log('📋 Production table schema:');
    const schemaResult = await prodClient.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'shopify_orders' 
      ORDER BY ordinal_position
    `);
    
    schemaResult.rows.forEach(row => {
      console.log(`   ${row.column_name}: ${row.data_type} ${row.is_nullable === 'YES' ? '(nullable)' : '(not null)'}`);
    });
    
    // Check count
    const countResult = await prodClient.query('SELECT COUNT(*) FROM public.shopify_orders');
    const count = parseInt(countResult.rows[0].count);
    console.log(`📊 Total orders in production: ${count}`);
    
    // Show date range
    const dateRangeResult = await prodClient.query(`
      SELECT 
        MIN(order_date) as earliest_order,
        MAX(order_date) as latest_order
      FROM public.shopify_orders
    `);
    
    if (dateRangeResult.rows[0].earliest_order) {
      console.log(`📅 Date range: ${dateRangeResult.rows[0].earliest_order.toISOString().split('T')[0]} to ${dateRangeResult.rows[0].latest_order.toISOString().split('T')[0]}`);
    }
    
    // Show some recent orders
    console.log('📋 Recent orders:');
    const recentResult = await prodClient.query(`
      SELECT shopify_order_number, customer_name, total_amount, order_date
      FROM public.shopify_orders 
      ORDER BY order_date DESC 
      LIMIT 5
    `);
    
    recentResult.rows.forEach(row => {
      console.log(`   ${row.shopify_order_number} - ${row.customer_name} - $${row.total_amount} - ${row.order_date.toISOString().split('T')[0]}`);
    });
    
    // Check for any other tables that might have orders
    console.log('🔍 Looking for other order-related tables...');
    const tablesResult = await prodClient.query(`
      SELECT table_name, 
             (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public' 
        AND (table_name LIKE '%order%' OR table_name LIKE '%shopify%')
      ORDER BY table_name
    `);
    
    for (const table of tablesResult.rows) {
      const tableCountResult = await prodClient.query(`SELECT COUNT(*) FROM public.${table.table_name}`);
      const tableCount = parseInt(tableCountResult.rows[0].count);
      console.log(`   ${table.table_name}: ${tableCount} rows (${table.column_count} columns)`);
    }
    
    await prodClient.end();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();