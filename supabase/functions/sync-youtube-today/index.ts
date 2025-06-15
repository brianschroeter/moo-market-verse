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

    console.log('Starting today\'s schedule sync...')

    // Get today's date range in UTC
    const now = new Date()
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)
    
    // Also include early morning streams for tomorrow (up to 6 AM)
    const tomorrowEarlyEnd = new Date(todayEnd.getTime() + 6 * 60 * 60 * 1000)

    // Get all channels to sync today's schedule (removing is_active filter as column doesn't exist)
    const { data: channels, error: channelsError } = await supabase
      .from('youtube_channels')
      .select('*')

    if (channelsError) {
      throw new Error(`Failed to fetch channels: ${channelsError.message}`)
    }

    if (!channels || channels.length === 0) {
      console.log('No channels to sync')
      
      await supabase
        .from('cron_history')
        .insert({
          job_name: 'youtube-today-sync',
          run_at: new Date().toISOString(),
          success: true,
          result: {
            message: 'No active channels',
            count: 0
          }
        })

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No active channels to sync',
          synced: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Syncing today's schedule for ${channels.length} channels`)

    // Call sync-youtube-streams with today's parameters
    const syncResponse = await fetch(`${supabaseUrl}/functions/v1/sync-youtube-streams`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channelIds: channels.map(c => c.youtube_channel_id),
        dateRangeStart: todayStart.toISOString(),
        dateRangeEnd: tomorrowEarlyEnd.toISOString(),
        lookBackHours: 24, // Include streams from yesterday that might still be relevant
        lookAheadHours: 30, // Today + early tomorrow
        maxResults: 50,
        forceRefresh: true, // Always get fresh data for today's schedule
        skipCache: true, // Bypass cache for real-time updates
        focusToday: true // Optimize for today's content
      })
    })

    const syncResult = await syncResponse.json()

    // Get count of today's streams after sync
    const { count: todayStreamCount } = await supabase
      .from('live_streams')
      .select('*', { count: 'exact', head: true })
      .gte('scheduled_start_time_utc', todayStart.toISOString())
      .lt('scheduled_start_time_utc', todayEnd.toISOString())

    // Log the sync result
    console.log('Today\'s schedule sync result:', {
      ...syncResult,
      todayStreamCount
    })

    // Store cron run history
    await supabase
      .from('cron_history')
      .insert({
        job_name: 'youtube-today-sync',
        run_at: new Date().toISOString(),
        success: syncResult.success || false,
        result: {
          channelsChecked: channels.length,
          todayStreamCount,
          syncResult: syncResult
        },
        error: syncResult.error || null
      })

    return new Response(
      JSON.stringify({
        success: true,
        message: `Today's schedule sync completed`,
        channelsChecked: channels.length,
        todayStreamCount,
        syncResult
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Today sync error:', error)
    
    // Try to log error to database
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
      const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)
      
      await supabase
        .from('cron_history')
        .insert({
          job_name: 'youtube-today-sync',
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