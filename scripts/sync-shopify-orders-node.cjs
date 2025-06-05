#!/usr/bin/env node

const { Client } = require('pg');

async function main() {
  console.log('🛒 Syncing Shopify orders from production using Node.js...');
  
  // Check for password environment variable
  const password = process.env.SUPABASE_DB_PASSWORD;
  if (!password) {
    console.error('❌ Please set SUPABASE_DB_PASSWORD environment variable');
    console.error('💡 Usage: SUPABASE_DB_PASSWORD=your_password node scripts/sync-shopify-orders-node.cjs');
    process.exit(1);
  }
  
  try {
    
    // Production database connection (using pooler for better connectivity)
    const prodClient = new Client({
      host: 'aws-0-us-east-2.pooler.supabase.com',
      user: 'postgres.dlmbqojnhjsecajxltzj',
      password: password,
      database: 'postgres',
      port: 6543,
      ssl: { rejectUnauthorized: false }
    });
    
    // Local database connection
    const localClient = new Client({
      host: 'localhost',
      user: 'postgres',
      password: 'postgres',
      database: 'postgres',
      port: 54322
    });
    
    console.log('🔗 Connecting to production database...');
    await prodClient.connect();
    
    console.log('🔗 Connecting to local database...');
    await localClient.connect();
    
    // Get current counts
    console.log('📊 Checking current counts...');
    const localCountResult = await localClient.query('SELECT COUNT(*) FROM public.shopify_orders');
    const localCount = parseInt(localCountResult.rows[0].count);
    console.log(`   Local: ${localCount} orders`);
    
    const prodCountResult = await prodClient.query('SELECT COUNT(*) FROM public.shopify_orders');
    const prodCount = parseInt(prodCountResult.rows[0].count);
    console.log(`   Production: ${prodCount} orders`);
    
    if (prodCount === 0) {
      console.log('❌ No orders found in production');
      return;
    }
    
    // Get all production data
    console.log('📥 Fetching all production orders...');
    const prodResult = await prodClient.query(`
      SELECT 
        shopify_order_id,
        shopify_order_number,
        customer_name,
        customer_email,
        shipping_address,
        billing_address,
        total_amount,
        currency,
        order_date,
        fulfillment_status,
        financial_status,
        line_items,
        notes,
        tags,
        created_at,
        updated_at
      FROM public.shopify_orders 
      ORDER BY order_date DESC
    `);
    
    console.log(`✅ Fetched ${prodResult.rows.length} orders from production`);
    
    // Clear local data
    console.log('🗑️  Clearing local shopify_orders...');
    await localClient.query('TRUNCATE TABLE public.shopify_orders RESTART IDENTITY CASCADE');
    
    // Insert data in batches
    console.log('📤 Inserting orders into local database...');
    const batchSize = 100;
    let inserted = 0;
    
    for (let i = 0; i < prodResult.rows.length; i += batchSize) {
      const batch = prodResult.rows.slice(i, i + batchSize);
      
      for (const row of batch) {
        await localClient.query(`
          INSERT INTO public.shopify_orders (
            shopify_order_id, shopify_order_number, customer_name, customer_email,
            shipping_address, billing_address, total_amount, currency, order_date,
            fulfillment_status, financial_status, line_items, notes, tags,
            created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        `, [
          row.shopify_order_id,
          row.shopify_order_number,
          row.customer_name,
          row.customer_email,
          row.shipping_address,
          row.billing_address,
          row.total_amount,
          row.currency,
          row.order_date,
          row.fulfillment_status,
          row.financial_status,
          row.line_items,
          row.notes,
          row.tags,
          row.created_at,
          row.updated_at
        ]);
        inserted++;
      }
      
      process.stdout.write(`\r   Inserted ${inserted}/${prodResult.rows.length} orders...`);
    }
    
    console.log('\n');
    
    // Verify final count
    const finalCountResult = await localClient.query('SELECT COUNT(*) FROM public.shopify_orders');
    const finalCount = parseInt(finalCountResult.rows[0].count);
    
    console.log(`📊 Final count: ${finalCount} orders`);
    
    if (finalCount === prodCount) {
      console.log(`✅ SUCCESS: All ${prodCount} orders synced successfully!`);
      console.log(`📈 Improvement: +${finalCount - localCount} orders`);
    } else {
      console.log(`⚠️  PARTIAL SUCCESS: Expected ${prodCount} but got ${finalCount}`);
    }
    
    // Show sample data
    console.log('🔍 Sample orders:');
    const sampleResult = await localClient.query(`
      SELECT shopify_order_number, customer_name, total_amount, order_date 
      FROM public.shopify_orders 
      ORDER BY order_date DESC 
      LIMIT 3
    `);
    
    sampleResult.rows.forEach(row => {
      console.log(`   ${row.shopify_order_number} - ${row.customer_name} - $${row.total_amount} - ${row.order_date.toISOString().split('T')[0]}`);
    });
    
    await prodClient.end();
    await localClient.end();
    
    console.log('🎉 Sync complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 Make sure Supabase is running: npx supabase start');
    } else if (error.code === 'ENOTFOUND') {
      console.error('💡 Check your internet connection and database host');
    } else if (error.message.includes('password authentication failed')) {
      console.error('💡 Check your database password');
    }
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();