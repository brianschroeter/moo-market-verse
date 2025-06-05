import { createClient } from '@supabase/supabase-js';

// Use local Supabase instance with anon key (same as the app)
const supabaseUrl = 'http://127.0.0.1:54321';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(supabaseUrl, anonKey);

async function checkAdminAccess() {
  console.log('Testing admin access with anon key (same as app)...\n');

  // Test if we can access profiles with anon key
  console.log('1. Testing profiles access:');
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .limit(5);

  if (profilesError) {
    console.log('❌ Profiles error:', profilesError.message);
  } else {
    console.log('✅ Profiles accessible:', profiles?.length || 0, 'records');
  }

  // Test the view used by AdminUsers
  console.log('\n2. Testing profiles_with_guild_info view:');
  const { data: profilesView, error: viewError } = await supabase
    .from('profiles_with_guild_info')
    .select('id, discord_username, discord_avatar, created_at, discord_id, guild_count')
    .limit(5);

  if (viewError) {
    console.log('❌ View error:', viewError.message);
  } else {
    console.log('✅ View accessible:', profilesView?.length || 0, 'records');
    if (profilesView && profilesView.length > 0) {
      console.log('Sample record:', JSON.stringify(profilesView[0], null, 2));
    }
  }

  // Test admin role check
  console.log('\n3. Testing admin role check:');
  const { data: isAdmin, error: roleError } = await supabase
    .rpc('has_role', { 
      _user_id: '00000000-0000-0000-0000-000000000001',
      _role: 'admin' 
    });

  if (roleError) {
    console.log('❌ Role check error:', roleError.message);
  } else {
    console.log('✅ Admin role result:', isAdmin);
  }
}

checkAdminAccess().catch(console.error);