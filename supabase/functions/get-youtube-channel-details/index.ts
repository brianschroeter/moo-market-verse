import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { createYouTubeAPIService, YouTubeAPIService } from '../_shared/youtube-api.ts'

// Interfaces for YouTube API responses
interface YouTubeThumbnail {
  url: string;
  width: number;
  height: number;
}

interface YouTubeChannelSnippet {
  title: string;
  description: string;
  customUrl?: string;
  publishedAt: string;
  thumbnails: {
    default: YouTubeThumbnail;
    medium: YouTubeThumbnail;
    high: YouTubeThumbnail;
  };
  localized?: { // Optional as per typical use for snippet
    title: string;
    description: string;
  };
  country?: string;
}

interface YouTubeChannelItem {
  kind: string;
  etag: string;
  id: string; // This is the Channel ID
  snippet: YouTubeChannelSnippet;
}

interface YouTubeChannelsAPIResponse {
  kind: string;
  etag: string;
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
  items: YouTubeChannelItem[];
}

interface YouTubeSearchId {
  kind: string;
  channelId?: string;
  videoId?: string; // Not used here, but part of search result ID object
  playlistId?: string; // Not used here
}
interface YouTubeSearchSnippet {
    publishedAt: string;
    channelId: string;
    title: string;
    description: string;
    thumbnails: {
        default: YouTubeThumbnail;
        medium: YouTubeThumbnail;
        high: YouTubeThumbnail;
    };
    channelTitle: string;
    liveBroadcastContent: string;
    publishTime?: string; // publishTime might only be for videos
}

interface YouTubeSearchItem {
  kind: string;
  etag: string;
  id: YouTubeSearchId;
  snippet: YouTubeSearchSnippet; // Search results also have snippets
}

interface YouTubeSearchAPIResponse {
  kind: string;
  etag: string;
  nextPageToken?: string;
  regionCode?: string;
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
  items: YouTubeSearchItem[];
}

interface Membership {
  id: string;
  youtube_connection_id: string;
  creator_channel_id: string; 
  channel_name: string;
  membership_level: string;
  status: string;
  joined_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}


serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { identifier } = await req.json()
    if (!identifier || typeof identifier !== 'string' || identifier.trim() === '') {
      return new Response(JSON.stringify({ error: 'identifier is required and must be a non-empty string' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Create admin Supabase client first for the YouTube service
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!SERVICE_ROLE_KEY) {
        return new Response(JSON.stringify({ error: 'Service role key is not configured for Supabase client.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
    const supabaseAdminClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', SERVICE_ROLE_KEY);
    
    // Create YouTube API service with managed key system
    const youtubeService = createYouTubeAPIService(supabaseAdminClient);

    let resolvedChannelId: string | null = null;
    const channelIdPattern = /^UC[0-9A-Za-z_-]{22}$/;

    if (channelIdPattern.test(identifier)) {
      resolvedChannelId = identifier;
      console.log(`Identifier '${identifier}' matches Channel ID pattern.`);
    } else {
      console.log(`Identifier '${identifier}' does not match Channel ID pattern, attempting username search.`);
      const searchUrl = YouTubeAPIService.buildApiUrl('search', {
        part: 'id',
        q: identifier,
        type: 'channel',
        maxResults: '1'
      });
      try {
        const searchResponse = await youtubeService.makeRequest(searchUrl);
        if (!searchResponse.ok) {
          const errorData = await searchResponse.json();
          console.error('YouTube Search API Error:', errorData);
          await youtubeService.logApiUsage('search', [], 100, false, JSON.stringify(errorData));
          // Do not throw yet, channel might still be found by ID if it was a malformed ID mistaken for username
        } else {
          const searchData = await searchResponse.json() as YouTubeSearchAPIResponse;
          await youtubeService.logApiUsage('search', [], 100, true);
          if (searchData.items && searchData.items.length > 0 && searchData.items[0].id.channelId) {
            resolvedChannelId = searchData.items[0].id.channelId;
            console.log(`Username '${identifier}' resolved to Channel ID: ${resolvedChannelId}`);
          } else {
            console.log(`No channel found for username/handle: '${identifier}'`);
          }
        }
      } catch (searchFetchError) {
         console.error('Error fetching YouTube search results:', searchFetchError);
         await youtubeService.logApiUsage('search', [], 100, false, searchFetchError.message);
         // Allow to proceed, maybe the initial identifier was an ID after all but failed regex for some reason
      }
    }

    if (!resolvedChannelId) {
      return new Response(JSON.stringify({ error: `Could not resolve '${identifier}' to a YouTube Channel ID.` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404, // Not Found
      });
    }
    
    let channelTitle = null;
    let channelPfpUrl = null;
    let canonicalChannelId = resolvedChannelId; // Start with the initially resolved ID

    // Always fetch channel details using the resolvedChannelId for consistency
    const channelDetailsUrl = YouTubeAPIService.buildApiUrl('channels', {
      part: 'snippet',
      id: resolvedChannelId
    });
    try {
        const channelDetailsResponse = await youtubeService.makeRequest(channelDetailsUrl);
        if (!channelDetailsResponse.ok) {
            const errorData = await channelDetailsResponse.json();
            console.error('YouTube Channels API Error (fetching details for resolved ID):', errorData);
            await youtubeService.logApiUsage('channels', [resolvedChannelId], 1, false, JSON.stringify(errorData));
            // Fallback: canonicalChannelId remains the initially resolvedChannelId
        } else {
            const channelDetailsData = await channelDetailsResponse.json() as YouTubeChannelsAPIResponse;
            await youtubeService.logApiUsage('channels', [resolvedChannelId], 1, true);
            if (channelDetailsData.items && channelDetailsData.items.length > 0) {
                // --- Use the ID *from the response* as the canonical ID ---
                canonicalChannelId = channelDetailsData.items[0].id; 
                channelTitle = channelDetailsData.items[0].snippet.title;
                channelPfpUrl = channelDetailsData.items[0].snippet.thumbnails?.high?.url || 
                                channelDetailsData.items[0].snippet.thumbnails?.medium?.url || 
                                channelDetailsData.items[0].snippet.thumbnails?.default?.url || null;
                if (canonicalChannelId !== resolvedChannelId) {
                     console.log(`Initial resolved ID ${resolvedChannelId} confirmed/updated to canonical ID ${canonicalChannelId} by channels.list API.`);
                }
            } else {
                 console.warn(`channels.list returned ok but no items for ID: ${resolvedChannelId}`);
                 // Fallback: canonicalChannelId remains the initially resolvedChannelId
            }
        }
    } catch (channelFetchError) {
        console.error('Error fetching YouTube channel details for resolved ID:', channelFetchError);
        await youtubeService.logApiUsage('channels', [resolvedChannelId], 1, false, channelFetchError.message);
        // Fallback: canonicalChannelId remains the initially resolvedChannelId
    }

    // --- Use the canonicalChannelId (best effort) for the membership query ---
    console.log(`Querying memberships using canonicalChannelId: ${canonicalChannelId}`);

    // Update the avatar URL in the database if we fetched it successfully
    if (channelTitle && channelPfpUrl) {
      try {
        const { error: updateError } = await supabaseAdminClient
          .from('youtube_channels')
          .update({
            channel_name: channelTitle,
            avatar_url: channelPfpUrl,
            avatar_last_fetched_at: new Date().toISOString(),
            avatar_fetch_error: null
          })
          .eq('youtube_channel_id', canonicalChannelId);
        
        if (updateError) {
          console.error('Failed to update channel avatar in database:', updateError);
          // Don't fail the request, just log the error
        } else {
          console.log(`Updated avatar URL for channel ${canonicalChannelId}`);
        }
      } catch (updateException) {
        console.error('Exception updating channel avatar:', updateException);
        // Don't fail the request, just log the error
      }
    }

    const { data: memberships, error: dbError } = await supabaseAdminClient
      .from('youtube_memberships')
      .select('membership_level, channel_name')
      .eq('youtube_connection_id', canonicalChannelId); // <-- Use canonicalChannelId here

    if (dbError) {
      console.error('Supabase DB Error fetching memberships:', dbError);
      // Do not fail the whole request if memberships can't be fetched, but log it.
      // Return an empty array for memberships in this case.
    }

    // --- Return canonicalChannelId ---
    return new Response(JSON.stringify({ 
      id: canonicalChannelId, // Return the canonical ID
      name: channelTitle,
      pfpUrl: channelPfpUrl,
      memberships: memberships || []
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('General Error in get-youtube-channel-details function:', error);
    return new Response(JSON.stringify({ error: error.message || 'An unexpected error occurred.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})