const axios = require('axios');

// Hardcode the values for testing
const SUPABASE_URL = 'https://dlmbqojnhjsecajxltzj.supabase.co';

async function testYouTubeAPI() {
  console.log('Testing YouTube API directly...\n');

  // Test the sync endpoint
  try {
    console.log('Calling get-schedule function...');
    const scheduleResponse = await axios.post(`${SUPABASE_URL}/functions/v1/get-schedule`, {
      includeRecent: true,
      daysAhead: 7,
      hoursBack: 240
    }, {
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbWJxb2puaGpzZWNhanhsdHpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY3ODA1ODMsImV4cCI6MjA1MjM1NjU4M30.0Qoie-Hdb8BxAckuQEZoVp3B_tETmX-OSDsfmS9QNUY'
      }
    });

    const scheduleData = scheduleResponse.data;
    console.log('Schedule response:', JSON.stringify(scheduleData, null, 2));

    if (scheduleData.liveStreams) {
      console.log(`\nTotal streams found: ${scheduleData.liveStreams.length}`);
      
      const liveStreams = scheduleData.liveStreams.filter(s => s.status === 'live');
      console.log(`Live streams: ${liveStreams.length}`);
      
      liveStreams.forEach(stream => {
        console.log(`- ${stream.title} (${stream.video_id})`);
      });
    }
  } catch (error) {
    console.error('Error calling get-schedule:', error);
  }
}

testYouTubeAPI().catch(console.error);