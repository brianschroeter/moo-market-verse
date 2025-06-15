import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@^2';
import { corsHeaders } from '../_shared/cors.ts';

console.log(`Function "refresh-youtube-avatars" booting up...`);

interface YouTubeChannelItem {
  id: string;
  snippet: {
    title: string;
    thumbnails: {
      default: { url: string };
      medium: { url: string };
      high: { url: string };
    };
  };
}

interface YouTubeChannelsAPIResponse {
  items: YouTubeChannelItem[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // This function can be called by cron or manually
    // Optional: accept a limit parameter to control batch size
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const forceAll = url.searchParams.get('force_all') === 'true';

    const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY');
    if (!YOUTUBE_API_KEY) {
      return new Response(JSON.stringify({ error: 'YouTube API key is not configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: 'Service role key is not configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    if (!supabaseUrl) {
      return new Response(JSON.stringify({ error: 'Supabase URL is not configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const supabaseAdminClient = createClient(supabaseUrl, SERVICE_ROLE_KEY);

    // Get channels that need avatar refresh
    let query = supabaseAdminClient
      .from('youtube_channels_needing_avatar_refresh')
      .select('*');

    if (!forceAll) {
      query = query.limit(limit);
    }

    const { data: channelsToRefresh, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching channels needing refresh:', fetchError);
      return new Response(JSON.stringify({ error: 'Failed to fetch channels', details: fetchError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    if (!channelsToRefresh || channelsToRefresh.length === 0) {
      return new Response(JSON.stringify({ 
        message: 'No channels need avatar refresh',
        refreshed: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    console.log(`Found ${channelsToRefresh.length} channels needing avatar refresh`);

    const results = {
      total: channelsToRefresh.length,
      succeeded: 0,
      failed: 0,
      errors: [] as any[]
    };

    // Process channels in batches to respect YouTube API limits
    const batchSize = 50; // YouTube API allows up to 50 channel IDs per request
    for (let i = 0; i < channelsToRefresh.length; i += batchSize) {
      const batch = channelsToRefresh.slice(i, i + batchSize);
      const channelIds = batch.map(ch => ch.youtube_channel_id).join(',');

      try {
        // Fetch channel details from YouTube API
        const youtubeUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelIds}&key=${YOUTUBE_API_KEY}`;
        const youtubeResponse = await fetch(youtubeUrl);

        if (!youtubeResponse.ok) {
          const errorData = await youtubeResponse.json();
          console.error('YouTube API Error:', errorData);
          results.failed += batch.length;
          results.errors.push({
            channelIds: batch.map(ch => ch.youtube_channel_id),
            error: 'YouTube API error',
            details: errorData
          });
          continue;
        }

        const youtubeData = await youtubeResponse.json() as YouTubeChannelsAPIResponse;

        // Update each channel with fresh data
        for (const channel of batch) {
          const youtubeChannel = youtubeData.items.find(item => item.id === channel.youtube_channel_id);

          if (youtubeChannel) {
            const newAvatarUrl = youtubeChannel.snippet.thumbnails?.high?.url || 
                                youtubeChannel.snippet.thumbnails?.medium?.url || 
                                youtubeChannel.snippet.thumbnails?.default?.url || null;

            const { error: updateError } = await supabaseAdminClient
              .from('youtube_channels')
              .update({
                channel_name: youtubeChannel.snippet.title,
                avatar_url: newAvatarUrl,
                avatar_last_fetched_at: new Date().toISOString(),
                avatar_fetch_error: null
              })
              .eq('id', channel.id);

            if (updateError) {
              console.error(`Failed to update channel ${channel.youtube_channel_id}:`, updateError);
              results.failed++;
              results.errors.push({
                channelId: channel.youtube_channel_id,
                error: 'Database update failed',
                details: updateError.message
              });
            } else {
              console.log(`Successfully updated avatar for channel ${channel.youtube_channel_id}`);
              results.succeeded++;
            }
          } else {
            // Channel not found in YouTube response
            const { error: updateError } = await supabaseAdminClient
              .from('youtube_channels')
              .update({
                avatar_last_fetched_at: new Date().toISOString(),
                avatar_fetch_error: 'Channel not found in YouTube API response'
              })
              .eq('id', channel.id);

            if (!updateError) {
              console.log(`Marked channel ${channel.youtube_channel_id} as not found`);
            }
            results.failed++;
            results.errors.push({
              channelId: channel.youtube_channel_id,
              error: 'Channel not found in YouTube API'
            });
          }
        }

        // Add a small delay between batches to avoid rate limiting
        if (i + batchSize < channelsToRefresh.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

      } catch (batchError) {
        console.error('Error processing batch:', batchError);
        results.failed += batch.length;
        results.errors.push({
          channelIds: batch.map(ch => ch.youtube_channel_id),
          error: 'Batch processing failed',
          details: batchError.message
        });
      }
    }

    return new Response(JSON.stringify({
      message: `Avatar refresh completed`,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Unexpected error in refresh-youtube-avatars:', error);
    return new Response(JSON.stringify({ error: error.message || 'An unexpected error occurred' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});