import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log("delete-newsletter-signup function initializing.");

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log("Handling OPTIONS request");
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log("Processing DELETE request...");
    // Get the signup ID from the query parameters
    const url = new URL(req.url);
    const signupId = url.searchParams.get('id');

    if (!signupId) {
        console.error('Missing signup ID query parameter.')
        return new Response(
            JSON.stringify({ error: 'Signup ID is required as a query parameter.' }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400, // Bad Request
            }
        );
    }
    console.log(`Attempting to delete signup with ID: ${signupId}`);

    // Ensure environment variables are available
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
        console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.");
        throw new Error('Supabase environment variables are not set for the function.');
    }

    // Initialize Supabase client with the service role key
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    console.log("Supabase admin client initialized.");

    // Perform the delete operation
    const { error } = await supabaseAdmin
      .from('newsletter_signups')
      .delete()
      .eq('id', signupId);

    if (error) {
      console.error('Supabase delete error:', error);
      throw error; // Let the generic error handler catch it
    }

    console.log(`Successfully deleted signup with ID: ${signupId}`);
    return new Response(
      JSON.stringify({ message: 'Signup deleted successfully.' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (err) {
    console.error('Error in function:', err);
    // Return JSON error response
    return new Response(
        JSON.stringify({ error: err.message || 'Failed to delete signup' }),
        {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        }
    );
  }
}); 