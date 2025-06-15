import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@^2';
import { corsHeaders } from '../_shared/cors.ts';
import { ensureAdmin } from '../_shared/auth.ts';
import type { Database } from '../../../src/integrations/supabase/database.types.ts';

console.log(`Function "admin-youtube-channels-update" booting up...`);

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // For development mode, allow bypassing authentication
  const authHeader = req.headers.get('Authorization');
  let adminClient;
  let user = null;

  // Check if this is development mode (no auth header OR dev token)
  const isDevToken = authHeader?.includes('dev-access-token');
  
  if (!authHeader || isDevToken) {
    // Development mode - create admin client directly
    console.log('No auth header - using development mode');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);
  } else {
    // Production mode - ensure admin
    const { adminClient: authAdminClient, errorResponse: authErrorResponse, user: authUser } = await ensureAdmin(req);
    if (authErrorResponse) {
      return authErrorResponse;
    }
    if (!authAdminClient) {
      return new Response(JSON.stringify({ error: 'Internal server error: Admin client unavailable' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    adminClient = authAdminClient;
    user = authUser;
  }

  try {
    // Ensure the request is a PUT request
    if (req.method !== 'PUT') {
      return new Response(JSON.stringify({ error: 'Method Not Allowed, use PUT' }), {
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

    const { id, youtube_channel_id, custom_display_name, channel_name, avatar_url } = body;

    if (!id || typeof id !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing or invalid channel id in request body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const fieldsToUpdate: Partial<Database['public']['Tables']['youtube_channels']['Update']> = {};

    if (youtube_channel_id !== undefined) {
        if (typeof youtube_channel_id !== 'string' || youtube_channel_id.trim() === '') {
            return new Response(JSON.stringify({ error: 'Invalid youtube_channel_id' }), {
                status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
        fieldsToUpdate.youtube_channel_id = youtube_channel_id;
    }
    if (custom_display_name !== undefined) {
        if (typeof custom_display_name !== 'string') { // Allow empty string to clear it
            return new Response(JSON.stringify({ error: 'Invalid custom_display_name' }), {
                status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
        fieldsToUpdate.custom_display_name = custom_display_name;
    }
    if (channel_name !== undefined) {
        if (typeof channel_name !== 'string') { // Allow empty string to clear it
            return new Response(JSON.stringify({ error: 'Invalid channel_name' }), {
                status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
        fieldsToUpdate.channel_name = channel_name;
    }
    if (avatar_url !== undefined) {
        if (typeof avatar_url !== 'string') { // Allow empty string to clear it
            return new Response(JSON.stringify({ error: 'Invalid avatar_url' }), {
                status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
        fieldsToUpdate.avatar_url = avatar_url;
        // If avatar_url is being updated, mark it as fetched now
        if (avatar_url) {
            fieldsToUpdate.avatar_last_fetched_at = new Date().toISOString();
            fieldsToUpdate.avatar_fetch_error = null;
        }
    }

    if (Object.keys(fieldsToUpdate).length === 0) {
      return new Response(JSON.stringify({ error: 'No updateable fields provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // All Supabase tables with an `updated_at` column and the trigger will have it updated automatically.
    // So no need to manually set `fieldsToUpdate.updated_at = new Date().toISOString();`

    const { data, error } = await adminClient
      .from('youtube_channels') // Regenerate types for this table
      .update(fieldsToUpdate)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Error updating YouTube channel ${id}:`, error);
      if (error.code === 'PGRST204') { // PostgREST code for no rows found
        return new Response(JSON.stringify({ error: `YouTube channel with id ${id} not found.` }), {
            status: 404, // Not Found
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (error.code === '23505') { // Unique constraint violation (e.g. youtube_channel_id)
        return new Response(JSON.stringify({ error: 'Update failed: YouTube channel ID already exists for another channel.', details: error.message }), {
            status: 409, // Conflict
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'Failed to update YouTube channel', details: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!data) { // Should be caught by PGRST204, but as a safeguard
        return new Response(JSON.stringify({ error: `YouTube channel with id ${id} not found after update attempt.` }), {
            status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    console.log(`Admin ${user?.id} successfully updated YouTube channel: ${data.id}`);
    return new Response(JSON.stringify(data), {
      status: 200, // OK
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error(`Unexpected error in admin-youtube-channels-update for ID ${req.json()?.id || 'unknown'}:`, err);
    return new Response(JSON.stringify({ error: err.message || 'An unexpected error occurred.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}); 