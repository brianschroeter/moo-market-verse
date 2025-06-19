#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  console.error('Make sure VITE_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkCollectionState() {
  try {
    console.log('🔍 Checking collection state...\n');

    // Get all collections from shopify_collections
    const { data: shopifyCollections, error: shopifyError } = await supabase
      .from('shopify_collections')
      .select('id, handle, title')
      .order('title');

    if (shopifyError) {
      console.error('❌ Error fetching shopify collections:', shopifyError);
      return;
    }

    // Get all collection orders
    const { data: collectionOrders, error: ordersError } = await supabase
      .from('collection_order')
      .select('*')
      .order('display_order');

    if (ordersError) {
      console.error('❌ Error fetching collection orders:', ordersError);
      return;
    }

    console.log(`📊 Shopify Collections: ${shopifyCollections?.length || 0}`);
    console.log(`📊 Collection Orders: ${collectionOrders?.length || 0}\n`);

    // Find collections without orders
    const orderHandles = new Set(collectionOrders?.map(o => o.collection_handle) || []);
    const missingCollections = shopifyCollections?.filter(c => !orderHandles.has(c.handle)) || [];

    if (missingCollections.length > 0) {
      console.log('❌ Collections missing from collection_order:');
      missingCollections.forEach(c => {
        console.log(`   - ${c.handle} (${c.title})`);
      });
    } else {
      console.log('✅ All collections have order entries');
    }

    console.log('\n📋 Current Collection Order:');
    console.log('Position | Handle | Visible | Featured');
    console.log('---------|--------|---------|----------');
    
    collectionOrders?.forEach((order, index) => {
      const visible = order.is_visible ? '✅' : '❌';
      const featured = order.featured ? '⭐' : '  ';
      console.log(`${String(index + 1).padStart(8)} | ${order.collection_handle.padEnd(20)} | ${visible.padEnd(7)} | ${featured}`);
    });

    // Check if featured column exists
    const { data: columnCheck, error: columnError } = await supabase
      .from('collection_order')
      .select('featured')
      .limit(1);

    if (columnError && columnError.message.includes('column "featured" does not exist')) {
      console.log('\n❌ Featured column does not exist in collection_order table');
      console.log('   Run the migration to add it');
    } else {
      console.log('\n✅ Featured column exists');
      const featuredCount = collectionOrders?.filter(o => o.featured).length || 0;
      console.log(`   ${featuredCount} collections marked as featured`);
    }

    // Check for the collections you want to hide
    const collectionsToHide = ['featured-products', 'frontpage', 'lolcow-gaming', 'shop-all'];
    console.log('\n🔍 Checking collections to hide:');
    collectionsToHide.forEach(handle => {
      const order = collectionOrders?.find(o => o.collection_handle === handle);
      if (order) {
        const status = order.is_visible ? '❌ Still visible' : '✅ Hidden';
        console.log(`   ${handle}: ${status}`);
      } else {
        console.log(`   ${handle}: ⚠️  Not found in collection_order`);
      }
    });

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkCollectionState();