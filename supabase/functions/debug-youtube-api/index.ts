import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get YouTube API key
    const youtubeApiKey = Deno.env.get('YOUTUBE_API_KEY')
    
    // Test if key exists
    if (!youtubeApiKey) {
      return new Response(
        JSON.stringify({ 
          error: 'YOUTUBE_API_KEY not found in environment',
          hasKey: false
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Test a simple API call
    const testChannelId = 'UChcQ2TIYiihd9B4H50eRVlQ' // LolcowAussy
    const url = new URL('https://www.googleapis.com/youtube/v3/search')
    url.searchParams.set('key', youtubeApiKey)
    url.searchParams.set('channelId', testChannelId)
    url.searchParams.set('type', 'video')
    url.searchParams.set('part', 'snippet')
    url.searchParams.set('maxResults', '5')
    url.searchParams.set('order', 'date')

    console.log('Testing YouTube API with channel:', testChannelId)
    console.log('API URL:', url.toString().replace(youtubeApiKey, 'REDACTED'))

    const response = await fetch(url.toString())
    const data = await response.json()

    if (!response.ok) {
      return new Response(
        JSON.stringify({ 
          error: 'YouTube API error',
          status: response.status,
          details: data,
          hasKey: true,
          keyLength: youtubeApiKey.length
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
        hasKey: true,
        keyLength: youtubeApiKey.length,
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