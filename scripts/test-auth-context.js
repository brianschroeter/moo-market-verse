import { createClient } from '@supabase/supabase-js';

// Use local Supabase instance with anon key (same as the app)
const supabaseUrl = 'http://127.0.0.1:54321';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(supabaseUrl, anonKey);

async function testAuthContext() {
  console.log('Testing auth context for admin access...\n');

  // Test current session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  console.log('Current session:', session ? 'EXISTS' : 'NULL');
  if (sessionError) console.log('Session error:', sessionError.message);

  // Manually set a session for the dev user to simulate logged-in state
  console.log('\nSetting dev user session...');
  const { data: signInData, error: signInError } = await supabase.auth.setSession({
    access_token: 'dev-access-token',
    refresh_token: 'dev-refresh-token'
  });

  if (signInError) {
    console.log('❌ Session set error:', signInError.message);
  }

  // Try using the service role to see the data that should be visible
  console.log('\nChecking what admin should see (using service role):');
  const serviceRoleClient = createClient(supabaseUrl, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU');
  
  const { data: discordConns } = await serviceRoleClient
    .from('discord_connections')
    .select('user_id, connection_name')
    .limit(3);
    
  console.log('Discord connections (first 3):', discordConns);

  const { data: youtubeConns } = await serviceRoleClient
    .from('youtube_connections')
    .select('user_id, youtube_channel_name')
    .limit(3);
    
  console.log('YouTube connections (first 3):', youtubeConns);
}

testAuthContext().catch(console.error);