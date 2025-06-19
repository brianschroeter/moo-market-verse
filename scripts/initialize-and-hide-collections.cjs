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

// Collections to hide (using correct handles)
const collectionsToHide = new Set([
  'featured-products',
  'frontpage',  // "Home page"
  'lolcow-gaming',
  'shop-all'
]);

// Featured collections (from the service)
const featuredCollections = new Set([
  'lolcowlive',  // Note: different from 'lolcow-live'
  'lolcow-queens',
  'lolcow-rewind',
  'lolcow-nerd',
  'lolcow-test',
  'mafia-milkers',
  'lolcow-techtalk',
  'lolcow-cafe',
  'lolcow-aussy',
  'angry-grandpa'
]);

async function initializeAndHideCollections() {
  try {
    console.log('Initializing collections and setting visibility...\n');
    
    // Get all collections
    const { data: collections, error: colError } = await supabase
      .from('shopify_collections')
      .select('id, handle, title')
      .order('title');
    
    if (colError) {
      console.error('Error fetching collections:', colError);
      return;
    }
    
    // Prepare collection orders (without featured column since it doesn't exist yet)
    const collectionOrders = collections.map((collection, index) => ({
      collection_handle: collection.handle,
      display_order: index,
      is_visible: !collectionsToHide.has(collection.handle)  // Hide specified collections
    }));
    
    console.log('Creating collection orders with visibility settings:\n');
    
    // Insert all collection orders
    const { data: insertedOrders, error: insertError } = await supabase
      .from('collection_order')
      .insert(collectionOrders)
      .select();
    
    if (insertError) {
      console.error('Error creating collection orders:', insertError);
      console.error('\nNote: This operation requires admin privileges.');
      console.error('Make sure you are logged in as an admin user.');
      console.error('You can also use the admin interface at /admin/collection-order');
      return;
    }
    
    console.log('✅ Successfully initialized collection orders:\n');
    
    insertedOrders?.forEach(order => {
      const collection = collections.find(c => c.handle === order.collection_handle);
      const status = [];
      
      if (!order.is_visible) status.push('🚫 HIDDEN');
      else status.push('👁  VISIBLE');
      
      console.log(`${order.display_order + 1}. ${collection?.title || order.collection_handle} - ${status.join(', ')}`);
    });
    
    console.log('\n✨ Done! Collections have been initialized with the following hidden:');
    collections
      .filter(c => collectionsToHide.has(c.handle))
      .forEach(c => console.log(`  - ${c.title}`));
    
    console.log('\nYou can manage collection visibility at /admin/collection-order');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

initializeAndHideCollections();