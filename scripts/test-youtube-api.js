#!/usr/bin/env node

require('dotenv').config();

async function testYouTubeAPI() {
  // Get the YouTube API key from Supabase secrets
  const { createClient } = require('@supabase/supabase-js');
  
  const supabaseUrl = process.env.VITE_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials in .env file');
    process.exit(1);
  }
  
  console.log('Testing YouTube API with real channel ID...\n');
  
  // Use a known active YouTube channel for testing
  const testChannelId = 'UCc1r7fWneTTONF-REy6H8Lw'; // LolCow Live
  
  // Test 1: Search for all recent videos (no eventType filter)
  console.log('Test 1: Searching for recent videos without eventType filter...');
  const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
  searchUrl.searchParams.set('key', process.env.YOUTUBE_API_KEY || 'YOUR_API_KEY_HERE');
  searchUrl.searchParams.set('channelId', testChannelId);
  searchUrl.searchParams.set('type', 'video');
  searchUrl.searchParams.set('part', 'snippet');
  searchUrl.searchParams.set('maxResults', '10');
  searchUrl.searchParams.set('order', 'date');
  
  try {
    const response = await fetch(searchUrl.toString());
    const data = await response.json();
    
    if (!response.ok) {
      console.error('API Error:', data.error);
      return;
    }
    
    console.log(`Found ${data.items?.length || 0} videos`);
    if (data.items && data.items.length > 0) {
      console.log('\nFirst few videos:');
      data.items.slice(0, 3).forEach((item, i) => {
        console.log(`${i + 1}. ${item.snippet.title}`);
        console.log(`   Published: ${item.snippet.publishedAt}`);
        console.log(`   Live Broadcast: ${item.snippet.liveBroadcastContent}`);
      });
    }
  } catch (error) {
    console.error('Error:', error);
  }
  
  // Test 2: Search for upcoming live events
  console.log('\n\nTest 2: Searching for upcoming live events...');
  const upcomingUrl = new URL('https://www.googleapis.com/youtube/v3/search');
  upcomingUrl.searchParams.set('key', process.env.YOUTUBE_API_KEY || 'YOUR_API_KEY_HERE');
  upcomingUrl.searchParams.set('channelId', testChannelId);
  upcomingUrl.searchParams.set('type', 'video');
  upcomingUrl.searchParams.set('eventType', 'upcoming');
  upcomingUrl.searchParams.set('part', 'snippet');
  upcomingUrl.searchParams.set('maxResults', '10');
  
  try {
    const response = await fetch(upcomingUrl.toString());
    const data = await response.json();
    
    if (!response.ok) {
      console.error('API Error:', data.error);
      return;
    }
    
    console.log(`Found ${data.items?.length || 0} upcoming events`);
    if (data.items && data.items.length > 0) {
      data.items.forEach((item, i) => {
        console.log(`${i + 1}. ${item.snippet.title}`);
      });
    }
  } catch (error) {
    console.error('Error:', error);
  }
  
  // Test 3: Search for live events
  console.log('\n\nTest 3: Searching for live events...');
  const liveUrl = new URL('https://www.googleapis.com/youtube/v3/search');
  liveUrl.searchParams.set('key', process.env.YOUTUBE_API_KEY || 'YOUR_API_KEY_HERE');
  liveUrl.searchParams.set('channelId', testChannelId);
  liveUrl.searchParams.set('type', 'video');
  liveUrl.searchParams.set('eventType', 'live');
  liveUrl.searchParams.set('part', 'snippet');
  liveUrl.searchParams.set('maxResults', '10');
  
  try {
    const response = await fetch(liveUrl.toString());
    const data = await response.json();
    
    if (!response.ok) {
      console.error('API Error:', data.error);
      return;
    }
    
    console.log(`Found ${data.items?.length || 0} live events`);
    if (data.items && data.items.length > 0) {
      data.items.forEach((item, i) => {
        console.log(`${i + 1}. ${item.snippet.title}`);
      });
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testYouTubeAPI().catch(console.error);