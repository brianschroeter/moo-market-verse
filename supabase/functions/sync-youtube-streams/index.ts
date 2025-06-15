import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface YouTubeAPIResponse {
  items: YouTubeVideo[]
  nextPageToken?: string
  pageInfo: {
    totalResults: number
    resultsPerPage: number
  }
}

interface YouTubeVideo {
  id: {
    kind: string
    videoId: string
  }
  snippet: {
    publishedAt: string
    channelId: string
    title: string
    description: string
    thumbnails: {
      high: { url: string }
      default: { url: string }
    }
    channelTitle: string
    liveBroadcastContent: string
  }
  liveStreamingDetails?: {
    scheduledStartTime?: string
    actualStartTime?: string
    actualEndTime?: string
    concurrentViewers?: string
  }
}

interface SyncConfig {
  channelIds?: string[]
  lookAheadHours?: number
  lookBackHours?: number
  forceRefresh?: boolean
  maxResults?: number
}

interface CacheEntry {
  cache_key: string
  response_data: any
  expires_at: string
  fetched_at: string
}

interface ScheduleSlot {
  id: string
  youtube_channel_id: string
  day_of_week: number[] | null
  default_start_time_utc: string | null
  specific_date: string | null
  is_recurring: boolean
  fallback_title: string | null
}

interface LiveStream {
  video_id: string
  youtube_channel_id: string
  title: string | null
  thumbnail_url: string | null
  stream_url: string | null
  scheduled_start_time_utc: string | null
  actual_start_time_utc: string | null
  actual_end_time_utc: string | null
  status: string | null
  description: string | null
  view_count: number | null
  privacy_status: string
  fetched_at: string
  matched_slot_id: string | null
  scheduled_vs_actual_diff: string | null
}

class YouTubeAPIService {
  private supabase
  private currentApiKey: string | null = null
  private currentApiKeyId: string | null = null

  constructor(supabaseClient: any) {
    this.supabase = supabaseClient
  }

  async getApiKey(): Promise<{ id: string; key: string }> {
    // Try to get the next available API key
    const { data, error } = await this.supabase
      .rpc('get_next_youtube_api_key')

    if (error || !data || data.length === 0) {
      // Fallback to environment variable if no keys in database
      const envKey = Deno.env.get('YOUTUBE_API_KEY')
      if (!envKey) {
        throw new Error('No YouTube API keys available')
      }
      return { id: 'env-key', key: envKey }
    }

    const keyData = data[0]
    
    // Decrypt the API key
    const decryptedKey = this.decryptApiKey(keyData.api_key_encrypted)
    
    this.currentApiKey = decryptedKey
    this.currentApiKeyId = keyData.id
    return { id: keyData.id, key: decryptedKey }
  }

  private decryptApiKey(encrypted: string): string {
    try {
      const salt = Deno.env.get('ENCRYPTION_SALT') || 'default-salt'
      const decrypted = atob(encrypted)
      const parts = decrypted.split(':')
      if (parts.length === 3 && parts[0] === salt && parts[2] === salt) {
        return parts[1]
      }
      return encrypted // Return as-is if format doesn't match
    } catch {
      return encrypted // Return as-is if decryption fails
    }
  }

  async markKeyAsQuotaExceeded(keyId: string, error: string): Promise<void> {
    if (keyId === 'env-key') return // Skip if using env key
    
    await this.supabase.rpc('mark_youtube_api_key_quota_exceeded', {
      key_id: keyId,
      error_message: error
    })
  }

  async logApiUsage(keyId: string, endpoint: string, channelIds: string[], unitsUsed: number, success: boolean, error?: string): Promise<void> {
    if (keyId === 'env-key') return // Skip logging for env key

    await this.supabase
      .from('youtube_api_key_usage_log')
      .insert({
        api_key_id: keyId,
        endpoint,
        channel_ids: channelIds,
        units_used: unitsUsed,
        response_cached: false,
        success,
        error_message: error || null
      })
  }

  async getCachedResponse(cacheKey: string): Promise<CacheEntry | null> {
    const { data, error } = await this.supabase
      .from('youtube_api_cache')
      .select('*')
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (error) {
      console.log('Cache miss for key:', cacheKey)
      return null
    }

    console.log('Cache hit for key:', cacheKey)
    return data
  }

  async setCachedResponse(cacheKey: string, endpoint: string, data: any, ttlMinutes: number = 15, channelId?: string): Promise<void> {
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString()

    await this.supabase
      .from('youtube_api_cache')
      .upsert({
        cache_key: cacheKey,
        endpoint,
        response_data: data,
        expires_at: expiresAt,
        channel_id: channelId,
        fetched_at: new Date().toISOString()
      })
  }

  async trackAPIUsage(endpoint: string, unitsUsed: number, channelIds: string[], cached: boolean, error?: string): Promise<void> {
    // This is for the old tracking table, keeping for backward compatibility
    await this.supabase
      .from('youtube_api_usage')
      .insert({
        endpoint,
        units_used: unitsUsed,
        channel_ids: channelIds,
        response_cached: cached,
        quota_exceeded: error?.includes('quota') || false,
        error_message: error || null,
        request_timestamp: new Date().toISOString()
      })
  }

  async searchUpcomingLiveStreams(channelId: string, maxResults: number = 10): Promise<YouTubeVideo[]> {
    const cacheKey = `upcoming_${channelId}_${maxResults}`
    
    // Check cache first
    const cached = await this.getCachedResponse(cacheKey)
    if (cached && !cached.response_data.error) {
      await this.trackAPIUsage('search', 0, [channelId], true)
      return cached.response_data.items || []
    }

    // Get API key
    const apiKeyInfo = await this.getApiKey()

    // Make API request
    const url = new URL('https://www.googleapis.com/youtube/v3/search')
    url.searchParams.set('key', apiKeyInfo.key)
    url.searchParams.set('channelId', channelId)
    url.searchParams.set('type', 'video')
    url.searchParams.set('eventType', 'upcoming')
    url.searchParams.set('part', 'snippet')
    url.searchParams.set('maxResults', maxResults.toString())
    url.searchParams.set('order', 'date')

    try {
      console.log('Fetching upcoming streams for channel:', channelId)
      const response = await fetch(url.toString())
      const data: YouTubeAPIResponse = await response.json()

      if (!response.ok) {
        const errorMessage = `YouTube API error: ${data.error?.message || response.statusText}`
        
        // Check if it's a quota error
        if (response.status === 403 && data.error?.message?.includes('quota')) {
          await this.markKeyAsQuotaExceeded(apiKeyInfo.id, errorMessage)
          // Try with a different key
          const newKeyInfo = await this.getApiKey()
          if (newKeyInfo.id !== apiKeyInfo.id) {
            url.searchParams.set('key', newKeyInfo.key)
            const retryResponse = await fetch(url.toString())
            const retryData: YouTubeAPIResponse = await retryResponse.json()
            if (retryResponse.ok) {
              await this.setCachedResponse(cacheKey, 'search', retryData, 15, channelId)
              await this.logApiUsage(newKeyInfo.id, 'search', [channelId], 100, true)
              return retryData.items || []
            }
          }
        }
        
        throw new Error(errorMessage)
      }

      // Cache the response
      await this.setCachedResponse(cacheKey, 'search', data, 15, channelId)
      await this.trackAPIUsage('search', 100, [channelId], false)
      await this.logApiUsage(apiKeyInfo.id, 'search', [channelId], 100, true)

      return data.items || []
    } catch (error) {
      console.error('Error fetching upcoming streams:', error)
      await this.trackAPIUsage('search', 100, [channelId], false, error.message)
      await this.logApiUsage(apiKeyInfo.id, 'search', [channelId], 100, false, error.message)
      return []
    }
  }

  async searchRecentVideos(channelId: string, hoursBack: number = 24, maxResults: number = 10): Promise<YouTubeVideo[]> {
    const cacheKey = `recent_${channelId}_${hoursBack}_${maxResults}`
    
    // Check cache first
    const cached = await this.getCachedResponse(cacheKey)
    if (cached && !cached.response_data.error) {
      await this.trackAPIUsage('search', 0, [channelId], true)
      return cached.response_data.items || []
    }

    // Get API key
    const apiKeyInfo = await this.getApiKey()

    // Calculate publishedAfter timestamp
    const publishedAfter = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString()

    const url = new URL('https://www.googleapis.com/youtube/v3/search')
    url.searchParams.set('key', apiKeyInfo.key)
    url.searchParams.set('channelId', channelId)
    url.searchParams.set('type', 'video')
    url.searchParams.set('part', 'snippet')
    url.searchParams.set('maxResults', maxResults.toString())
    url.searchParams.set('order', 'date')
    url.searchParams.set('publishedAfter', publishedAfter)

    try {
      console.log('Fetching recent videos for channel:', channelId, 'since:', publishedAfter)
      const response = await fetch(url.toString())
      const data: YouTubeAPIResponse = await response.json()

      if (!response.ok) {
        const errorMessage = `YouTube API error: ${data.error?.message || response.statusText}`
        
        // Check if it's a quota error
        if (response.status === 403 && data.error?.message?.includes('quota')) {
          await this.markKeyAsQuotaExceeded(apiKeyInfo.id, errorMessage)
          // Try with a different key
          const newKeyInfo = await this.getApiKey()
          if (newKeyInfo.id !== apiKeyInfo.id) {
            url.searchParams.set('key', newKeyInfo.key)
            const retryResponse = await fetch(url.toString())
            const retryData: YouTubeAPIResponse = await retryResponse.json()
            if (retryResponse.ok) {
              await this.setCachedResponse(cacheKey, 'search', retryData, 60, channelId)
              await this.logApiUsage(newKeyInfo.id, 'search', [channelId], 100, true)
              return retryData.items || []
            }
          }
        }
        
        throw new Error(errorMessage)
      }

      // Cache for longer since recent videos don't change as often
      await this.setCachedResponse(cacheKey, 'search', data, 60, channelId)
      await this.trackAPIUsage('search', 100, [channelId], false)
      await this.logApiUsage(apiKeyInfo.id, 'search', [channelId], 100, true)

      return data.items || []
    } catch (error) {
      console.error('Error fetching recent videos:', error)
      await this.trackAPIUsage('search', 100, [channelId], false, error.message)
      await this.logApiUsage(apiKeyInfo.id, 'search', [channelId], 100, false, error.message)
      return []
    }
  }

  async getVideoDetails(videoIds: string[]): Promise<YouTubeVideo[]> {
    if (videoIds.length === 0) return []

    const cacheKey = `videos_${videoIds.sort().join('_')}`
    
    // Check cache first
    const cached = await this.getCachedResponse(cacheKey)
    if (cached && !cached.response_data.error) {
      await this.trackAPIUsage('videos', 0, [], true)
      return cached.response_data.items || []
    }

    // Get API key
    const apiKeyInfo = await this.getApiKey()

    const url = new URL('https://www.googleapis.com/youtube/v3/videos')
    url.searchParams.set('key', apiKeyInfo.key)
    url.searchParams.set('id', videoIds.join(','))
    url.searchParams.set('part', 'snippet,liveStreamingDetails,statistics')

    try {
      console.log('Fetching video details for:', videoIds.length, 'videos')
      const response = await fetch(url.toString())
      const data: YouTubeAPIResponse = await response.json()

      if (!response.ok) {
        const errorMessage = `YouTube API error: ${data.error?.message || response.statusText}`
        
        // Check if it's a quota error
        if (response.status === 403 && data.error?.message?.includes('quota')) {
          await this.markKeyAsQuotaExceeded(apiKeyInfo.id, errorMessage)
          // Try with a different key
          const newKeyInfo = await this.getApiKey()
          if (newKeyInfo.id !== apiKeyInfo.id) {
            url.searchParams.set('key', newKeyInfo.key)
            const retryResponse = await fetch(url.toString())
            const retryData: YouTubeAPIResponse = await retryResponse.json()
            if (retryResponse.ok) {
              await this.setCachedResponse(cacheKey, 'videos', retryData, 10)
              await this.logApiUsage(newKeyInfo.id, 'videos', [], 1, true)
              return retryData.items || []
            }
          }
        }
        
        throw new Error(errorMessage)
      }

      // Cache for 10 minutes since live details can change
      await this.setCachedResponse(cacheKey, 'videos', data, 10)
      await this.trackAPIUsage('videos', 1, [], false)
      await this.logApiUsage(apiKeyInfo.id, 'videos', [], 1, true)

      return data.items || []
    } catch (error) {
      console.error('Error fetching video details:', error)
      await this.trackAPIUsage('videos', 1, [], false, error.message)
      await this.logApiUsage(apiKeyInfo.id, 'videos', [], 1, false, error.message)
      return []
    }
  }
}

class ScheduleMatcher {
  static findMatchingSlot(stream: LiveStream, slots: ScheduleSlot[]): { slot: ScheduleSlot | null; confidence: number; timeDifference: number } {
    if (!stream.scheduled_start_time_utc) {
      return { slot: null, confidence: 0, timeDifference: 0 }
    }

    const streamDate = new Date(stream.scheduled_start_time_utc)
    const streamDayOfWeek = streamDate.getUTCDay()
    const streamTime = streamDate.toISOString().substr(11, 8) // HH:MM:SS

    let bestMatch = { slot: null as ScheduleSlot | null, confidence: 0, timeDifference: Infinity }

    for (const slot of slots) {
      let confidence = 0
      let timeDifference = Infinity

      // Check if this slot applies to this date/day
      if (slot.specific_date) {
        const specificDate = new Date(slot.specific_date + 'T00:00:00Z')
        if (specificDate.toDateString() !== streamDate.toDateString()) {
          continue // Skip slots for different specific dates
        }
        confidence += 0.5 // Specific date match is good
      } else if (slot.day_of_week && slot.day_of_week.includes(streamDayOfWeek)) {
        confidence += 0.3 // Day of week match
      } else if (slot.day_of_week && slot.day_of_week.length > 0) {
        continue // Skip slots that don't match the day
      }

      // Check time proximity if we have a default start time
      if (slot.default_start_time_utc) {
        const slotTime = slot.default_start_time_utc
        const timeDiff = this.calculateTimeDifference(streamTime, slotTime)
        timeDifference = timeDiff

        // Give higher confidence for closer times
        if (timeDiff <= 30) {
          confidence += 0.5 // Within 30 minutes
        } else if (timeDiff <= 60) {
          confidence += 0.3 // Within 1 hour
        } else if (timeDiff <= 120) {
          confidence += 0.1 // Within 2 hours
        }
      }

      // Check if this is our best match so far
      if (confidence > bestMatch.confidence || 
          (confidence === bestMatch.confidence && timeDifference < bestMatch.timeDifference)) {
        bestMatch = { slot, confidence, timeDifference }
      }
    }

    return bestMatch
  }

  private static calculateTimeDifference(time1: string, time2: string): number {
    const date1 = new Date(`1970-01-01T${time1}Z`)
    const date2 = new Date(`1970-01-01T${time2}Z`)
    return Math.abs(date1.getTime() - date2.getTime()) / (1000 * 60) // difference in minutes
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with service role
    const supabaseServiceRole = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parse request body for configuration
    let config: SyncConfig = {
      lookAheadHours: 48,
      lookBackHours: 168, // 7 days back to catch previous week's streams
      forceRefresh: false,
      maxResults: 50 // Increased to get more streams per channel
    }

    if (req.method === 'POST') {
      try {
        const body = await req.json()
        config = { ...config, ...body }
      } catch (e) {
        console.log('No valid JSON body, using defaults')
      }
    }

    const youtubeAPI = new YouTubeAPIService(supabaseServiceRole)

    // Get all configured YouTube channels or specific ones
    let channelsQuery = supabaseServiceRole
      .from('youtube_channels')
      .select('id, youtube_channel_id, channel_name')

    if (config.channelIds && config.channelIds.length > 0) {
      channelsQuery = channelsQuery.in('youtube_channel_id', config.channelIds)
    }

    const { data: channels, error: channelsError } = await channelsQuery

    if (channelsError) {
      throw new Error(`Failed to fetch channels: ${channelsError.message}`)
    }

    if (!channels || channels.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No channels to sync',
          synced: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Starting sync for ${channels.length} channels`)

    // Get schedule slots for matching
    const { data: scheduleSlots, error: slotsError } = await supabaseServiceRole
      .from('schedule_slots')
      .select('*')

    if (slotsError) {
      console.error('Failed to fetch schedule slots:', slotsError)
    }

    let totalSynced = 0
    const syncResults = []

    // Process each channel
    for (const channel of channels) {
      try {
        console.log(`Syncing channel: ${channel.channel_name} (${channel.youtube_channel_id})`)

        // Fetch upcoming live streams
        const upcomingVideos = await youtubeAPI.searchUpcomingLiveStreams(
          channel.youtube_channel_id, 
          config.maxResults
        )

        // Fetch recent videos (for past shows)
        const recentVideos = config.lookBackHours > 0 ? 
          await youtubeAPI.searchRecentVideos(
            channel.youtube_channel_id, 
            config.lookBackHours, 
            config.maxResults
          ) : []

        const allVideos = [...upcomingVideos, ...recentVideos]

        if (allVideos.length > 0) {
          // Get detailed information for all videos
          const videoIds = allVideos.map(v => v.id?.videoId || v.id).filter(Boolean)
          const detailedVideos = await youtubeAPI.getVideoDetails(videoIds)

          // Process and store each video
          for (const video of detailedVideos) {
            const videoId = video.id?.videoId || video.id

            const liveStream: LiveStream = {
              video_id: videoId,
              youtube_channel_id: channel.id,
              title: video.snippet?.title || null,
              thumbnail_url: video.snippet?.thumbnails?.high?.url || video.snippet?.thumbnails?.default?.url || null,
              stream_url: `https://www.youtube.com/watch?v=${videoId}`,
              scheduled_start_time_utc: video.liveStreamingDetails?.scheduledStartTime || null,
              actual_start_time_utc: video.liveStreamingDetails?.actualStartTime || null,
              actual_end_time_utc: video.liveStreamingDetails?.actualEndTime || null,
              status: determineStreamStatus(video),
              description: video.snippet?.description || null,
              view_count: video.statistics?.viewCount ? parseInt(video.statistics.viewCount) : null,
              privacy_status: 'public',
              fetched_at: new Date().toISOString(),
              matched_slot_id: null,
              scheduled_vs_actual_diff: null
            }

            // Try to match with schedule slot
            if (scheduleSlots && scheduleSlots.length > 0) {
              const channelSlots = scheduleSlots.filter(s => s.youtube_channel_id === channel.id)
              const match = ScheduleMatcher.findMatchingSlot(liveStream, channelSlots)
              
              if (match.slot && match.confidence > 0.3) {
                liveStream.matched_slot_id = match.slot.id
                
                // Calculate time difference if both times are available
                if (liveStream.scheduled_start_time_utc && match.slot.default_start_time_utc) {
                  const diffMinutes = match.timeDifference
                  liveStream.scheduled_vs_actual_diff = `${diffMinutes} minutes`
                }
              }
            }

            // Upsert the live stream
            const { error: upsertError } = await supabaseServiceRole
              .from('live_streams')
              .upsert(liveStream, {
                onConflict: 'video_id',
                ignoreDuplicates: false
              })

            if (upsertError) {
              console.error('Error upserting live stream:', upsertError)
            } else {
              totalSynced++
            }
          }
        }

        syncResults.push({
          channel: channel.channel_name,
          upcoming: upcomingVideos.length,
          recent: recentVideos.length,
          total: allVideos.length
        })

      } catch (error) {
        console.error(`Error syncing channel ${channel.channel_name}:`, error)
        syncResults.push({
          channel: channel.channel_name,
          error: error.message
        })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sync completed for ${channels.length} channels`,
        totalSynced,
        channels: syncResults,
        config
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Sync error:', error)
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

function determineStreamStatus(video: YouTubeVideo): string {
  const now = new Date()
  const scheduledStart = video.liveStreamingDetails?.scheduledStartTime ? 
    new Date(video.liveStreamingDetails.scheduledStartTime) : null
  const actualStart = video.liveStreamingDetails?.actualStartTime ? 
    new Date(video.liveStreamingDetails.actualStartTime) : null
  const actualEnd = video.liveStreamingDetails?.actualEndTime ? 
    new Date(video.liveStreamingDetails.actualEndTime) : null

  if (actualEnd) {
    return 'completed'
  } else if (actualStart) {
    return 'live'
  } else if (scheduledStart && scheduledStart > now) {
    return 'upcoming'
  } else if (video.snippet?.liveBroadcastContent === 'live') {
    return 'live'
  } else if (video.snippet?.liveBroadcastContent === 'upcoming') {
    return 'upcoming'
  } else {
    return 'completed'
  }
}