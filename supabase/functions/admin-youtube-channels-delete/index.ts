import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from '../_shared/cors.ts';
import { ensureAdmin } from '../_shared/auth.ts';
import type { Database } from '../../../src/integrations/supabase/database.types.ts';

console.log(`Function "admin-youtube-channels-delete" booting up...`);

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
  if (!adminClient) {
    console.error('adminClient is null even after successful admin check');
    return new Response(JSON.stringify({ error: 'Internal server error: Admin client unavailable' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Using POST for delete to easily pass ID in the body, similar to delete-user example.
    // Alternatively, could use DELETE method and ID from URL path or query param.
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method Not Allowed, use POST' }), {
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

    const { id } = body;

    if (!id || typeof id !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing or invalid channel id in request body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { error } = await adminClient
      .from('youtube_channels') // Regenerate types for this table
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Error deleting YouTube channel ${id}:`, error);
      // PGRST204 (No Content) is typically returned on successful DELETE if no data is returned by Supabase,
      // or if .single()/.maybeSingle() isn't used and the row doesn't exist. Default .delete() behavior
      // doesn't error if the row isn't found, it just deletes 0 rows. So, we might not get a specific error code for "not found".
      // We could add a .select().single() before delete to confirm existence if strict 404 is needed.
      return new Response(JSON.stringify({ error: 'Failed to delete YouTube channel', details: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If error is null, the delete operation was accepted by Supabase.
    // It doesn't necessarily mean a row was deleted if it didn't exist, but the operation itself was successful.
    console.log(`Admin ${user?.id} successfully requested deletion for YouTube channel ID: ${id}`);
    return new Response(JSON.stringify({ message: `YouTube channel with id ${id} delete request processed.` }), {
      status: 200, // OK (or 204 No Content if nothing is returned in body)
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error(`Unexpected error in admin-youtube-channels-delete for ID ${req.json()?.id || 'unknown'}:`, err);
    return new Response(JSON.stringify({ error: err.message || 'An unexpected error occurred.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}); 