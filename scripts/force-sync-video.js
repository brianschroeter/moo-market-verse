#!/usr/bin/env node

/**
 * Force sync specific YouTube videos bypassing cache
 * Usage: node scripts/force-sync-video.js <video-id> [video-id2] [video-id3] ...
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function forceVideoSync(videoIds) {
  try {
    console.log(`🔄 Force syncing ${videoIds.length} video(s)...`);
    console.log('Video IDs:', videoIds.join(', '));

    const { data, error } = await supabase.functions.invoke('sync-youtube-streams', {
      body: {
        videoIds: videoIds,
        forceRefresh: true,
        skipCache: true
      }
    });

    if (error) {
      console.error('❌ Sync error:', error.message);
      return;
    }

    console.log('✅ Sync response:', JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log(`✅ Successfully synced ${data.totalSynced} video(s)`);
    } else {
      console.log('❌ Sync failed:', data.message);
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Get video IDs from command line arguments
const videoIds = process.argv.slice(2);

if (videoIds.length === 0) {
  console.log('Usage: node scripts/force-sync-video.js <video-id> [video-id2] [video-id3] ...');
  console.log('Example: node scripts/force-sync-video.js abc123 def456');
  process.exit(1);
}

forceVideoSync(videoIds);