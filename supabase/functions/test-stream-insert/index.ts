import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseServiceRole = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Try to insert a test stream
    const testStream = {
      video_id: 'test-' + Date.now(),
      youtube_channel_id: 'e639e892-0ec6-40e4-b857-ee274d509369', // LolcowAussy
      title: 'Test Stream',
      scheduled_start_time_utc: new Date().toISOString(),
      status: 'upcoming',
      privacy_status: 'public',
      fetched_at: new Date().toISOString()
    }

    console.log('Attempting to insert test stream:', testStream)

    const { data, error } = await supabaseServiceRole
      .from('live_streams')
      .insert(testStream)
      .select()

    if (error) {
      console.error('Insert error:', error)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: error.message,
          details: error
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Test stream inserted successfully',
        data: data
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
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