import { createClient } from '@supabase/supabase-js';

// Use local Supabase instance
const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkData() {
  console.log('Checking local database data...\n');

  // Check profiles
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('count', { count: 'exact', head: true });
  
  console.log(`Profiles: ${profiles || 0} records`);

  // Check other tables
  const tables = [
    'discord_connections',
    'discord_guilds', 
    'youtube_connections',
    'youtube_memberships',
    'membership_changes',
    'featured_products',
    'announcements',
    'support_tickets',
    'shopify_orders',
    'printful_orders',
    'user_devices'
  ];

  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    
    console.log(`${table}: ${count || 0} records`);
  }

  // Get a sample profile
  const { data: sampleProfile } = await supabase
    .from('profiles')
    .select('*')
    .limit(1)
    .single();

  if (sampleProfile) {
    console.log('\nSample profile:', JSON.stringify(sampleProfile, null, 2));
  }
}

checkData().catch(console.error);