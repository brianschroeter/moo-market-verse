import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from '../_shared/cors.ts';
import { ensureAdmin } from '../_shared/auth.ts';
import type { Database } from '../../../src/integrations/supabase/database.types.ts';

console.log(`Function "admin-youtube-channels-list" booting up...`);

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
    // Ensure the request is a GET request
    if (req.method !== 'GET') {
      return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data, error } = await adminClient
      .from('youtube_channels') // You'll need to regenerate types for this to be recognized
      .select('*') // Select all columns
      .order('created_at', { ascending: false }); // Optional: order by creation date

    if (error) {
      console.error('Error fetching YouTube channels:', error);
      return new Response(JSON.stringify({ error: 'Failed to fetch YouTube channels', details: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Admin ${user?.id} successfully fetched ${data?.length || 0} YouTube channels.`);
    return new Response(JSON.stringify(data || []),
        {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        }
    );

  } catch (err) {
    console.error('Unexpected error in admin-youtube-channels-list:', err);
    return new Response(JSON.stringify({ error: err.message || 'An unexpected error occurred.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}); 