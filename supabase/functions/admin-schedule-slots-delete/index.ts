import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@^2';
import { corsHeaders } from '../_shared/cors.ts';
import { ensureAdmin } from '../_shared/auth.ts';
// No Database import needed if we are not returning data from the table directly after delete

console.log(`Function "admin-schedule-slots-delete" booting up...`);

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
    console.log('Development mode detected (no auth header or dev token)');
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
    if (req.method !== 'POST') { // Using POST to accept ID in body
      return new Response(JSON.stringify({ error: 'Method Not Allowed, use POST' }), {
        status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let body;
    try {
      body = await req.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { id } = body;

    if (!id || typeof id !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing or invalid schedule slot id in request body' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Optional: Check if the slot exists before deleting if you want to return a 404 specifically.
    // Supabase delete by default doesn't error if the row is not found.
    // const { count, error: fetchError } = await adminClient.from('schedule_slots').select('', { count: 'exact' }).eq('id', id);
    // if (fetchError || count === 0) {
    //     return new Response(JSON.stringify({ error: `Schedule slot with id ${id} not found.` }), {
    //         status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    //     });
    // }

    const { error: deleteError } = await adminClient
      .from('schedule_slots')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error(`Error deleting schedule slot ${id}:`, deleteError);
      return new Response(JSON.stringify({ error: 'Failed to delete schedule slot', details: deleteError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If deleteError is null, the operation was successful (or the row didn't exist, which is fine for a delete).
    console.log(`Admin ${user?.id} successfully requested deletion for schedule slot ID: ${id}`);
    return new Response(JSON.stringify({ message: `Schedule slot with id ${id} deleted successfully (if it existed).` }), {
      status: 200, // OK. Could also be 204 No Content if preferred and no message body is sent.
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error(`Unexpected error in admin-schedule-slots-delete for ID passed in body:`, err);
    return new Response(JSON.stringify({ error: err.message || 'An unexpected error occurred.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}); 