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

async function checkShopData() {
  try {
    // Check products
    const { data: products, error: productsError } = await supabase
      .from('shopify_products')
      .select('id, title, status')
      .limit(5);
    
    if (productsError) {
      console.error('Error fetching products:', productsError);
    } else {
      console.log(`\nTotal products in database: ${products?.length || 0}`);
      console.log('Sample products:', products);
    }

    // Check collections
    const { data: collections, error: collectionsError } = await supabase
      .from('shopify_collections')
      .select('id, title, handle');
    
    if (collectionsError) {
      console.error('Error fetching collections:', collectionsError);
    } else {
      console.log(`\nTotal collections in database: ${collections?.length || 0}`);
      console.log('Collections:', collections?.map(c => c.title));
    }

    // Check collection-product relationships
    const { data: relationships, error: relError } = await supabase
      .from('collection_products')
      .select('collection_id, product_id')
      .limit(10);
    
    if (relError) {
      console.error('Error fetching relationships:', relError);
    } else {
      console.log(`\nTotal collection-product relationships: ${relationships?.length || 0}`);
    }

    // Check a specific collection with products
    if (collections && collections.length > 0) {
      const { data: collectionProducts, error: cpError } = await supabase
        .from('collection_products')
        .select(`
          collection_id,
          product_id,
          shopify_products (
            id,
            title
          )
        `)
        .eq('collection_id', collections[0].id)
        .limit(5);
      
      if (!cpError && collectionProducts) {
        console.log(`\nProducts in "${collections[0].title}" collection:`, 
          collectionProducts.map(cp => cp.shopify_products?.title));
      }
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkShopData();