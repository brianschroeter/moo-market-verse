import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log("get-newsletter-signups function initializing.");

// Define the expected structure of a signup
interface NewsletterSignup {
  id: string;
  email: string;
  created_at: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log("Handling OPTIONS request");
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log("Processing GET request...");
    // Ensure environment variables are available
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
        console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.");
        throw new Error('Supabase environment variables are not set for the function.');
    }

    // Initialize Supabase client with the service role key
    // Note: Auth options are typically not needed when using the service key
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    console.log("Supabase admin client initialized.");

    // Fetch newsletter signups
    const { data, error } = await supabaseAdmin
      .from('newsletter_signups')
      .select('id, email, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase query error:', error);
      throw error;
    }

    console.log(`Successfully fetched ${data?.length ?? 0} signups.`);
    // Ensure data is always an array, even if null from Supabase
    const responseData: NewsletterSignup[] = data || [];

    return new Response(
      JSON.stringify(responseData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (err) {
    console.error('Error in function:', err);
    // Return JSON error response
    return new Response(
        JSON.stringify({ error: err.message || 'Internal Server Error' }),
        {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        }
    );
  }
});

// Note: It might be helpful to create a _shared/cors.ts file:
/*
// supabase/functions/_shared/cors.ts
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Or restrict to your specific domain in production
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
*/ 