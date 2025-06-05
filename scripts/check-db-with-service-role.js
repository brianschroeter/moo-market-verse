import { createClient } from '@supabase/supabase-js';

// Use local Supabase instance with service role key (bypasses RLS)
const supabaseUrl = 'http://127.0.0.1:54321';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkDataWithServiceRole() {
  console.log('Checking database with service role (bypasses RLS)...\n');

  const tables = [
    'profiles',
    'discord_connections',
    'discord_guilds', 
    'youtube_connections',
    'youtube_memberships',
    'user_roles',
    'user_devices'
  ];

  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`${table}: ERROR - ${error.message}`);
      } else {
        console.log(`${table}: ${count || 0} records`);
      }
    } catch (err) {
      console.log(`${table}: EXCEPTION - ${err.message}`);
    }
  }

  // Get a sample profile to see the data structure
  console.log('\nSample profile data:');
  const { data: sampleProfile, error } = await supabase
    .from('profiles')
    .select('*')
    .limit(1)
    .single();

  if (sampleProfile) {
    console.log(JSON.stringify(sampleProfile, null, 2));
  } else {
    console.log('No profile data found, error:', error?.message);
  }
}

checkDataWithServiceRole().catch(console.error);