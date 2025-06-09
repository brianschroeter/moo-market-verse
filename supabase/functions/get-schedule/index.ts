import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface ScheduleResponse {
  channels: Channel[]
  scheduleSlots: ScheduleSlot[]
  liveStreams: LiveStream[]
  lastUpdated: string
  nextUpdateIn: number
  stats: {
    totalChannels: number
    totalSlots: number
    liveNow: number
    upcomingToday: number
  }
}

interface Channel {
  id: string
  youtube_channel_id: string
  channel_name: string | null
  custom_display_name: string | null
  avatar_url: string | null
}

interface ScheduleSlot {
  id: string
  youtube_channel_id: string
  day_of_week: number[] | null
  default_start_time_utc: string | null
  specific_date: string | null
  is_recurring: boolean
  fallback_title: string | null
  notes: string | null
  channel?: Channel
}

interface LiveStream {
  id: string
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
  privacy_status: string | null
  fetched_at: string | null
  matched_slot_id: string | null
  scheduled_vs_actual_diff: string | null
  channel?: Channel
  matchedSlot?: ScheduleSlot
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client (public access)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Parse query parameters
    const url = new URL(req.url)
    const channelIds = url.searchParams.get('channels')?.split(',') || []
    const includeRecent = url.searchParams.get('includeRecent') === 'true'
    const daysAhead = parseInt(url.searchParams.get('daysAhead') || '7')
    const hoursBack = parseInt(url.searchParams.get('hoursBack') || '24')

    console.log('Fetching schedule data with params:', {
      channelIds: channelIds.length > 0 ? channelIds : 'all',
      includeRecent,
      daysAhead,
      hoursBack
    })

    // Fetch all channels
    let channelsQuery = supabase
      .from('youtube_channels')
      .select('*')
      .order('channel_name')

    if (channelIds.length > 0) {
      channelsQuery = channelsQuery.in('youtube_channel_id', channelIds)
    }

    const { data: channels, error: channelsError } = await channelsQuery

    if (channelsError) {
      throw new Error(`Failed to fetch channels: ${channelsError.message}`)
    }

    if (!channels || channels.length === 0) {
      return new Response(
        JSON.stringify({
          channels: [],
          scheduleSlots: [],
          liveStreams: [],
          lastUpdated: new Date().toISOString(),
          nextUpdateIn: 900, // 15 minutes
          stats: {
            totalChannels: 0,
            totalSlots: 0,
            liveNow: 0,
            upcomingToday: 0
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const channelUUIDs = channels.map(c => c.id)

    // Fetch schedule slots for these channels
    const { data: scheduleSlots, error: slotsError } = await supabase
      .from('schedule_slots')
      .select('*')
      .in('youtube_channel_id', channelUUIDs)
      .order('default_start_time_utc')

    if (slotsError) {
      console.error('Error fetching schedule slots:', slotsError)
    }

    // Calculate date range for live streams
    const now = new Date()
    const startDate = includeRecent ? 
      new Date(now.getTime() - hoursBack * 60 * 60 * 1000) :
      new Date(now.getTime() - 60 * 60 * 1000) // Just 1 hour back for current live streams

    const endDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000)

    // Fetch live streams within the date range
    let liveStreamsQuery = supabase
      .from('live_streams')
      .select('*')
      .in('youtube_channel_id', channelUUIDs)
      .order('scheduled_start_time_utc')

    // Filter by date range if we have scheduled times
    liveStreamsQuery = liveStreamsQuery
      .or(`scheduled_start_time_utc.gte.${startDate.toISOString()},scheduled_start_time_utc.lte.${endDate.toISOString()},status.eq.live`)

    const { data: liveStreams, error: streamsError } = await liveStreamsQuery

    if (streamsError) {
      console.error('Error fetching live streams:', streamsError)
    }

    // Create lookup maps
    const channelMap = new Map(channels.map(c => [c.id, c]))
    const slotMap = new Map((scheduleSlots || []).map(s => [s.id, s]))

    // Enhance schedule slots with channel info
    const enhancedSlots = (scheduleSlots || []).map(slot => ({
      ...slot,
      channel: channelMap.get(slot.youtube_channel_id)
    }))

    // Enhance live streams with channel and slot info
    const enhancedStreams = (liveStreams || []).map(stream => ({
      ...stream,
      channel: channelMap.get(stream.youtube_channel_id),
      matchedSlot: stream.matched_slot_id ? slotMap.get(stream.matched_slot_id) : null
    }))

    // Calculate statistics
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    const stats = {
      totalChannels: channels.length,
      totalSlots: scheduleSlots?.length || 0,
      liveNow: enhancedStreams.filter(s => s.status === 'live').length,
      upcomingToday: enhancedStreams.filter(s => {
        if (s.status !== 'upcoming' || !s.scheduled_start_time_utc) return false
        const scheduledTime = new Date(s.scheduled_start_time_utc)
        return scheduledTime >= todayStart && scheduledTime <= todayEnd
      }).length
    }

    // Determine next update time (cache for 5 minutes for live data, 15 minutes otherwise)
    const hasLiveStreams = enhancedStreams.some(s => s.status === 'live')
    const nextUpdateIn = hasLiveStreams ? 300 : 900 // 5 min if live, 15 min otherwise

    // Find the most recent fetch time
    const fetchTimes = enhancedStreams
      .map(s => s.fetched_at)
      .filter(Boolean)
      .map(t => new Date(t!))
    
    const lastUpdated = fetchTimes.length > 0 ? 
      new Date(Math.max(...fetchTimes.map(d => d.getTime()))).toISOString() :
      new Date().toISOString()

    const response: ScheduleResponse = {
      channels,
      scheduleSlots: enhancedSlots,
      liveStreams: enhancedStreams,
      lastUpdated,
      nextUpdateIn,
      stats
    }

    return new Response(
      JSON.stringify(response),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': `public, max-age=${Math.floor(nextUpdateIn / 2)}` // Cache for half the update interval
        } 
      }
    )

  } catch (error) {
    console.error('Error fetching schedule:', error)
    return new Response(
      JSON.stringify({
        error: error.message,
        channels: [],
        scheduleSlots: [],
        liveStreams: [],
        lastUpdated: new Date().toISOString(),
        nextUpdateIn: 900,
        stats: {
          totalChannels: 0,
          totalSlots: 0,
          liveNow: 0,
          upcomingToday: 0
        }
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})