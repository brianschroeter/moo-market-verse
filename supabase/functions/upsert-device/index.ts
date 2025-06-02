// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log(`Function "upsert-device" up and running!`)

serve(async (req: Request) => {
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Ensure the request is authenticated
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Create Supabase client with the user's auth token
    const supabaseClient = createClient(
      // Supabase API URL - env var recommended for production
      Deno.env.get('SUPABASE_URL') ?? '',
      // Supabase ANON KEY - env var recommended for production
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      // Create client with Auth context of the user that called the function.
      // This way your row-level-security (RLS) policies are applied.
      { global: { headers: { Authorization: authHeader } } }
    )

    // Get user data from the authentication context
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      console.error('User error:', userError)
      throw new Error('User not found or error fetching user')
    }
    const userId = user.id

    // Get fingerprint and userAgent from the request body
    const { fingerprint, userAgent } = await req.json()
    if (!fingerprint) {
      throw new Error('Missing fingerprint in request body')
    }

    // Extract client IP address from request headers
    // Check various headers in order of preference
    const getClientIP = (request: Request): string | null => {
      // Vercel/Cloudflare headers
      const xForwardedFor = request.headers.get('x-forwarded-for');
      if (xForwardedFor) {
        // x-forwarded-for can be a comma-separated list, take the first (original client)
        return xForwardedFor.split(',')[0].trim();
      }
      
      // Alternative headers
      return request.headers.get('x-real-ip') || 
             request.headers.get('cf-connecting-ip') || 
             request.headers.get('x-client-ip') ||
             null;
    };

    const clientIP = getClientIP(req);
    console.log('Client IP detected:', clientIP);

    // Prepare data for upsert using original schema
    const deviceData = {
      user_id: userId,
      fingerprint: fingerprint,
      user_agent: userAgent, // Can be null/undefined
      ip_address: clientIP, // Add IP address
      last_seen_at: new Date().toISOString(), // Update last seen time
    }

    // Upsert the device information
    // If a row with the same user_id and fingerprint exists, update last_seen_at and user_agent
    // Otherwise, insert a new row
    const { data, error } = await supabaseClient
      .from('user_devices')
      .upsert(deviceData, {
        onConflict: 'user_id, fingerprint', // Specify conflict columns
        // Note: updated_at is handled by the trigger, created_at defaults on insert
      })
      .select() // Optionally return the upserted record
      .single() // Expecting a single record back

    if (error) {
      console.error('Supabase upsert error:', error)
      throw error
    }

    console.log('Device upserted successfully for user:', userId, 'Device ID:', data?.id)

    return new Response(JSON.stringify({ success: true, device: data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error in upsert-device function:', error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500, // Use 500 for server-side errors
    })
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/upsert-device' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
