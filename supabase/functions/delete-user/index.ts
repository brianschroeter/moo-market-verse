// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4'
import { corsHeaders } from '../_shared/cors.ts'
import type { Database } from '../../../src/integrations/supabase/database.types.ts'

console.log(`Function "delete-user" booting up...`) // Log on boot

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Log incoming request
  console.log(`Received ${req.method} request for delete-user`);

  try {
    // Ensure the request is a POST request
    if (req.method !== 'POST') {
      console.warn(`Method Not Allowed: ${req.method}`)
      return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Ensure Authorization header is present
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
        console.warn('Authorization header missing')
        return new Response(JSON.stringify({ error: 'Authorization header missing' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }

    // Create Supabase client with the service role key for admin actions
    const supabaseAdmin = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Create a regular Supabase client to verify the caller's role using the request's Authorization header
    const supabaseClient = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // Get the calling user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      console.error('Auth error:', userError?.message || 'User not found')
      return new Response(JSON.stringify({ error: 'Authentication failed' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
     console.log(`Request received from user: ${user.id}`);

    // Check if the calling user has the 'admin' role
    console.log(`Checking admin role for user: ${user.id}`)
    const { data: isAdmin, error: roleError } = await supabaseClient.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin', // Use the enum value directly
    })

    if (roleError) {
      console.error(`Role check error for user ${user.id}:`, roleError.message)
      return new Response(JSON.stringify({ error: 'Failed to verify user role' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!isAdmin) {
       console.warn(`Forbidden attempt to delete user by non-admin: ${user.id}`)
      return new Response(JSON.stringify({ error: 'Forbidden: User is not an admin' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    console.log(`Admin role confirmed for user: ${user.id}`);


    // Parse the request body to get the target_user_id
     let target_user_id: string | undefined;
     try {
       const body = await req.json();
       target_user_id = body.target_user_id;
       console.log(`Parsed target_user_id: ${target_user_id}`);
     } catch (jsonError) {
        console.error('JSON parsing error:', jsonError.message)
        return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
     }

    if (!target_user_id || typeof target_user_id !== 'string') {
       console.warn(`Missing or invalid target_user_id in request body: ${target_user_id}`)
      return new Response(JSON.stringify({ error: 'Missing or invalid target_user_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

     // Prevent admin from deleting themselves
     if (target_user_id === user.id) {
      console.warn(`Admin ${user.id} attempted self-deletion.`)
      return new Response(JSON.stringify({ error: 'Admin cannot delete themselves' }), {
        status: 400, // Bad Request is appropriate here
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Perform the deletion using the admin client
    console.log(`Admin ${user.id} attempting to delete user ${target_user_id}...`)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(target_user_id)

    if (deleteError) {
      console.error(`Delete user error for ${target_user_id}:`, deleteError.message)
      // Check specifically for common error messages
      const lowerCaseError = deleteError.message.toLowerCase();
      const isNotFound = lowerCaseError.includes('not found') || lowerCaseError.includes('no user');
      const errorMessage = isNotFound ? 'User not found.' : 'Failed to delete user.';
      const statusCode = isNotFound ? 404 : 500; // Use 404 for not found, 500 otherwise

      return new Response(JSON.stringify({ error: errorMessage, details: deleteError.message }), {
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // If deletion is successful
    console.log(`User ${target_user_id} deleted successfully by admin ${user.id}.`)
    return new Response(JSON.stringify({ message: `User ${target_user_id} deleted successfully` }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    // Catch all unexpected errors
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Unexpected error in delete-user function:', errorMessage, error) // Log the full error
    return new Response(JSON.stringify({ error: 'Internal Server Error', details: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/delete-user' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
