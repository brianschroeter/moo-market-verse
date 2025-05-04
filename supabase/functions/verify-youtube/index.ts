// Follow this setup guide to integrate the Deno runtime into your application:
// https://deno.com/manual/getting_started/javascript_and_typescript

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
  'Access-Control-Max-Age': '86400', // 24 hours
};

serve(async (req) => {
  console.log("Received request to verify-youtube function");
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log("Handling CORS preflight request");
    return new Response(null, { 
      status: 204, 
      headers: corsHeaders 
    });
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

    // Log request headers for debugging
    console.log("Request headers:", Object.fromEntries(req.headers.entries()));

    // Get the authenticated user
    const {
      data: { user },
      error: userError
    } = await supabaseClient.auth.getUser();

    if (userError) {
      console.error("Error getting user:", userError);
      return new Response(
        JSON.stringify({ error: "Authentication error", details: userError }),
        { 
          status: 401, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      );
    }

    if (!user) {
      console.error("No authenticated user found");
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

    console.log("Authenticated user ID:", user.id);

    // Get the request body
    let requestData;
    try {
      requestData = await req.json();
      console.log("Request data:", JSON.stringify(requestData));
    } catch (jsonError) {
      console.error("Failed to parse request JSON:", jsonError);
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      );
    }
    
    const { youtubeChannelId, youtubeChannelName, refreshAvatar } = requestData;

    if (!youtubeChannelId) {
      console.error("Missing youtubeChannelId in request");
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

    if (profileError) {
      console.error("Profile not found:", profileError);
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

    if (!profile) {
      console.error("Profile is null for user:", user.id);
      return new Response(
        JSON.stringify({ error: "User profile not found" }),
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
        JSON.stringify({ 
          error: "YouTube API key not configured",
          message: "The server is missing the YouTube API key configuration."
        }),
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
      
      // Construct YouTube API URL
      const youtubeApiUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${youtubeChannelId}&key=${youtubeApiKey}`;
      console.log("YouTube API URL (without key):", youtubeApiUrl.replace(youtubeApiKey, "API_KEY_HIDDEN"));
      
      const response = await fetch(youtubeApiUrl);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`YouTube API Error: Status ${response.status}, ${errorText}`);
        throw new Error(`YouTube API returned ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      console.log("YouTube API response items length:", data.items?.length);
      
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
          JSON.stringify({ 
            error: "No YouTube channel found with the provided ID",
            channelId: youtubeChannelId
          }),
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
      console.log("Processing avatar refresh request for channel ID:", youtubeChannelId);

      const { data: existingConnection, error: connectionError } = await supabaseClient
        .from('youtube_connections')
        .select('*')
        .eq('user_id', user.id)
        .eq('youtube_channel_id', youtubeChannelId)
        .single();

      console.log("Existing connection fetch result - data:", JSON.stringify(existingConnection));
      console.log("Existing connection fetch result - error:", JSON.stringify(connectionError));

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

      if (!existingConnection) {
        console.error("No existing connection found for this channel ID and user");
        return new Response(
          JSON.stringify({ 
            error: "YouTube connection not found", 
            message: "No connection exists for this YouTube channel ID and user"
          }),
          { 
            status: 404, 
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            } 
          }
        );
      }

      console.log("Found existing connection with ID:", existingConnection.id);
      console.log("Avatar URL fetched from YouTube API:", youtubeAvatar);

      // Prepare update payload
      const updatePayload = {
        youtube_avatar: youtubeAvatar,
        updated_at: new Date().toISOString()
      };
      console.log("Update payload for youtube_connections:", JSON.stringify(updatePayload));

      // Update the existing connection with the new avatar
      const { data: updatedConnection, error: updateError } = await supabaseClient
        .from('youtube_connections')
        .update(updatePayload)
        .eq('id', existingConnection.id)
        .select()
        .single();
      
      console.log("Update operation result - data:", JSON.stringify(updatedConnection));
      console.log("Update operation result - error:", JSON.stringify(updateError));

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

      console.log("Connection updated successfully");

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

    // Create or update YouTube connection with the fetched data
    const upsertPayload = {
      user_id: user.id,
      youtube_channel_id: youtubeChannelId,
      youtube_channel_name: youtubeChannelName || fetchedChannelName,
      youtube_avatar: youtubeAvatar,
      is_verified: false, // Set to false initially, will be verified through an admin process
      updated_at: new Date().toISOString()
    };
    console.log("Upsert payload for youtube_connections:", JSON.stringify(upsertPayload));

    const { data: connection, error: connectionErrorUpsert } = await supabaseClient
      .from('youtube_connections')
      .upsert(upsertPayload, {
        onConflict: 'user_id,youtube_channel_id',
        returning: 'representation'
      });

    if (connectionErrorUpsert) {
      console.error("Error saving YouTube connection:", connectionErrorUpsert);
      return new Response(
        JSON.stringify({ error: "Failed to save YouTube connection", details: connectionErrorUpsert }),
        { 
          status: 500, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      );
    }
    
    console.log("YouTube connection created/updated successfully");
    console.log("Upsert operation result - data:", JSON.stringify(connection));
    console.log("Upsert operation result - error:", JSON.stringify(connectionErrorUpsert));

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
      JSON.stringify({ 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }),
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
