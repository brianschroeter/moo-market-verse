
// Follow this setup guide to integrate the Deno runtime into your application:
// https://deno.com/manual/getting_started/javascript_and_typescript

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create a Supabase client with the Auth context of the logged in user
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the authenticated user
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      return new Response(
        JSON.stringify({ error: "Not authenticated" }),
        { 
          status: 401, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      );
    }

    // Get the request body
    const requestData = await req.json();
    const { youtubeChannelId, youtubeChannelName, refreshAvatar } = requestData;

    if (!youtubeChannelId) {
      return new Response(
        JSON.stringify({ error: "YouTube channel ID is required" }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      );
    }

    // Get user's profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error("Profile not found", profileError);
      return new Response(
        JSON.stringify({ error: "Profile not found", details: profileError }),
        { 
          status: 404, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      );
    }

    // Fetch YouTube channel data using the YouTube Data API
    const youtubeApiKey = Deno.env.get("YOUTUBE_API_KEY");
    let youtubeAvatar = null;
    let fetchedChannelName = null;

    if (!youtubeApiKey) {
      console.error("YouTube API key not found in environment variables");
      return new Response(
        JSON.stringify({ error: "YouTube API key not configured" }),
        { 
          status: 500, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      );
    }

    try {
      console.log(`Fetching YouTube data for channel ID: ${youtubeChannelId}`);
      
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${youtubeChannelId}&key=${youtubeApiKey}`
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`YouTube API Error: ${errorText}`);
        throw new Error(`YouTube API returned ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      console.log("YouTube API response:", JSON.stringify(data));
      
      if (data.items && data.items.length > 0) {
        const channelData = data.items[0];
        
        // Get the highest resolution thumbnail available
        const thumbnails = channelData.snippet.thumbnails;
        youtubeAvatar = thumbnails.high?.url || thumbnails.medium?.url || thumbnails.default?.url;
        
        // Use the channel title if no name was provided
        fetchedChannelName = channelData.snippet.title;
        
        console.log(`Found YouTube channel: ${fetchedChannelName}`);
        console.log(`Avatar URL: ${youtubeAvatar}`);
      } else {
        console.error("No channel found with the provided ID");
        return new Response(
          JSON.stringify({ error: "No YouTube channel found with the provided ID" }),
          { 
            status: 404, 
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            } 
          }
        );
      }
    } catch (apiError) {
      console.error("Error fetching YouTube data:", apiError);
      return new Response(
        JSON.stringify({ error: `Error fetching YouTube data: ${apiError.message}` }),
        { 
          status: 500, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      );
    }

    // If this is just a refresh avatar request, update the existing connection
    if (refreshAvatar) {
      const { data: existingConnection, error: connectionError } = await supabaseClient
        .from('youtube_connections')
        .select('*')
        .eq('user_id', user.id)
        .eq('youtube_channel_id', youtubeChannelId)
        .single();

      if (connectionError) {
        console.error("Error finding existing YouTube connection:", connectionError);
        return new Response(
          JSON.stringify({ error: "Failed to find YouTube connection", details: connectionError }),
          { 
            status: 500, 
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            } 
          }
        );
      }

      if (existingConnection) {
        // Update the existing connection with the new avatar
        const { data: updatedConnection, error: updateError } = await supabaseClient
          .from('youtube_connections')
          .update({
            youtube_avatar: youtubeAvatar,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingConnection.id)
          .select()
          .single();

        if (updateError) {
          console.error("Error updating YouTube connection:", updateError);
          return new Response(
            JSON.stringify({ error: "Failed to update YouTube avatar", details: updateError }),
            { 
              status: 500, 
              headers: { 
                'Content-Type': 'application/json',
                ...corsHeaders
              } 
            }
          );
        }

        return new Response(
          JSON.stringify({ 
            message: "YouTube avatar refreshed successfully", 
            success: true,
            avatar: youtubeAvatar,
            connection: updatedConnection
          }),
          { 
            status: 200, 
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            } 
          }
        );
      }
    }

    // Create or update YouTube connection with the fetched data
    const { data: connection, error: connectionError } = await supabaseClient
      .from('youtube_connections')
      .upsert({
        user_id: user.id,
        youtube_channel_id: youtubeChannelId,
        youtube_channel_name: youtubeChannelName || fetchedChannelName,
        youtube_avatar: youtubeAvatar,
        is_verified: false, // Set to false initially, will be verified through an admin process
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,youtube_channel_id',
        returning: 'representation'
      });

    if (connectionError) {
      console.error("Error saving YouTube connection:", connectionError);
      return new Response(
        JSON.stringify({ error: "Failed to save YouTube connection", details: connectionError }),
        { 
          status: 500, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      );
    }
    
    return new Response(
      JSON.stringify({ 
        message: "YouTube connection saved. Verification pending.", 
        verified: false,
        avatar: youtubeAvatar,
        channelName: fetchedChannelName,
        connection: connection
      }),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        } 
      }
    );
  } catch (error) {
    console.error("Error in verify-youtube function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        } 
      }
    );
  }
});
