// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts' // Assuming a shared CORS setup

console.log('Newsletter Subscribe function initializing')

// Basic email validation regex (adjust as needed)
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Ensure POST request
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Parse request body
    let email: string | null = null;
    try {
      const body = await req.json()
      email = body.email
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    
    // Validate email
    if (!email || typeof email !== 'string' || !emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email address provided.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`Attempting to subscribe email: ${email}`); // Log the email being processed

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    console.log(`Supabase URL: ${supabaseUrl ? 'Loaded' : 'MISSING!'}`); 
    console.log(`Supabase Service Role Key: ${supabaseServiceRoleKey ? 'Loaded' : 'MISSING!'}`);

    if (!supabaseUrl || !supabaseServiceRoleKey) {
        throw new Error('Supabase environment variables (URL, Service Role Key) are required.')
    }

    // Initialize Supabase client (simplified - relying on service key in 2nd arg)
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    
    console.log('Supabase client initialized (simplified).'); // Log client init success

    // Insert into Supabase (simplified)
    console.log('Attempting Supabase insert...');
    const { error } = await supabase
      .from('newsletter_signups')
      .insert([{ email: email }])
      // .select() // Temporarily removed select()

    if (error) {
      console.error('Supabase insert error object:', JSON.stringify(error, null, 2)); // Try stringifying the error
      console.error('Supabase insert error code:', error.code);
      console.error('Supabase insert error message:', error.message);
      console.error('Supabase insert error details:', error.details);
      console.error('Supabase insert error hint:', error.hint);
      throw new Error('Failed to subscribe email due to database error.')
    }

    console.log('Supabase insert successful.');

    // Success
    return new Response(JSON.stringify({ message: 'Successfully subscribed!' }), {
      status: 201, // Created
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('Function error:', err)
    return new Response(JSON.stringify({ error: err.message || 'Internal Server Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/newsletter-subscribe' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
