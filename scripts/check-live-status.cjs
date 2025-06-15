const axios = require('axios');

// YouTube Data API endpoint
const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3/search';

// LolcowLive channel ID
const LOLCOW_LIVE_CHANNEL_ID = 'UCmxQ_3W5b9kSfpmROqGJ0rA';

async function checkLiveStatus() {
  // You mentioned the stream is live, let's check directly with YouTube API
  // Note: This requires a valid API key
  const API_KEY = process.env.YOUTUBE_API_KEY;
  
  if (!API_KEY) {
    console.log('No YouTube API key found in environment');
    console.log('\nTo check if LolcowLive is actually live, visit:');
    console.log(`https://www.youtube.com/channel/${LOLCOW_LIVE_CHANNEL_ID}/live`);
    return;
  }

  try {
    const response = await axios.get(YOUTUBE_API_URL, {
      params: {
        part: 'snippet',
        channelId: LOLCOW_LIVE_CHANNEL_ID,
        eventType: 'live',
        type: 'video',
        key: API_KEY
      }
    });

    console.log('YouTube API Response:');
    console.log(JSON.stringify(response.data, null, 2));

    if (response.data.items && response.data.items.length > 0) {
      console.log('\n✅ LolcowLive IS CURRENTLY LIVE!');
      response.data.items.forEach(item => {
        console.log(`- Title: ${item.snippet.title}`);
        console.log(`- Video ID: ${item.id.videoId}`);
        console.log(`- Published: ${item.snippet.publishedAt}`);
      });
    } else {
      console.log('\n❌ No live streams found for LolcowLive');
    }
  } catch (error) {
    console.error('Error checking YouTube:', error.message);
  }
}

// Also check our database
async function checkDatabase() {
  const SUPABASE_URL = 'https://dlmbqojnhjsecajxltzj.supabase.co';
  const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbWJxb2puaGpzZWNhanhsdHpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY3ODA1ODMsImV4cCI6MjA1MjM1NjU4M30.0Qoie-Hdb8BxAckuQEZoVp3B_tETmX-OSDsfmS9QNUY';

  try {
    console.log('\nChecking database for live streams...');
    
    // Get channel ID
    const channelResponse = await axios.get(`${SUPABASE_URL}/rest/v1/youtube_channels`, {
      params: {
        youtube_channel_id: `eq.${LOLCOW_LIVE_CHANNEL_ID}`
      },
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`
      }
    });

    if (channelResponse.data.length > 0) {
      const channelDbId = channelResponse.data[0].id;
      console.log(`LolcowLive DB ID: ${channelDbId}`);

      // Check for live streams
      const streamsResponse = await axios.get(`${SUPABASE_URL}/rest/v1/live_streams`, {
        params: {
          youtube_channel_id: `eq.${channelDbId}`,
          status: `eq.live`
        },
        headers: {
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${ANON_KEY}`
        }
      });

      console.log(`\nLive streams in database: ${streamsResponse.data.length}`);
      streamsResponse.data.forEach(stream => {
        console.log(`- ${stream.title} (${stream.video_id})`);
        console.log(`  Status: ${stream.status}`);
        console.log(`  Fetched: ${stream.fetched_at}`);
      });

      // Also check recent streams
      const recentResponse = await axios.get(`${SUPABASE_URL}/rest/v1/live_streams`, {
        params: {
          youtube_channel_id: `eq.${channelDbId}`,
          order: 'fetched_at.desc',
          limit: 5
        },
        headers: {
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${ANON_KEY}`
        }
      });

      console.log(`\nRecent streams for LolcowLive:`);
      recentResponse.data.forEach(stream => {
        console.log(`- ${stream.title || stream.video_id}`);
        console.log(`  Status: ${stream.status}`);
        console.log(`  Scheduled: ${stream.scheduled_start_time_utc}`);
        console.log(`  Actual Start: ${stream.actual_start_time_utc}`);
        console.log(`  Fetched: ${stream.fetched_at}`);
        console.log('');
      });
    }
  } catch (error) {
    console.error('Error checking database:', error.message);
  }
}

console.log('Checking if LolcowLive is actually live...\n');
checkLiveStatus().then(() => checkDatabase());