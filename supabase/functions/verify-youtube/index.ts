
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
    const { youtubeChannelId, youtubeChannelName, youtubeAvatar } = await req.json();

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

    // Get the user's profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
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

    // Create or update YouTube connection
    const { data: connection, error: connectionError } = await supabaseClient
      .from('youtube_connections')
      .upsert({
        user_id: user.id,
        youtube_channel_id: youtubeChannelId,
        youtube_channel_name: youtubeChannelName || "YouTube User", // Use provided name or default
        youtube_avatar: youtubeAvatar || null, // Store the avatar URL
        is_verified: false, // Set to false initially, will be verified through an admin process
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,youtube_channel_id',
        returning: 'minimal'
      });

    if (connectionError) {
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

    // In a real implementation, you would verify the YouTube channel ownership here
    // For now, we'll just return success
    return new Response(
      JSON.stringify({ 
        message: "YouTube connection saved. Verification pending.", 
        verified: false 
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
