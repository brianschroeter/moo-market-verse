import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkYouTubeSync() {
  console.log('Checking YouTube sync status...\n');

  // Check YouTube channels
  const { data: channels, error: channelsError } = await supabase
    .from('youtube_channels')
    .select('*');

  if (channelsError) {
    console.error('Error fetching channels:', channelsError);
    return;
  }

  console.log(`Found ${channels.length} YouTube channels:`);
  channels.forEach(channel => {
    console.log(`- ${channel.channel_name} (${channel.youtube_channel_id})`);
  });

  // Check API keys
  const { data: apiKeys, error: apiKeysError } = await supabase
    .from('youtube_api_keys')
    .select('id, name, last_used_at, quota_exceeded, requests_today');

  if (apiKeysError) {
    console.error('Error fetching API keys:', apiKeysError);
  } else {
    console.log(`\nAPI Keys (${apiKeys.length}):`);
    apiKeys.forEach(key => {
      console.log(`- ${key.name}: requests_today=${key.requests_today}, quota_exceeded=${key.quota_exceeded}, last_used=${key.last_used_at}`);
    });
  }

  // Check recent streams
  const { data: recentStreams, error: streamsError } = await supabase
    .from('live_streams')
    .select('video_id, title, status, scheduled_start_time_utc, actual_start_time_utc, youtube_channel_id, fetched_at')
    .order('fetched_at', { ascending: false })
    .limit(10);

  if (streamsError) {
    console.error('Error fetching streams:', streamsError);
  } else {
    console.log(`\nMost recent streams (${recentStreams.length}):`);
    recentStreams.forEach(stream => {
      console.log(`- ${stream.title || stream.video_id}: status=${stream.status}, scheduled=${stream.scheduled_start_time_utc}, fetched=${stream.fetched_at}`);
    });
  }

  // Check live streams specifically
  const { data: liveStreams, error: liveError } = await supabase
    .from('live_streams')
    .select('video_id, title, status, youtube_channel_id')
    .eq('status', 'live');

  if (liveError) {
    console.error('Error fetching live streams:', liveError);
  } else {
    console.log(`\nCurrently live streams: ${liveStreams.length}`);
    liveStreams.forEach(stream => {
      console.log(`- ${stream.title || stream.video_id} (${stream.youtube_channel_id})`);
    });
  }

  // Check API usage logs
  const { data: apiLogs, error: logsError } = await supabase
    .from('youtube_api_usage')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (logsError) {
    console.error('Error fetching API logs:', logsError);
  } else {
    console.log(`\nRecent API usage:`);
    apiLogs.forEach(log => {
      console.log(`- ${log.created_at}: ${log.endpoint} - quota_used=${log.quota_used}, success=${log.success}, error=${log.error_message || 'none'}`);
    });
  }

  // Check sync cache
  const { data: cache, error: cacheError } = await supabase
    .from('youtube_sync_cache')
    .select('cache_key, created_at, expires_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (cacheError) {
    console.error('Error fetching cache:', cacheError);
  } else {
    console.log(`\nRecent cache entries:`);
    cache.forEach(entry => {
      console.log(`- ${entry.cache_key}: created=${entry.created_at}, expires=${entry.expires_at}`);
    });
  }
}

checkYouTubeSync().catch(console.error);