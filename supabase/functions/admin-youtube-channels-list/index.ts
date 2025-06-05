import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@^2';
import { corsHeaders } from '../_shared/cors.ts';
import { ensureAdmin } from '../_shared/auth.ts';
import type { Database } from '../../../src/integrations/supabase/database.types.ts';

console.log(`Function "admin-youtube-channels-list" booting up...`);

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
    // Ensure the request is a GET or POST request (Supabase client uses POST)
    if (req.method !== 'GET' && req.method !== 'POST') {
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