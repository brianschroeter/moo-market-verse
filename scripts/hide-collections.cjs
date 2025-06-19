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
  console.error('Make sure VITE_PUBLIC_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set');
  process.exit(1);
}

// Create client with anon key
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Note: This script requires you to be logged in as an admin user
console.log('Note: This script requires admin privileges to update collection visibility.');
console.log('The collection_order table has RLS policies that only allow admins to update it.\n');

// Collections to hide
const collectionsToHide = [
  'featured-products',
  'home-page',
  'lolcow-gaming',
  'shop-all'
];

async function hideCollections() {
  try {
    console.log('Starting to hide collections...\n');
    
    // First, check current status of these collections
    const { data: currentOrders, error: fetchError } = await supabase
      .from('collection_order')
      .select('*')
      .in('collection_handle', collectionsToHide);
    
    if (fetchError) {
      console.error('Error fetching collection orders:', fetchError);
      return;
    }
    
    console.log('Current status of collections:');
    currentOrders?.forEach(order => {
      console.log(`- ${order.collection_handle}: ${order.is_visible ? 'VISIBLE' : 'HIDDEN'}`);
    });
    
    // Update visibility to false for all matching collections
    const { data: updatedOrders, error: updateError } = await supabase
      .from('collection_order')
      .update({ is_visible: false })
      .in('collection_handle', collectionsToHide)
      .select();
    
    if (updateError) {
      console.error('Error updating collection visibility:', updateError);
      return;
    }
    
    console.log('\n✅ Successfully updated collections:');
    updatedOrders?.forEach(order => {
      console.log(`- ${order.collection_handle} is now HIDDEN`);
    });
    
    // Check if any collections were not found
    const foundHandles = new Set(updatedOrders?.map(o => o.collection_handle) || []);
    const notFound = collectionsToHide.filter(handle => !foundHandles.has(handle));
    
    if (notFound.length > 0) {
      console.log('\n⚠️  The following collections were not found in collection_order table:');
      notFound.forEach(handle => {
        console.log(`- ${handle}`);
      });
      console.log('\nThese collections may need to be initialized first through the admin interface.');
    }
    
    console.log('\n✨ Done! The collections have been hidden from the shop page.');
    console.log('You can unhide them anytime at /admin/collection-order');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

hideCollections();