import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import ScheduleHeader from "../components/ScheduleHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Clock, 
  ExternalLink, 
  Users, 
  Tv, 
  Radio,
  Play,
  TrendingUp,
  Activity,
  Filter,
  X,
  Calendar,
  Sparkles,
  ChevronRight,
  Youtube
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getProxiedImageUrl, getImageWithFallback } from "@/utils/imageProxy";
import { useActiveSync } from "@/hooks/useActiveSync";

interface ScheduleData {
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

const formatTime = (dateString: string | null): string => {
  if (!dateString) return "TBA"
  const date = new Date(dateString)
  // Round down to the nearest hour
  date.setMinutes(0)
  date.setSeconds(0)
  // Format time to prevent AM/PM wrapping
  const timeStr = date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true
  })
  // Replace space with non-breaking space to prevent wrapping
  return timeStr.replace(' ', '\u00A0')
}

const formatRelativeTime = (dateString: string | null, isLive: boolean = false): string => {
  if (!dateString) return ""
  
  const now = new Date()
  const date = new Date(dateString)
  const diffMs = date.getTime() - now.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffMs < 0) {
    // Past
    const absDiffMs = Math.abs(diffMs)
    const absDiffMinutes = Math.floor(absDiffMs / (1000 * 60))
    const absDiffHours = Math.floor(absDiffMs / (1000 * 60 * 60))
    const absDiffDays = Math.floor(absDiffMs / (1000 * 60 * 60 * 24))
    
    // For live streams, show when it started
    if (isLive) {
      if (absDiffMinutes < 1) return "Just started"
      if (absDiffMinutes < 60) return `Started ${absDiffMinutes}m ago`
      if (absDiffHours < 24) return `Started ${absDiffHours}h ago`
      return `Started ${absDiffDays}d ago`
    }
    
    // For non-live streams, show when it ended
    if (absDiffHours < 1) return "Just ended"
    if (absDiffHours < 24) return `${absDiffHours}h ago`
    return `${absDiffDays}d ago`
  } else {
    // Future
    if (diffHours < 1) return "Starting soon"
    if (diffHours < 24) return `In ${diffHours}h`
    return `In ${diffDays}d`
  }
}

const getDayName = (date: Date): string => {
  return date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
}

const getDayOfWeek = (date: Date): number => {
  return date.getDay(); // 0 = Sunday, 1 = Monday, etc.
}

const formatDayTitle = (day: string): string => {
  return day.charAt(0).toUpperCase() + day.slice(1);
}

// Generate default thumbnail with channel initials
const DefaultThumbnail: React.FC<{ channelName: string | null | undefined }> = ({ channelName }) => {
  const name = channelName || "Channel"
  const initials = name.split(' ').map(word => word[0]).join('').slice(0, 2).toUpperCase()
  const colors = [
    'from-purple-600 to-pink-600',
    'from-blue-600 to-cyan-600',
    'from-green-600 to-emerald-600',
    'from-orange-600 to-red-600',
    'from-indigo-600 to-purple-600'
  ]
  const colorIndex = name.charCodeAt(0) % colors.length
  
  return (
    <div className={`w-full h-full bg-gradient-to-br ${colors[colorIndex]} flex items-center justify-center`}>
      <span className="text-4xl font-bold text-white">{initials}</span>
    </div>
  )
}

// Video card component for consistent styling
const VideoCard: React.FC<{ 
  stream?: LiveStream
  slot?: ScheduleSlot
  isLive?: boolean
}> = ({ stream, slot, isLive }) => {
  const isLiveStream = !!stream
  const title = isLiveStream ? stream.title : slot?.fallback_title || 'Scheduled Show'
  const channel = isLiveStream ? stream.channel : slot?.channel
  const channelName = channel?.custom_display_name || channel?.channel_name || 'Unknown Channel'
  const thumbnailUrl = isLiveStream ? getProxiedImageUrl(stream.thumbnail_url) : null
  const streamUrl = isLiveStream ? stream.stream_url : null
  // For live streams, use actual start time; for others, use scheduled time
  const displayTime = isLiveStream ? 
    (stream.status === 'live' && stream.actual_start_time_utc ? stream.actual_start_time_utc : stream.scheduled_start_time_utc) : 
    null
  const description = isLiveStream ? stream.description : slot?.notes
  
  return (
    <div className="group relative h-full">
      <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      <Card className="relative h-full bg-gray-800/60 border-gray-700/50 overflow-hidden hover:border-purple-500/50 transition-all duration-300 hover:transform hover:scale-[1.01] sm:hover:scale-[1.02]">
        {/* Thumbnail */}
        <div className="relative aspect-video overflow-hidden bg-gray-900">
          {thumbnailUrl ? (
            <img 
              src={thumbnailUrl} 
              alt={title || 'Stream thumbnail'}
              className="w-full h-full object-cover"
            />
          ) : (
            <DefaultThumbnail channelName={channelName} />
          )}
          
          {/* Live indicator */}
          {isLive && (
            <div className="absolute top-2 sm:top-4 left-2 sm:left-4">
              <div className="flex items-center gap-1.5 sm:gap-2 bg-red-600 text-white px-2 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-lg animate-pulse">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full"></div>
                <span className="text-xs sm:text-sm font-bold">LIVE</span>
              </div>
            </div>
          )}
          
          {/* Time indicator */}
          {displayTime && (
            <div className="absolute bottom-2 sm:bottom-4 right-2 sm:right-4">
              <div className="bg-black/80 backdrop-blur-sm text-white px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium">
                {formatRelativeTime(displayTime, isLive || (stream?.status === 'live'))}
              </div>
            </div>
          )}
          
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
            {streamUrl && (
              <Button
                onClick={() => window.open(streamUrl, '_blank')}
                className="bg-red-600 hover:bg-red-700 text-white shadow-lg"
                size="sm"
              >
                <Youtube className="h-4 w-4 mr-2" />
                Watch Now
              </Button>
            )}
          </div>
        </div>
        
        {/* Content */}
        <CardContent className="p-3 sm:p-4 space-y-2 sm:space-y-3">
          <h3 className="font-bold text-base sm:text-lg text-white line-clamp-2 group-hover:text-purple-300 transition-colors">
            {title}
          </h3>
          
          <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-400">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Tv className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="line-clamp-1">{channelName}</span>
            </div>
          </div>
          
          {displayTime && (
            <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-400">
              <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>{formatTime(displayTime)}</span>
            </div>
          )}
          
          {description && (
            <p className="text-xs sm:text-sm text-gray-300 line-clamp-2">
              {description}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Weekly schedule table component
const WeeklyScheduleTable: React.FC<{
  channels: Channel[]
  scheduleSlots: ScheduleSlot[]
  liveStreams: LiveStream[]
  selectedChannels: string[]
}> = ({ channels, scheduleSlots, liveStreams, selectedChannels }) => {
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const today = new Date()
  const currentDayIndex = today.getDay()
  
  // Get channels to display (filtered if filters are active)
  const displayChannels = selectedChannels.length > 0 
    ? channels.filter(c => selectedChannels.includes(c.id))
    : channels
  
  // Group schedule slots by channel and day
  const getScheduleForChannelAndDay = (channel: Channel, dayIndex: number): { 
    slot?: ScheduleSlot, 
    stream?: LiveStream, 
    time?: string, 
    type?: 'live' | 'streamed' | 'scheduled' | 'predicted',
    note?: string 
  } => {
    // Calculate the actual date for this day in the current week
    const now = new Date()
    const currentWeekStart = new Date(now)
    currentWeekStart.setDate(now.getDate() - now.getDay()) // Start of this week's Sunday
    currentWeekStart.setHours(0, 0, 0, 0)
    
    const targetDate = new Date(currentWeekStart)
    targetDate.setDate(currentWeekStart.getDate() + dayIndex)
    targetDate.setHours(0, 0, 0, 0)
    
    const targetDateEnd = new Date(targetDate)
    targetDateEnd.setHours(23, 59, 59, 999)
    
    // Check if this day is in the past, today, or future
    const isToday = dayIndex === currentDayIndex
    const isPast = targetDate < now && !isToday
    const isFuture = targetDate > now && !isToday
    
    // For today and past days, look for actual streams
    if (isToday || isPast) {
      const dayStream = liveStreams.find(stream => {
        if (stream.youtube_channel_id !== channel.id) return false
        
        // Only show streams that started on this day
        const streamStartTime = stream.actual_start_time_utc || stream.scheduled_start_time_utc
        if (streamStartTime) {
          const streamStartDate = new Date(streamStartTime)
          if (streamStartDate >= targetDate && streamStartDate <= targetDateEnd) {
            return true
          }
        }
        
        return false
      })
      
      if (dayStream) {
        const displayTime = dayStream.actual_start_time_utc || dayStream.scheduled_start_time_utc
        const formattedTime = formatTime(displayTime)
        
        return { 
          stream: dayStream, 
          time: formattedTime,
          type: dayStream.status === 'live' ? 'live' : 
                dayStream.status === 'completed' ? 'streamed' : 
                'scheduled' // For upcoming streams showing on today
        }
      }
    }
    
    // Check for scheduled slots
    const slot = scheduleSlots.find(s => 
      s.youtube_channel_id === channel.id && 
      s.day_of_week?.includes(dayIndex)
    )
    
    if (slot && slot.default_start_time_utc) {
      // Parse time string (e.g., "19:00:00") and format it
      const [hours] = slot.default_start_time_utc.split(':')
      const date = new Date()
      date.setHours(parseInt(hours), 0, 0) // Round down to the hour
      return { 
        slot, 
        time: date.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true
        }).replace(' ', '\u00A0'), // Non-breaking space to prevent AM/PM wrapping
        type: 'scheduled'
      }
    }
    
    // For Mon-Fri (dayIndex 1-5), look for last week's stream time as prediction
    if (dayIndex >= 1 && dayIndex <= 5) {
      const lastWeekDate = new Date(targetDate)
      lastWeekDate.setDate(lastWeekDate.getDate() - 7)
      const lastWeekDateEnd = new Date(lastWeekDate)
      lastWeekDateEnd.setHours(23, 59, 59, 999)
      
      const lastWeekStream = liveStreams.find(stream => {
        if (stream.youtube_channel_id !== channel.id) return false
        
        const streamTime = stream.actual_start_time_utc || stream.scheduled_start_time_utc
        if (!streamTime) return false
        
        const streamDate = new Date(streamTime)
        return streamDate >= lastWeekDate && streamDate <= lastWeekDateEnd
      })
      
      if (lastWeekStream) {
        const displayTime = lastWeekStream.actual_start_time_utc || lastWeekStream.scheduled_start_time_utc
        return {
          stream: lastWeekStream,
          time: formatTime(displayTime),
          type: 'predicted',
          note: 'Based on last week'
        }
      }
    }
    
    return {}
  }
  
  // Helper to format day header
  const formatDayHeader = (day: string, index: number) => {
    const isToday = index === currentDayIndex
    const now = new Date()
    const currentWeekStart = new Date(now)
    currentWeekStart.setDate(now.getDate() - now.getDay())
    const dayDate = new Date(currentWeekStart)
    dayDate.setDate(currentWeekStart.getDate() + index)
    
    return (
      <th key={`day-${index}`} className={`px-2 sm:px-4 md:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium ${isToday ? 'text-purple-400 bg-purple-900/20' : 'text-gray-300'}`}>
        <div className="flex flex-col items-center gap-1">
          <span className="font-semibold hidden sm:inline">{day}</span>
          <span className="font-semibold sm:hidden">{day.substring(0, 3)}</span>
          <span className="text-[10px] sm:text-xs text-gray-500 block sm:inline sm:ml-1">
            {dayDate.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}
          </span>
          {isToday && <span className="text-[10px] sm:text-xs text-purple-400 font-bold block sm:inline">TODAY</span>}
        </div>
      </th>
    )
  }
  
  return (
    <div className="w-full overflow-x-auto rounded-lg -mx-4 sm:mx-0">
      <div className="min-w-[600px] sm:min-w-[700px] md:min-w-[800px] px-4 sm:px-0">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-900/50">
              <th className="sticky left-0 z-10 bg-gray-900/90 backdrop-blur-sm px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-medium text-gray-300 border-r border-gray-800">
                <span className="hidden sm:inline">Channel</span>
                <span className="sm:hidden">Ch.</span>
              </th>
              {daysOfWeek.map((day, index) => formatDayHeader(day, index))}
            </tr>
          </thead>
          <tbody>
            {displayChannels.map((channel) => {
              const channelName = channel.custom_display_name || channel.channel_name || 'Unknown Channel'
              const avatarProps = getImageWithFallback(channel.avatar_url)
              
              return (
                <tr key={channel.id} className="border-b border-gray-800 group hover:bg-gray-800/30 transition-all duration-200">
                  <td className="sticky left-0 z-10 bg-gray-900/90 group-hover:bg-gray-800/90 backdrop-blur-sm px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-r border-gray-800 transition-colors">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden bg-gradient-to-br from-gray-700 to-gray-800 flex-shrink-0 ring-1 sm:ring-2 ring-gray-700 group-hover:ring-purple-600/50 transition-all">
                        {channel.avatar_url ? (
                          <img 
                            {...avatarProps}
                            alt={channelName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs sm:text-sm font-bold text-gray-400">
                            {channelName.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <span className="font-medium text-white whitespace-nowrap group-hover:text-purple-300 transition-colors text-xs sm:text-sm max-w-[80px] sm:max-w-[120px] md:max-w-none truncate">
                        <span className="hidden sm:inline">{channelName}</span>
                        <span className="sm:hidden">{channelName.length > 10 ? channelName.substring(0, 10) + '...' : channelName}</span>
                      </span>
                    </div>
                  </td>
                  {daysOfWeek.map((_, dayIndex) => {
                    const { slot, stream, time, type, note } = getScheduleForChannelAndDay(channel, dayIndex)
                    const isToday = dayIndex === currentDayIndex
                    
                    return (
                      <td 
                        key={dayIndex} 
                        className={`px-2 sm:px-4 md:px-6 py-3 sm:py-4 text-center transition-all duration-200 ${
                          isToday ? 'bg-purple-900/10 group-hover:bg-purple-800/20' : 'group-hover:bg-gray-800/20'
                        }`}
                      >
                        {time ? (
                          <div className="flex flex-col items-center gap-1 transform transition-transform group-hover:scale-105">
                            <Badge className={`text-white text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 shadow-lg cursor-pointer transition-all whitespace-nowrap ${
                              type === 'live' 
                                ? 'bg-red-600 hover:bg-red-700 animate-pulse' 
                                : type === 'streamed'
                                ? 'bg-green-600 hover:bg-green-700'
                                : type === 'scheduled'
                                ? 'bg-yellow-600 hover:bg-yellow-700'
                                : type === 'predicted'
                                ? 'bg-gray-600 hover:bg-gray-500 border border-dashed border-gray-400'
                                : 'bg-gray-700 hover:bg-gray-600'
                            }`}>
                              {time}
                            </Badge>
                            <div className="flex flex-col items-center gap-0.5">
                              <span className={`text-[10px] sm:text-xs font-medium hidden sm:block ${
                                type === 'live' 
                                  ? 'text-red-400' 
                                  : type === 'streamed'
                                  ? 'text-green-400'
                                  : type === 'scheduled'
                                  ? 'text-yellow-400'
                                  : type === 'predicted'
                                  ? 'text-gray-400'
                                  : 'text-gray-400'
                              }`}>
                                {type === 'live' ? 'Live' 
                                  : type === 'streamed' ? 'Streamed' 
                                  : type === 'scheduled' ? 'Scheduled'
                                  : type === 'predicted' ? 'Usual Time'
                                  : 'Regular'}
                              </span>
                              {note && (
                                <span className="text-[10px] sm:text-xs text-gray-500 italic hidden sm:block">
                                  {note}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] sm:text-xs md:text-sm text-gray-600 italic">TBD</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      
      {/* Mobile scroll indicator */}
      <div className="md:hidden flex flex-col items-center justify-center pt-2 px-4 text-center">
        <span className="flex items-center gap-1 text-xs text-gray-500 mb-1">
          <ChevronRight className="h-3 w-3 animate-pulse" />
          Swipe to see all days
          <ChevronRight className="h-3 w-3 animate-pulse" />
        </span>
        <div className="flex gap-1">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className={`h-1 w-1 rounded-full ${i < 3 ? 'bg-purple-400' : 'bg-gray-600'}`} />
          ))}
        </div>
      </div>
    </div>
  )
}

const Schedule: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState<'live' | 'replay' | 'upcoming'>('live');
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);

  // Trigger active sync when viewing the schedule
  useActiveSync();

  // Fetch schedule data - always include recent for replays
  const { data: scheduleData, isLoading, isError, error, refetch } = useQuery<ScheduleData>({
    queryKey: ['schedule'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-schedule', {
        body: {
          includeRecent: true, // Always include recent for replay section
          daysAhead: 7,
          hoursBack: 240 // 10 days back to ensure we have last week's data for predictions
        }
      })

      if (error) throw error
      return data
    },
    staleTime: 30 * 1000, // 30 seconds - more frequent updates for live content
    refetchInterval: (data) => {
      // Refetch more frequently if there are live streams
      return data?.stats?.liveNow > 0 ? 30 * 1000 : 2 * 60 * 1000 // 30 sec if live, 2 min otherwise
    }
  })

  // Get unique channels from schedule data
  const getAvailableChannels = (): Channel[] => {
    if (!scheduleData) return []
    return scheduleData.channels || []
  }

  // Handle channel filter toggle
  const toggleChannelFilter = (channelId: string) => {
    setSelectedChannels(prev => 
      prev.includes(channelId) 
        ? prev.filter(id => id !== channelId)
        : [...prev, channelId]
    )
  }

  // Clear all filters
  const clearAllFilters = () => {
    setSelectedChannels([])
  }

  // Check if filters are active
  const hasActiveFilters = selectedChannels.length > 0

  // Get streams by status
  const getLiveStreams = (): LiveStream[] => {
    if (!scheduleData) return []
    let streams = scheduleData.liveStreams.filter(stream => stream.status === 'live')
    
    if (selectedChannels.length > 0) {
      streams = streams.filter(stream => selectedChannels.includes(stream.youtube_channel_id))
    }
    
    return streams
  }

  const getReplayStreams = (): LiveStream[] => {
    if (!scheduleData) return []
    const now = new Date()
    const threeDaysAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000)
    
    let streams = scheduleData.liveStreams.filter(stream => {
      if (stream.status !== 'completed') return false
      if (!stream.actual_end_time_utc && !stream.scheduled_start_time_utc) return false
      
      const streamTime = new Date(stream.actual_end_time_utc || stream.scheduled_start_time_utc!)
      return streamTime >= threeDaysAgo && streamTime <= now
    })
    
    if (selectedChannels.length > 0) {
      streams = streams.filter(stream => selectedChannels.includes(stream.youtube_channel_id))
    }
    
    // Sort by most recent first
    return streams.sort((a, b) => {
      const timeA = a.actual_end_time_utc || a.scheduled_start_time_utc || ''
      const timeB = b.actual_end_time_utc || b.scheduled_start_time_utc || ''
      return timeB.localeCompare(timeA)
    })
  }

  const getUpcomingStreams = (): LiveStream[] => {
    if (!scheduleData) return []
    const now = new Date()
    const twentyFourHoursLater = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    
    let streams = scheduleData.liveStreams.filter(stream => {
      // Only include upcoming streams (not live or completed)
      if (stream.status === 'live' || stream.status === 'completed') return false
      
      const scheduledTime = stream.scheduled_start_time_utc
      if (!scheduledTime) return false
      
      const streamTime = new Date(scheduledTime)
      // Show streams scheduled in the next 24 hours that have thumbnails
      return streamTime > now && streamTime <= twentyFourHoursLater && stream.thumbnail_url
    })
    
    if (selectedChannels.length > 0) {
      streams = streams.filter(stream => selectedChannels.includes(stream.youtube_channel_id))
    }
    
    // Sort by scheduled time (earliest first)
    return streams.sort((a, b) => {
      const timeA = a.scheduled_start_time_utc || ''
      const timeB = b.scheduled_start_time_utc || ''
      return timeA.localeCompare(timeB)
    })
  }

  const getWeeklyStreams = (): LiveStream[] => {
    if (!scheduleData) return []
    const today = new Date()
    
    // Show streams from the past week to next week
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - today.getDay() - 7) // Start of last Sunday
    startOfWeek.setHours(0, 0, 0, 0)
    
    const endOfWeek = new Date(today)
    endOfWeek.setDate(today.getDate() + (6 - today.getDay()) + 7) // End of next Saturday
    endOfWeek.setHours(23, 59, 59, 999)
    
    console.log('📅 Getting weekly streams:', {
      startOfWeek: startOfWeek.toISOString(),
      endOfWeek: endOfWeek.toISOString(),
      totalStreams: scheduleData.liveStreams.length
    })
    
    // Get all streams for the weekly view (past week, current week, and next week)
    const weeklyStreams = scheduleData.liveStreams.filter(stream => {
      // Use actual start time if available, otherwise scheduled time
      const streamTime = stream.actual_start_time_utc 
        ? new Date(stream.actual_start_time_utc)
        : stream.scheduled_start_time_utc 
          ? new Date(stream.scheduled_start_time_utc)
          : null
          
      if (!streamTime) return false
      
      const isInWeek = streamTime >= startOfWeek && streamTime <= endOfWeek
      
      if (isInWeek) {
        console.log('📺 Stream in week:', {
          title: stream.title,
          channel_id: stream.youtube_channel_id,
          time: streamTime.toISOString(),
          status: stream.status
        })
      }
      
      return isInWeek
    })
    
    console.log('📊 Weekly streams found:', weeklyStreams.length)
    return weeklyStreams
  }

  if (isError) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-b from-lolcow-black to-lolcow-darkgray text-white">
        <Navbar />
        <main className="flex-grow container mx-auto px-3 sm:px-4 py-4 sm:py-8">
          <div className="text-center">
            <div className="p-4 rounded-lg bg-red-500/20 mb-4 inline-block">
              <Tv className="h-16 w-16 text-red-400 mx-auto mb-4" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-fredoka mb-3 sm:mb-4 text-red-400">Schedule Unavailable</h1>
            <p className="text-sm sm:text-base text-gray-300 mb-3 sm:mb-4">{error?.message || 'Failed to load schedule data'}</p>
            <Button onClick={() => refetch()} className="bg-lolcow-blue hover:bg-lolcow-blue/80">
              Try Again
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const liveStreams = getLiveStreams()
  const upcomingStreams = getUpcomingStreams()
  const replayStreams = getReplayStreams()
  const weeklyStreams = getWeeklyStreams()

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-lolcow-black to-lolcow-darkgray text-white">
      <Navbar />
      <main className="flex-grow container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <ScheduleHeader 
          includeRecent={true}
          onToggleRecent={() => {}}
          stats={scheduleData?.stats}
        />

        {/* Enhanced Stats Row */}
        {scheduleData && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-blue-600/0 rounded-xl blur-xl group-hover:from-blue-600/30 transition-all duration-500"></div>
              <div className="relative bg-gradient-to-br from-blue-800/40 to-blue-900/60 rounded-xl px-4 sm:px-6 py-4 sm:py-5 border border-blue-700/40 shadow-xl backdrop-blur-sm hover:from-blue-700/50 hover:to-blue-800/70 transition-all duration-300 hover:scale-105 hover:shadow-2xl">
                <div className="flex items-center">
                  <div className="p-2 sm:p-3 rounded-xl bg-blue-500/20 mr-3 sm:mr-4 shadow-inner">
                    <Tv className="h-5 w-5 sm:h-7 sm:w-7 text-blue-400 filter drop-shadow-glow" />
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-bold text-white mb-0.5 sm:mb-1 font-fredoka">{scheduleData.stats.totalChannels}</div>
                    <div className="text-xs sm:text-sm font-medium text-blue-300 uppercase tracking-wider">Channels</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-red-600/20 to-red-600/0 rounded-xl blur-xl group-hover:from-red-600/30 transition-all duration-500"></div>
              <div className="relative bg-gradient-to-br from-red-800/40 to-red-900/60 rounded-xl px-4 sm:px-6 py-4 sm:py-5 border border-red-700/40 shadow-xl backdrop-blur-sm hover:from-red-700/50 hover:to-red-800/70 transition-all duration-300 hover:scale-105 hover:shadow-2xl">
                <div className="flex items-center">
                  <div className="p-2 sm:p-3 rounded-xl bg-red-500/20 mr-3 sm:mr-4 shadow-inner">
                    <Radio className="h-5 w-5 sm:h-7 sm:w-7 text-red-400 animate-pulse filter drop-shadow-glow" />
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-bold text-white mb-0.5 sm:mb-1 font-fredoka">{scheduleData.stats.liveNow}</div>
                    <div className="text-xs sm:text-sm font-medium text-red-300 uppercase tracking-wider">Live Now</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filter Section */}
        {scheduleData && getAvailableChannels().length > 0 && (
          <Card className="bg-gradient-to-br from-gray-800/40 to-gray-900/60 border border-gray-700/50 shadow-lg mb-6 sm:mb-8">
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="font-fredoka text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-purple-500/20 mr-2 sm:mr-3">
                    <Filter className="h-4 w-4 sm:h-5 sm:w-5 text-purple-400" />
                  </div>
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-white font-bold text-lg sm:text-xl">
                    Filter by Channel
                  </span>
                </div>
                {hasActiveFilters && (
                  <Button
                    onClick={clearAllFilters}
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:text-white hover:bg-gray-600/50 self-start sm:self-auto"
                  >
                    <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    Clear All
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 sm:pt-2">
              {/* Mobile/Tablet: Grid layout for equal-sized pills */}
              <div className="grid grid-cols-2 sm:hidden gap-2">
                {getAvailableChannels().map((channel) => {
                  const isSelected = selectedChannels.includes(channel.id)
                  const displayName = channel.custom_display_name || channel.channel_name || 'Unknown Channel'
                  
                  return (
                    <Button
                      key={channel.id}
                      onClick={() => toggleChannelFilter(channel.id)}
                      variant={isSelected ? "default" : "outline"}
                      className={`relative flex items-center justify-center gap-2 px-3 py-3 h-auto transition-all text-xs font-medium ${
                        isSelected 
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0 shadow-xl ring-2 ring-purple-400/50' 
                          : 'bg-gray-800/60 border-gray-600 text-gray-300 active:bg-gray-700/80'
                      }`}
                    >
                      {/* Channel Avatar */}
                      <div className="relative flex-shrink-0">
                        {channel.avatar_url ? (
                          <img 
                            src={getProxiedImageUrl(channel.avatar_url)}
                            alt={displayName}
                            className={`w-6 h-6 rounded-full object-cover ${
                              isSelected ? 'ring-2 ring-white/50' : 'ring-1 ring-gray-600'
                            }`}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              target.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <div className={`${channel.avatar_url ? 'hidden' : ''} w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xs`}>
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                        {isSelected && (
                          <div className="absolute -bottom-1 -right-1 h-2.5 w-2.5 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
                        )}
                      </div>
                      
                      {/* Channel Name - Truncated for mobile */}
                      <span className="font-medium truncate max-w-[80px]">{displayName}</span>
                    </Button>
                  )
                })}
              </div>
              
              {/* Desktop: Original flex layout */}
              <div className="hidden sm:flex sm:flex-wrap sm:gap-3 md:gap-4">
                {getAvailableChannels().map((channel) => {
                  const isSelected = selectedChannels.includes(channel.id)
                  const displayName = channel.custom_display_name || channel.channel_name || 'Unknown Channel'
                  
                  return (
                    <Button
                      key={channel.id}
                      onClick={() => toggleChannelFilter(channel.id)}
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      className={`relative flex items-center gap-2 sm:gap-3 pr-3 sm:pr-4 pl-1.5 sm:pl-2 py-1.5 sm:py-2 h-auto transition-all transform hover:scale-105 text-xs sm:text-sm ${
                        isSelected 
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 shadow-xl ring-2 ring-purple-400/50' 
                          : 'bg-gray-800/60 border-gray-600 text-gray-300 hover:bg-gray-700/80 hover:text-white hover:border-purple-500/50'
                      }`}
                    >
                      {/* Channel Avatar */}
                      <div className="relative flex-shrink-0">
                        {channel.avatar_url ? (
                          <img 
                            src={getProxiedImageUrl(channel.avatar_url)}
                            alt={displayName}
                            className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover ${
                              isSelected ? 'ring-2 ring-white/50' : 'ring-1 ring-gray-600'
                            }`}
                            onError={(e) => {
                              // Fallback to initials if image fails to load
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              target.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <div className={`${channel.avatar_url ? 'hidden' : ''} w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xs sm:text-sm`}>
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                        {isSelected && (
                          <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
                        )}
                      </div>
                      
                      {/* Channel Name */}
                      <span className="font-medium whitespace-nowrap max-w-[100px] sm:max-w-none truncate">{displayName}</span>
                      
                      {/* Selected Indicator */}
                      {isSelected && (
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-lg pointer-events-none"></div>
                      )}
                    </Button>
                  )
                })}
              </div>
              {hasActiveFilters && (
                <div className="mt-3 sm:mt-4 text-xs sm:text-sm text-gray-400 bg-purple-800/20 rounded-lg p-2 sm:p-3 border border-purple-700/30">
                  <div className="flex items-start sm:items-center gap-2">
                    <Filter className="h-3 w-3 sm:h-4 sm:w-4 text-purple-400 flex-shrink-0 mt-0.5 sm:mt-0" />
                    <span>
                      Showing only: {selectedChannels.map(channelId => {
                        const channel = getAvailableChannels().find(c => c.id === channelId)
                        return channel?.custom_display_name || channel?.channel_name || 'Unknown'
                      }).join(', ')}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Main Content Sections */}
        <div className="space-y-8 sm:space-y-10 md:space-y-12">
          {/* Live Now Section */}
          {liveStreams.length > 0 && (
            <section>
              <div className="flex items-center mb-4 sm:mb-6">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="absolute inset-0 bg-red-600/50 rounded-full blur-xl animate-pulse"></div>
                    <div className="relative p-2 sm:p-3 rounded-full bg-gradient-to-br from-red-600 to-red-700 shadow-2xl">
                      <Radio className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-fredoka font-bold text-white">
                    <span className="hidden sm:inline">🔴 </span>Live Now
                  </h2>
                </div>
                <div className="ml-2 sm:ml-4 bg-red-600/20 text-red-400 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-medium animate-pulse">
                  {liveStreams.length} Streaming
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {liveStreams.map(stream => (
                  <VideoCard key={stream.id} stream={stream} isLive={true} />
                ))}
              </div>
            </section>
          )}

          {/* Coming Up Section */}
          {upcomingStreams.length > 0 && (
            <section>
              <div className="flex items-center mb-4 sm:mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 sm:p-3 rounded-full bg-gradient-to-br from-green-600 to-emerald-600 shadow-lg">
                    <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-fredoka font-bold text-white">
                    <span className="hidden sm:inline">🚀 </span>Coming Up
                  </h2>
                </div>
                <div className="ml-2 sm:ml-4 bg-green-600/20 text-green-400 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-medium">
                  Next 24 Hours
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {upcomingStreams.map(stream => (
                  <VideoCard key={stream.id} stream={stream} />
                ))}
              </div>
            </section>
          )}

          {/* Weekly Schedule Section */}
          {scheduleData && (scheduleData.channels.length > 0 || scheduleData.scheduleSlots.length > 0) && (
            <section>
              <div className="flex items-center mb-4 sm:mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 sm:p-3 rounded-full bg-gradient-to-br from-blue-600 to-cyan-600 shadow-lg">
                    <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-fredoka font-bold text-white">
                    <span className="hidden sm:inline">📅 </span>Weekly Schedule
                  </h2>
                </div>
                <div className="ml-2 sm:ml-4 bg-blue-600/20 text-blue-400 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-medium">
                  This Week's Shows
                </div>
              </div>
              
              <Card className="bg-gray-800/40 border-gray-700/50 overflow-hidden">
                <CardContent className="p-0">
                  <WeeklyScheduleTable 
                    channels={scheduleData.channels}
                    scheduleSlots={scheduleData.scheduleSlots}
                    liveStreams={weeklyStreams}
                    selectedChannels={selectedChannels}
                  />
                </CardContent>
              </Card>
              
              {/* Legend */}
              <div className="flex flex-wrap gap-2 sm:gap-4 mt-3 sm:mt-4 text-xs sm:text-sm">
                <div className="flex items-center gap-2">
                  <Badge className="bg-red-600 text-white text-[10px] sm:text-xs animate-pulse">Time</Badge>
                  <span className="text-gray-400">Live Now</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-600 text-white text-[10px] sm:text-xs">Time</Badge>
                  <span className="text-gray-400">Completed Stream</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-yellow-600 text-white text-[10px] sm:text-xs">Time</Badge>
                  <span className="text-gray-400">Scheduled Stream</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-300 font-medium">Time</span>
                  <span className="text-gray-400">Regular Schedule</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600 italic">TBD</span>
                  <span className="text-gray-400">To Be Determined</span>
                </div>
              </div>
            </section>
          )}

          {/* Catch the Replay Section */}
          {replayStreams.length > 0 && (
            <section>
              <div className="flex items-center mb-4 sm:mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 sm:p-3 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 shadow-lg">
                    <Play className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-fredoka font-bold text-white">
                    <span className="hidden sm:inline">🎬 </span>Catch the Replay
                  </h2>
                </div>
                <div className="ml-2 sm:ml-4 bg-purple-600/20 text-purple-400 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-medium">
                  Last 3 Days
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {replayStreams.map(stream => (
                  <VideoCard key={stream.id} stream={stream} />
                ))}
              </div>
            </section>
          )}

          {/* No Content Message */}
          {liveStreams.length === 0 && replayStreams.length === 0 && (!scheduleData || scheduleData.channels.length === 0) && !isLoading && (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gray-800/50 mb-6">
                <Tv className="h-12 w-12 text-gray-600" />
              </div>
              <h3 className="text-xl sm:text-2xl font-fredoka font-bold text-gray-400 mb-2">No Shows Available</h3>
              <p className="text-sm sm:text-base text-gray-500">Check back later for upcoming streams and replays</p>
            </div>
          )}
        </div>

        {/* Status indicator */}
        <div className="flex justify-center mt-8 sm:mt-12 mb-6 sm:mb-8">
          <div className="bg-slate-700/50 border border-slate-600/70 text-xs sm:text-sm text-slate-300 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full flex items-center shadow-lg">
            <span className="h-2.5 w-2.5 bg-green-500 rounded-full mr-2.5 animate-pulse"></span>
            Schedule updated: {scheduleData ? new Date(scheduleData.lastUpdated).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Loading...'}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Schedule;