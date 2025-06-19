#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};

envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    env[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
  }
});

const supabaseUrl = env.VITE_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase configuration in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkAllCollections() {
  try {
    // Get all collections from shopify_collections
    const { data: collections, error: colError } = await supabase
      .from('shopify_collections')
      .select('id, handle, title')
      .order('title');
    
    if (colError) {
      console.error('Error fetching collections:', colError);
      return;
    }
    
    console.log('All collections in database:');
    console.log('---------------------------');
    collections?.forEach(col => {
      console.log(`${col.title} (handle: ${col.handle})`);
    });
    
    // Get all collection orders
    const { data: orders, error: orderError } = await supabase
      .from('collection_order')
      .select('*')
      .order('display_order');
    
    if (orderError) {
      console.error('Error fetching collection orders:', orderError);
      return;
    }
    
    console.log('\n\nCollection orders (visibility management):');
    console.log('------------------------------------------');
    if (orders && orders.length > 0) {
      orders.forEach(order => {
        console.log(`${order.display_order}. ${order.collection_handle} - ${order.is_visible ? 'VISIBLE' : 'HIDDEN'}${order.featured ? ' ⭐ FEATURED' : ''}`);
      });
    } else {
      console.log('No collection orders found. Collections need to be initialized.');
    }
    
    // Find collections without orders
    const orderedHandles = new Set(orders?.map(o => o.collection_handle) || []);
    const unorderedCollections = collections?.filter(col => !orderedHandles.has(col.handle)) || [];
    
    if (unorderedCollections.length > 0) {
      console.log('\n\nCollections without visibility settings:');
      console.log('----------------------------------------');
      unorderedCollections.forEach(col => {
        console.log(`- ${col.title} (handle: ${col.handle})`);
      });
      console.log('\nThese collections need to be initialized through the admin interface at /admin/collection-order');
    }
    
    // Find the specific collections we want to hide
    console.log('\n\nLooking for collections to hide:');
    console.log('--------------------------------');
    const targetCollections = ['Featured Products', 'Home page', 'Lolcow Gaming', 'Shop All'];
    targetCollections.forEach(title => {
      const collection = collections?.find(c => c.title === title);
      if (collection) {
        console.log(`✓ Found: "${title}" with handle: ${collection.handle}`);
      } else {
        console.log(`✗ Not found: "${title}"`);
      }
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkAllCollections();