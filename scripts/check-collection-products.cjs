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

async function checkCollectionProducts() {
  try {
    // Check total count of collection_products
    const { count, error: countError } = await supabase
      .from('collection_products')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('Error counting collection_products:', countError);
    } else {
      console.log(`\nTotal collection_products relationships: ${count || 0}`);
    }

    // Get first 10 collection_products
    const { data: relationships, error: relError } = await supabase
      .from('collection_products')
      .select('collection_id, product_id, position')
      .limit(10);
    
    if (relError) {
      console.error('Error fetching collection_products:', relError);
    } else {
      console.log('\nFirst 10 collection_products:', relationships);
    }

    // Check if we have collections with the IDs in the relationships
    if (relationships && relationships.length > 0) {
      const collectionIds = [...new Set(relationships.map(r => r.collection_id))];
      const { data: collections, error: colError } = await supabase
        .from('shopify_collections')
        .select('id, title')
        .in('id', collectionIds);
      
      if (!colError && collections) {
        console.log('\nCollections found for these IDs:', collections);
      }
    }

    // Check a specific collection with details
    const { data: lolcowLive, error: llError } = await supabase
      .from('shopify_collections')
      .select('*')
      .eq('handle', 'lolcow-live')
      .single();
    
    if (!llError && lolcowLive) {
      console.log('\nLolcow Live collection details:', lolcowLive);
      
      // Check products for this collection
      const { data: liveProducts, error: lpError } = await supabase
        .from('collection_products')
        .select('product_id')
        .eq('collection_id', lolcowLive.id)
        .limit(5);
      
      if (!lpError) {
        console.log(`Products in Lolcow Live collection: ${liveProducts?.length || 0}`);
        if (liveProducts && liveProducts.length > 0) {
          console.log('Product IDs:', liveProducts.map(p => p.product_id));
        }
      }
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkCollectionProducts();