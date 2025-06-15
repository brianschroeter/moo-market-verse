import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    console.log('Starting lightweight active streams sync...')

    // Get currently live streams and streams starting soon
    const now = new Date()
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000)
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000)

    // Query for active/upcoming streams
    const { data: activeStreams, error: streamsError } = await supabase
      .from('live_streams')
      .select(`
        video_id,
        youtube_channel_id,
        status,
        scheduled_start_time_utc,
        actual_start_time_utc,
        youtube_channels!inner(
          id,
          youtube_channel_id,
          channel_name
        )
      `)
      .or(`status.eq.live,and(scheduled_start_time_utc.gte.${now.toISOString()},scheduled_start_time_utc.lte.${oneHourFromNow.toISOString()}),and(actual_start_time_utc.gte.${twoHoursAgo.toISOString()},status.neq.ended)`)

    if (streamsError) {
      throw new Error(`Failed to fetch active streams: ${streamsError.message}`)
    }

    if (!activeStreams || activeStreams.length === 0) {
      console.log('No active or upcoming streams to sync')
      
      // Log to cron history
      await supabase
        .from('cron_history')
        .insert({
          job_name: 'youtube-active-sync',
          run_at: new Date().toISOString(),
          success: true,
          result: {
            message: 'No active or upcoming streams',
            count: 0
          }
        })

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No active or upcoming streams to sync',
          synced: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${activeStreams.length} active/upcoming streams to check`)

    // Group video IDs for batch processing
    const videoIds = activeStreams.map(s => s.video_id).filter(Boolean)
    
    // Call sync-youtube-streams with specific video IDs
    const syncResponse = await fetch(`${supabaseUrl}/functions/v1/sync-youtube-streams`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        videoIds: videoIds,
        lookBackHours: 2,
        lookAheadHours: 1,
        maxResults: 50,
        forceRefresh: true, // Always get fresh data for active streams
        skipCache: true // Bypass cache for real-time updates
      })
    })

    const syncResult = await syncResponse.json()

    // Log the sync result
    console.log('Active streams sync result:', syncResult)

    // Store cron run history
    await supabase
      .from('cron_history')
      .insert({
        job_name: 'youtube-active-sync',
        run_at: new Date().toISOString(),
        success: syncResult.success || false,
        result: {
          streamsChecked: activeStreams.length,
          syncResult: syncResult
        },
        error: syncResult.error || null
      })

    return new Response(
      JSON.stringify({
        success: true,
        message: `Active streams sync completed`,
        streamsChecked: activeStreams.length,
        syncResult
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Active sync error:', error)
    
    // Try to log error to database
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
      const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)
      
      await supabase
        .from('cron_history')
        .insert({
          job_name: 'youtube-active-sync',
          run_at: new Date().toISOString(),
          success: false,
          error: error.message
        })
    } catch (logError) {
      console.error('Failed to log cron error:', logError)
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})