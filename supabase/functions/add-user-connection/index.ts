import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log('Function "add-user-connection" up and running!')

serve(async (req) => {
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const {
      target_user_id,
      connection_type,
      connection_id,    // For YouTube, this is the YouTube Channel ID
      connection_name   // For YouTube, this is the YouTube Channel Name
    } = await req.json()

    if (!target_user_id || !connection_type || !connection_id || !connection_name) {
      return new Response(JSON.stringify({ error: 'Missing required fields: target_user_id, connection_type, connection_id, connection_name' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const connection_verified = true; // Manually added connections are considered verified

    // Insert into the general discord_connections table
    const { data: generalConnection, error: generalError } = await supabaseAdmin
      .from('discord_connections')
      .insert({
        user_id: target_user_id,
        connection_type: connection_type,
        connection_id: connection_id,       // Stores YouTube Channel ID if type is youtube
        connection_name: connection_name,   // Stores YouTube Channel Name if type is youtube
        connection_verified: connection_verified,
      })
      .select()
      .single()

    if (generalError) {
      console.error('Error inserting into discord_connections:', generalError)
      return new Response(JSON.stringify({ error: `Failed to insert into general connections: ${generalError.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    // If it's a YouTube connection, also insert into youtube_connections
    if (connection_type.toLowerCase() === 'youtube') {
      const { error: youtubeError } = await supabaseAdmin
        .from('youtube_connections') // Your specific YouTube connections table
        .insert({
          user_id: target_user_id,
          youtube_channel_id: connection_id,    // This is the actual YouTube Channel ID
          youtube_channel_name: connection_name,  // This is the YouTube Channel Name
          is_verified: true,                      // Set as verified since admin is adding it
          // youtube_avatar can be left to its default or null if not provided
        })
        // We might not need to .select().single() here unless the client needs specific data back from this table

      if (youtubeError) {
        console.error('Error inserting into youtube_connections:', youtubeError)
        // IMPORTANT: At this point, the general connection in discord_connections IS created.
        // You might want to implement a compensating transaction here to remove the generalConnection if this fails,
        // or handle this inconsistency through other means (e.g., a cleanup job or manual check).
        // For now, we return an error indicating partial success.
        return new Response(JSON.stringify({
          error: `Failed to insert into YouTube connections: ${youtubeError.message}. A general connection entry was made but the YouTube specific entry failed.`,
          partial_success_data: generalConnection
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500, // Or a different status code like 207 Multi-Status for partial success
        })
      }
      console.log('Successfully inserted into youtube_connections for user:', target_user_id, 'channel ID:', connection_id);
    }

    // Return the general connection data on full success
    return new Response(JSON.stringify({ connection: generalConnection }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201, // 201 Created
    })
  } catch (e) {
    console.error('Unhandled error in function:', e)
    return new Response(JSON.stringify({ error: e.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})