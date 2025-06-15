#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function testYouTubeSync() {
  const supabaseUrl = process.env.VITE_PUBLIC_SUPABASE_URL || 'https://dlmbqojnhjsecajxltzj.supabase.co';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbWJxb2puaGpzZWNhanhsdHpqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjMxOTYxMiwiZXhwIjoyMDYxODk1NjEyfQ.MsdyJjaiBmZrU6WkogTk_qgfGSuo0iVuZitad9dh1PM';
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials in .env file');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    // First, let's check what YouTube channels we have
    console.log('Checking YouTube channels in database...\n');
    const { data: channels, error: channelsError } = await supabase
      .from('youtube_channels')
      .select('*');
      
    if (channelsError) {
      console.error('Error fetching channels:', channelsError);
      return;
    }
    
    console.log(`Found ${channels?.length || 0} channels:`);
    channels?.forEach(ch => {
      console.log(`- ${ch.channel_name} (${ch.youtube_channel_id})`);
    });
    
    // Check if we have any API keys
    console.log('\n\nChecking YouTube API keys...');
    const { data: apiKeys, error: keysError } = await supabase
      .from('youtube_api_keys')
      .select('id, name, status, last_used_at, consecutive_errors');
      
    if (keysError) {
      console.error('Error fetching API keys:', keysError);
    } else {
      console.log(`Found ${apiKeys?.length || 0} API keys:`);
      apiKeys?.forEach(key => {
        console.log(`- ${key.name}: ${key.status} (errors: ${key.consecutive_errors})`);
      });
    }
    
    // Try to call the sync function with a specific configuration
    console.log('\n\nCalling sync-youtube-streams edge function...');
    console.log('Config: forceRefresh=true, lookBackHours=72, maxResults=50');
    
    const { data, error } = await supabase.functions.invoke('sync-youtube-streams', {
      body: {
        forceRefresh: true,  // Skip cache
        lookBackHours: 72,   // Look back 3 days
        lookAheadHours: 48,  // Look ahead 2 days
        maxResults: 50       // Get more results
      }
    });
    
    if (error) {
      console.error('\nError calling sync function:', error);
      return;
    }
    
    console.log('\nSync response:', JSON.stringify(data, null, 2));
    
    // Check what's in the live_streams table now
    console.log('\n\nChecking live_streams table...');
    const { data: streams, error: streamsError } = await supabase
      .from('live_streams')
      .select('video_id, title, status, scheduled_start_time_utc, youtube_channel_id')
      .order('scheduled_start_time_utc', { ascending: false })
      .limit(10);
      
    if (streamsError) {
      console.error('Error fetching streams:', streamsError);
    } else {
      console.log(`Found ${streams?.length || 0} streams in database:`);
      streams?.forEach(stream => {
        console.log(`- ${stream.title} (${stream.status}) - ${stream.scheduled_start_time_utc || 'no schedule'}`);
      });
    }
    
    // Check recent API usage
    console.log('\n\nChecking recent API usage...');
    const { data: usage, error: usageError } = await supabase
      .from('youtube_api_usage')
      .select('*')
      .order('request_timestamp', { ascending: false })
      .limit(5);
      
    if (usageError) {
      console.error('Error fetching usage:', usageError);
    } else {
      console.log(`Recent API calls:`);
      usage?.forEach(u => {
        console.log(`- ${u.endpoint}: ${u.response_cached ? 'CACHED' : 'API'} - ${u.error_message || 'success'}`);
      });
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testYouTubeSync().catch(console.error);