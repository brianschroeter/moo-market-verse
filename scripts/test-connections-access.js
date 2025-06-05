import { createClient } from '@supabase/supabase-js';

// Use local Supabase instance with anon key (same as the app)
const supabaseUrl = 'http://127.0.0.1:54321';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(supabaseUrl, anonKey);

async function testConnectionsAccess() {
  console.log('Testing connections access with anon key...\n');

  // Test Discord connections
  console.log('1. Testing discord_connections:');
  const { data: discordConns, error: discordError } = await supabase
    .from('discord_connections')
    .select('*')
    .limit(5);

  if (discordError) {
    console.log('❌ Discord connections error:', discordError.message);
  } else {
    console.log('✅ Discord connections accessible:', discordConns?.length || 0, 'records');
  }

  // Test YouTube connections  
  console.log('\n2. Testing youtube_connections:');
  const { data: youtubeConns, error: youtubeError } = await supabase
    .from('youtube_connections')
    .select('*')
    .limit(5);

  if (youtubeError) {
    console.log('❌ YouTube connections error:', youtubeError.message);
  } else {
    console.log('✅ YouTube connections accessible:', youtubeConns?.length || 0, 'records');
  }

  // Test YouTube memberships
  console.log('\n3. Testing youtube_memberships:');
  const { data: youtubeMemberships, error: membershipError } = await supabase
    .from('youtube_memberships')
    .select('*')
    .limit(5);

  if (membershipError) {
    console.log('❌ YouTube memberships error:', membershipError.message);
  } else {
    console.log('✅ YouTube memberships accessible:', youtubeMemberships?.length || 0, 'records');
  }

  // Test Discord guilds
  console.log('\n4. Testing discord_guilds:');
  const { data: discordGuilds, error: guildsError } = await supabase
    .from('discord_guilds')
    .select('*')
    .limit(5);

  if (guildsError) {
    console.log('❌ Discord guilds error:', guildsError.message);
  } else {
    console.log('✅ Discord guilds accessible:', discordGuilds?.length || 0, 'records');
  }
}

testConnectionsAccess().catch(console.error);