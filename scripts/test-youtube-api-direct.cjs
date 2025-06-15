#!/usr/bin/env node

const API_KEY = 'AIzaSyDXWUdOgsZMacMshvvlGT6oscCkdrUngFY'; // From .env.secrets
const CHANNEL_ID = 'UCmxQ_3W5b9kSfpmROqGJ0rA'; // LolcowLive

async function testDirectAPI() {
  console.log('Testing YouTube API directly with key from .env.secrets...\n');
  
  // Test 1: Basic channel info
  console.log('Test 1: Getting channel info...');
  const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${CHANNEL_ID}&key=${API_KEY}`;
  
  try {
    const response = await fetch(channelUrl);
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Channel API Error:', JSON.stringify(data, null, 2));
    } else {
      console.log('Channel found:', data.items?.[0]?.snippet?.title || 'No channel');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  // Test 2: Search for recent videos (no filters)
  console.log('\n\nTest 2: Searching for recent videos...');
  const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
  searchUrl.searchParams.set('key', API_KEY);
  searchUrl.searchParams.set('channelId', CHANNEL_ID);
  searchUrl.searchParams.set('type', 'video');
  searchUrl.searchParams.set('part', 'snippet');
  searchUrl.searchParams.set('maxResults', '5');
  searchUrl.searchParams.set('order', 'date');
  
  try {
    const response = await fetch(searchUrl.toString());
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Search API Error:', JSON.stringify(data, null, 2));
    } else {
      console.log(`Found ${data.items?.length || 0} videos`);
      data.items?.forEach((item, i) => {
        console.log(`${i + 1}. ${item.snippet.title}`);
        console.log(`   Live status: ${item.snippet.liveBroadcastContent}`);
        console.log(`   Published: ${item.snippet.publishedAt}`);
      });
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  // Test 3: Search for upcoming live events
  console.log('\n\nTest 3: Searching for upcoming live events...');
  const upcomingUrl = new URL('https://www.googleapis.com/youtube/v3/search');
  upcomingUrl.searchParams.set('key', API_KEY);
  upcomingUrl.searchParams.set('channelId', CHANNEL_ID);
  upcomingUrl.searchParams.set('type', 'video');
  upcomingUrl.searchParams.set('eventType', 'upcoming');
  upcomingUrl.searchParams.set('part', 'snippet');
  upcomingUrl.searchParams.set('maxResults', '5');
  
  try {
    const response = await fetch(upcomingUrl.toString());
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Upcoming API Error:', JSON.stringify(data, null, 2));
    } else {
      console.log(`Found ${data.items?.length || 0} upcoming events`);
      data.items?.forEach((item, i) => {
        console.log(`${i + 1}. ${item.snippet.title}`);
      });
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  // Test 4: Search for live events
  console.log('\n\nTest 4: Searching for live events...');
  const liveUrl = new URL('https://www.googleapis.com/youtube/v3/search');
  liveUrl.searchParams.set('key', API_KEY);
  liveUrl.searchParams.set('channelId', CHANNEL_ID);
  liveUrl.searchParams.set('type', 'video');
  liveUrl.searchParams.set('eventType', 'live');
  liveUrl.searchParams.set('part', 'snippet');
  liveUrl.searchParams.set('maxResults', '5');
  
  try {
    const response = await fetch(liveUrl.toString());
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Live API Error:', JSON.stringify(data, null, 2));
    } else {
      console.log(`Found ${data.items?.length || 0} live events`);
      data.items?.forEach((item, i) => {
        console.log(`${i + 1}. ${item.snippet.title}`);
      });
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testDirectAPI().catch(console.error);