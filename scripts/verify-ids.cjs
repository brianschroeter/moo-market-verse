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

async function verifyIds() {
  try {
    // Get all product IDs
    const { data: products, error: pError } = await supabase
      .from('shopify_products')
      .select('id')
      .limit(10);
    
    if (pError) {
      console.error('Error fetching products:', pError);
      return;
    }
    
    console.log('Sample Product IDs:', products?.map(p => p.id));
    console.log('Product ID types:', products?.map(p => typeof p.id));

    // Get all collection IDs
    const { data: collections, error: cError } = await supabase
      .from('shopify_collections')
      .select('id, handle')
      .limit(10);
    
    if (cError) {
      console.error('Error fetching collections:', cError);
      return;
    }
    
    console.log('\nSample Collection IDs:', collections?.map(c => ({ id: c.id, handle: c.handle })));
    console.log('Collection ID types:', collections?.map(c => typeof c.id));

    // Try to manually insert a collection_product relationship
    if (products && products.length > 0 && collections && collections.length > 0) {
      console.log('\nTrying to insert a test collection_product relationship...');
      const testInsert = {
        collection_id: collections[0].id,
        product_id: products[0].id,
        position: 0
      };
      
      console.log('Test insert data:', testInsert);
      
      const { error: insertError } = await supabase
        .from('collection_products')
        .insert(testInsert);
      
      if (insertError) {
        console.error('Insert error:', insertError);
      } else {
        console.log('Test insert successful!');
        
        // Clean up test insert
        const { error: deleteError } = await supabase
          .from('collection_products')
          .delete()
          .eq('collection_id', collections[0].id)
          .eq('product_id', products[0].id);
        
        if (!deleteError) {
          console.log('Test insert cleaned up');
        }
      }
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

verifyIds();