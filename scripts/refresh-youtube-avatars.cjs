#!/usr/bin/env node

const https = require('https');
require('dotenv').config();

const SUPABASE_URL = process.env.VITE_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Error: Missing required environment variables');
  console.error('Please ensure VITE_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

const functionUrl = `${SUPABASE_URL}/functions/v1/refresh-youtube-avatars`;

async function refreshYouTubeAvatars(options = {}) {
  const { limit = 10, forceAll = false } = options;
  
  console.log(`Starting YouTube avatar refresh...`);
  console.log(`Options: limit=${limit}, forceAll=${forceAll}`);
  
  const url = new URL(functionUrl);
  url.searchParams.append('limit', limit.toString());
  if (forceAll) {
    url.searchParams.append('force_all', 'true');
  }
  
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      }
    };
    
    const req = https.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          
          if (res.statusCode === 200) {
            console.log('Avatar refresh completed successfully');
            console.log('Results:', JSON.stringify(response, null, 2));
            resolve(response);
          } else {
            console.error(`Error: ${res.statusCode} - ${response.error || response.message}`);
            reject(new Error(response.error || 'Avatar refresh failed'));
          }
        } catch (error) {
          console.error('Failed to parse response:', error);
          console.error('Raw response:', data);
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('Request failed:', error);
      reject(error);
    });
    
    req.end();
  });
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {};

for (let i = 0; i < args.length; i += 2) {
  const key = args[i].replace('--', '');
  const value = args[i + 1];
  
  if (key === 'limit') {
    options.limit = parseInt(value, 10);
  } else if (key === 'force-all') {
    options.forceAll = value === 'true';
  }
}

// Run the refresh
refreshYouTubeAvatars(options)
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });