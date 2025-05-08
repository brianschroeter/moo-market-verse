import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface YouTubeChannelSnippet {
  title: string;
  description: string;
  customUrl?: string;
  publishedAt: string;
  thumbnails: {
    default: { url: string; width: number; height: number };
    medium: { url: string; width: number; height: number };
    high: { url: string; width: number; height: number };
  };
  localized: {
    title: string;
    description: string;
  };
  country?: string;
}

interface YouTubeChannelItem {
  kind: string;
  etag: string;
  id: string;
  snippet: YouTubeChannelSnippet;
}

interface YouTubeAPIResponse {
  kind: string;
  etag: string;
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
  items: YouTubeChannelItem[];
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
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { youtubeChannelId } = await req.json()
    if (!youtubeChannelId) {
      return new Response(JSON.stringify({ error: 'youtubeChannelId is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY')
    if (!YOUTUBE_API_KEY) {
        return new Response(JSON.stringify({ error: 'YouTube API key is not configured' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }

    const youtubeApiUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${youtubeChannelId}&key=${YOUTUBE_API_KEY}`;
    
    let channelTitle = null;
    let channelPfpUrl = null;

    const youtubeResponse = await fetch(youtubeApiUrl);
    if (!youtubeResponse.ok) {
      const errorData = await youtubeResponse.json();
      console.error('YouTube API Error:', errorData);
      // Don't fail entirely, maybe the channel exists in our DB but API failed
      // Or, the ID is invalid and it won't be in our DB either.
      // We will proceed to check our DB for memberships.
    } else {
      const youtubeData = await youtubeResponse.json() as YouTubeAPIResponse;
      if (youtubeData.items && youtubeData.items.length > 0) {
        channelTitle = youtubeData.items[0].snippet.title;
        channelPfpUrl = youtubeData.items[0].snippet.thumbnails?.default?.url || null;
      }
    }

    // Create a Supabase client with the Auth context of the logged in user.
    const supabaseClient = createClient(
      // Supabase API URL - env var exported by default.
      Deno.env.get('SUPABASE_URL') ?? '',
      // Supabase API ANON KEY - env var exported by default.
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      // Create client with Auth context of the user that called the function.
      // This way RLS policies are applied.
      // { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
      // For this function, we use the service role key to bypass RLS if needed,
      // or ensure your RLS allows reading from youtube_memberships.
      // If you want to use the user's context, uncomment the above and ensure the function is called with Authorization header.
      // For admin-like functions, service_role key is often safer if RLS isn't set up for this specific query by users.
    );
    
    // For admin tasks, it's often better to use the service role key to query internal tables.
    // Ensure this key is set in your Supabase project's environment variables.
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!SERVICE_ROLE_KEY) {
        return new Response(JSON.stringify({ error: 'Service role key is not configured for Supabase client.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }

    const supabaseAdminClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        SERVICE_ROLE_KEY
    );

    const { data: memberships, error: dbError } = await supabaseAdminClient
      .from('youtube_memberships')
      .select('membership_level, channel_name') // Only select what's needed
      .eq('youtube_connection_id', youtubeChannelId); // Assuming this is the column linking to the channel ID

    if (dbError) {
      console.error('Supabase DB Error:', dbError);
      return new Response(JSON.stringify({ error: 'Failed to query memberships', details: dbError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    return new Response(JSON.stringify({ 
      name: channelTitle, 
      pfpUrl: channelPfpUrl,
      memberships: memberships || [] // Ensure memberships is always an array
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('General Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
}) 