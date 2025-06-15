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

    // Call the sync-youtube-streams function internally for FULL SYNC
    const syncResponse = await fetch(`${supabaseUrl}/functions/v1/sync-youtube-streams`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        lookBackHours: 240, // 10 days - ensure full week coverage
        lookAheadHours: 168, // 7 days forward
        maxResults: 50,
        forceRefresh: false // Don't force refresh in cron to save API quota
      })
    })

    const syncResult = await syncResponse.json()

    // Log the sync result
    console.log('YouTube sync cron result:', syncResult)

    // Also refresh stale avatars
    console.log('Refreshing stale YouTube channel avatars...')
    const avatarRefreshResponse = await fetch(`${supabaseUrl}/functions/v1/refresh-youtube-avatars?limit=10`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceRoleKey}`,
        'Content-Type': 'application/json',
      }
    })

    const avatarRefreshResult = await avatarRefreshResponse.json()
    console.log('Avatar refresh result:', avatarRefreshResult)

    // Store cron run history
    await supabase
      .from('cron_history')
      .insert({
        job_name: 'youtube-full-sync',
        run_at: new Date().toISOString(),
        success: syncResult.success || false,
        result: {
          sync: syncResult,
          avatarRefresh: avatarRefreshResult,
          syncType: 'full'
        },
        error: syncResult.error || null
      })

    return new Response(
      JSON.stringify({
        success: true,
        message: 'YouTube schedule sync and avatar refresh cron completed',
        syncResult,
        avatarRefreshResult
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Cron sync error:', error)
    
    // Try to log error to database
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
      const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)
      
      await supabase
        .from('cron_history')
        .insert({
          job_name: 'youtube-full-sync',
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