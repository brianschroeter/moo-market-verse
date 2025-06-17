import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { createYouTubeAPIService, YouTubeAPIService } from '../_shared/youtube-api.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)
    
    // Create YouTube API service
    const youtubeService = createYouTubeAPIService(supabase)
    
    // Get an API key from the managed system
    let apiKey
    try {
      apiKey = await youtubeService.getApiKey()
    } catch (error) {
      return new Response(
        JSON.stringify({ 
          error: 'Failed to get YouTube API key',
          details: error.message,
          hasKey: false
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Test a simple API call
    const testChannelId = 'UChcQ2TIYiihd9B4H50eRVlQ' // LolcowAussy
    const url = YouTubeAPIService.buildApiUrl('search', {
      channelId: testChannelId,
      type: 'video',
      part: 'snippet',
      maxResults: '5',
      order: 'date'
    })

    console.log('Testing YouTube API with channel:', testChannelId)
    console.log('Using API key ID:', apiKey.id)
    console.log('API URL:', url)

    const response = await youtubeService.makeRequest(url)
    const data = await response.json()

    if (!response.ok) {
      // Log the failed API call
      await youtubeService.logApiUsage('search', [testChannelId], 100, false, JSON.stringify(data))
      
      return new Response(
        JSON.stringify({ 
          error: 'YouTube API error',
          status: response.status,
          details: data,
          hasKey: true,
          keyId: apiKey.id,
          keyType: apiKey.id === 'env-key' ? 'environment' : 'managed'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
    // Log successful API usage
    await youtubeService.logApiUsage('search', [testChannelId], 100, true)

    return new Response(
      JSON.stringify({ 
        success: true,
        hasKey: true,
        keyId: apiKey.id,
        keyType: apiKey.id === 'env-key' ? 'environment' : 'managed',
        videoCount: data.items?.length || 0,
        videos: data.items?.map((v: any) => ({
          id: v.id.videoId,
          title: v.snippet.title,
          publishedAt: v.snippet.publishedAt
        })) || []
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Debug error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})