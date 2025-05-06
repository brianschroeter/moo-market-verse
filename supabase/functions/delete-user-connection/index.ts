import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log('Function "delete-user-connection" up and running!')

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { 
      user_id, 
      connection_id // This is the connection_id from discord_connections (e.g., YouTube Channel ID)
    } = await req.json()

    if (!user_id || !connection_id) {
      return new Response(JSON.stringify({ error: 'Missing required fields: user_id, connection_id' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // 1. Fetch the connection to determine its type, especially if it's a YouTube connection.
    // We need the type to decide if we also need to delete from youtube_connections.
    // It's also good practice to ensure the connection exists before attempting to delete.
    const { data: connectionToDelete, error: fetchError } = await supabaseAdmin
      .from('discord_connections')
      .select('connection_type, connection_id') // We only need connection_type, but connection_id is the primary key for the match
      .eq('user_id', user_id)
      .eq('connection_id', connection_id)
      .single()

    if (fetchError || !connectionToDelete) {
      console.warn('Error fetching connection or connection not found for deletion:', fetchError, user_id, connection_id);
      // If the connection doesn't exist, we can consider it a success (idempotency) or a specific error.
      // For now, let's return a 404 if it wasn't found.
      return new Response(JSON.stringify({ error: `Connection not found or error fetching it: ${fetchError?.message || 'Not found'}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: fetchError ? 500 : 404,
      })
    }

    // 2. Delete from discord_connections table
    const { error: discordDeleteError } = await supabaseAdmin
      .from('discord_connections')
      .delete()
      .eq('user_id', user_id)
      .eq('connection_id', connection_id)

    if (discordDeleteError) {
      console.error('Error deleting from discord_connections:', discordDeleteError)
      return new Response(JSON.stringify({ error: `Failed to delete from general connections: ${discordDeleteError.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }
    console.log('Successfully deleted from discord_connections for user:', user_id, 'connection:', connection_id);


    // 3. If it was a YouTube connection, also delete from youtube_connections
    if (connectionToDelete.connection_type && connectionToDelete.connection_type.toLowerCase() === 'youtube') {
      const { error: youtubeDeleteError } = await supabaseAdmin
        .from('youtube_connections')
        .delete()
        .eq('user_id', user_id)
        .eq('youtube_channel_id', connection_id) // connection_id from discord_connections is youtube_channel_id here

      if (youtubeDeleteError) {
        console.error('Error deleting from youtube_connections:', youtubeDeleteError)
        // IMPORTANT: The main discord_connections entry IS deleted at this point.
        // This indicates a partial failure.
        return new Response(JSON.stringify({ 
          error: `Failed to delete from YouTube connections: ${youtubeDeleteError.message}. The general connection entry was deleted, but the YouTube specific entry failed to delete.`,
          partial_success: true 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500, // Or 207 Multi-Status
        })
      }
      console.log('Successfully deleted from youtube_connections for user:', user_id, 'channel ID:', connection_id);
    }

    return new Response(JSON.stringify({ message: 'Connection deleted successfully from all relevant tables.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200, // 200 OK or 204 No Content if you prefer not to send a body on success
    })

  } catch (e) {
    console.error('Unhandled error in function:', e)
    return new Response(JSON.stringify({ error: e.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
}) 