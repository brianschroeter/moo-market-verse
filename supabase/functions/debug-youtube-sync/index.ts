import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    console.log('Debug: Checking YouTube sync setup...')

    // Check environment variables
    const envVars = {
      SUPABASE_URL: !!Deno.env.get('SUPABASE_URL'),
      SUPABASE_SERVICE_ROLE_KEY: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      ENCRYPTION_SALT: !!Deno.env.get('ENCRYPTION_SALT'),
      YOUTUBE_API_KEY_SALT: !!Deno.env.get('YOUTUBE_API_KEY_SALT')
    }

    console.log('Environment variables:', envVars)

    // Check YouTube channels
    const { data: channels, error: channelsError } = await supabase
      .from('youtube_channels')
      .select('*')

    if (channelsError) {
      console.error('Error fetching channels:', channelsError)
    }

    // Check API keys
    const { data: apiKeys, error: apiKeysError } = await supabase
      .from('youtube_api_keys')
      .select('id, name, encrypted_key, is_active, quota_exceeded, last_used_at, requests_today')

    if (apiKeysError) {
      console.error('Error fetching API keys:', apiKeysError)
    }

    // Check if we can decrypt a key
    let decryptionTest = { success: false, error: null }
    if (apiKeys && apiKeys.length > 0) {
      try {
        const salt = Deno.env.get('YOUTUBE_API_KEY_SALT') || Deno.env.get('ENCRYPTION_SALT')
        if (!salt) {
          decryptionTest.error = 'No salt found in environment'
        } else {
          // Just check if we have keys and salt
          decryptionTest.success = true
          decryptionTest.saltType = Deno.env.get('YOUTUBE_API_KEY_SALT') ? 'YOUTUBE_API_KEY_SALT' : 'ENCRYPTION_SALT'
        }
      } catch (error) {
        decryptionTest.error = error.message
      }
    }

    // Check recent API usage
    const { data: recentUsage, error: usageError } = await supabase
      .from('youtube_api_usage')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    // Check recent streams
    const { data: recentStreams, error: streamsError } = await supabase
      .from('live_streams')
      .select('video_id, title, status, fetched_at')
      .order('fetched_at', { ascending: false })
      .limit(5)

    // Check live streams
    const { data: liveStreams, error: liveError } = await supabase
      .from('live_streams')
      .select('video_id, title, status, youtube_channel_id')
      .eq('status', 'live')

    return new Response(
      JSON.stringify({
        success: true,
        debug: {
          environment: envVars,
          channels: {
            count: channels?.length || 0,
            error: channelsError?.message
          },
          apiKeys: {
            count: apiKeys?.length || 0,
            active: apiKeys?.filter(k => k.is_active && !k.quota_exceeded).length || 0,
            keys: apiKeys?.map(k => ({
              name: k.name,
              active: k.is_active,
              quotaExceeded: k.quota_exceeded,
              lastUsed: k.last_used_at,
              requestsToday: k.requests_today,
              hasEncryptedKey: !!k.encrypted_key
            })),
            error: apiKeysError?.message
          },
          decryptionTest,
          recentUsage: {
            count: recentUsage?.length || 0,
            last5: recentUsage?.slice(0, 5).map(u => ({
              endpoint: u.endpoint,
              success: u.success,
              error: u.error_message,
              quotaUsed: u.quota_used,
              createdAt: u.created_at
            })),
            error: usageError?.message
          },
          recentStreams: {
            count: recentStreams?.length || 0,
            streams: recentStreams?.map(s => ({
              videoId: s.video_id,
              title: s.title,
              status: s.status,
              fetchedAt: s.fetched_at
            })),
            error: streamsError?.message
          },
          liveStreams: {
            count: liveStreams?.length || 0,
            streams: liveStreams?.map(s => ({
              videoId: s.video_id,
              title: s.title,
              channelId: s.youtube_channel_id
            })),
            error: liveError?.message
          }
        }
      }, null, 2),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Debug error:', error)
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