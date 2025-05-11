import "jsr:@supabase/functions-js/edge-runtime.d.ts"; // Added for Deno namespace
import { corsHeaders } from '../_shared/cors.ts';
import { ensureAdmin } from '../_shared/auth.ts';
import type { Database } from '../../../src/integrations/supabase/database.types.ts'; // Adjust path as needed

console.log(`Function "admin-youtube-channels-create" booting up...`);

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Ensure the user is an admin
  const { adminClient, errorResponse: authErrorResponse, user } = await ensureAdmin(req);
  if (authErrorResponse) {
    return authErrorResponse;
  }
  // Ensure adminClient is available (should be if authErrorResponse is null)
  if (!adminClient) {
    console.error('adminClient is null even after successful admin check');
    return new Response(JSON.stringify({ error: 'Internal server error: Admin client unavailable' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Ensure the request is a POST request
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse the request body
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { youtube_channel_id, channel_name, avatar_url, custom_display_name } = body;

    if (!youtube_channel_id || typeof youtube_channel_id !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing or invalid youtube_channel_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (channel_name && typeof channel_name !== 'string') {
        return new Response(JSON.stringify({ error: 'Invalid channel_name, must be a string if provided' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
    if (avatar_url && typeof avatar_url !== 'string') {
        return new Response(JSON.stringify({ error: 'Invalid avatar_url, must be a string if provided' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
    if (custom_display_name && typeof custom_display_name !== 'string') {
        return new Response(JSON.stringify({ error: 'Invalid custom_display_name, must be a string if provided' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    // TODO: Optionally, here you could make a call to the YouTube API
    // to fetch the actual channel_name and avatar_url if not provided or to verify the ID.
    // For now, we'll just insert what's given.

    const channelDataToInsert: Partial<Database['public']['Tables']['youtube_channels']['Insert']> = {
        youtube_channel_id: youtube_channel_id,
        channel_name: channel_name || null, // Use provided channel_name or null
        avatar_url: avatar_url || null,     // Use provided avatar_url or null
        custom_display_name: custom_display_name, // Will be null if not provided, which is fine
    };

    const { data, error } = await adminClient
      .from('youtube_channels')
      .insert(channelDataToInsert)
      .select()
      .single();

    if (error) {
      console.error('Error inserting YouTube channel:', error);
      // Check for unique constraint violation (e.g., duplicate youtube_channel_id)
      if (error.code === '23505') { // PostgreSQL unique violation error code
        return new Response(JSON.stringify({ error: 'YouTube channel ID already exists.', details: error.message }), {
            status: 409, // Conflict
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'Failed to add YouTube channel', details: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Admin ${user?.id} successfully added YouTube channel: ${data.id}`);
    return new Response(JSON.stringify(data), {
      status: 201, // Created
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Unexpected error in admin-youtube-channels-create:', err);
    return new Response(JSON.stringify({ error: err.message || 'An unexpected error occurred.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}); 