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
  Eye, 
  Tv, 
  Radio,
  Play,
  TrendingUp,
  Activity,
  Filter,
  X
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
  return new Date(dateString).toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    timeZoneName: 'short'
  })
}

const formatDuration = (start: string | null, end: string | null): string => {
  if (!start) return ""
  if (!end) return `${formatTime(start)} - Live`
  
  const startTime = new Date(start)
  const endTime = new Date(end)
  return `${formatTime(start)} - ${endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
}

const getStatusBadge = (status: string | null) => {
  switch (status) {
    case 'live':
      return <Badge className="bg-red-500 text-white animate-pulse border-red-600">🔴 LIVE</Badge>
    case 'upcoming':
      return <Badge className="bg-blue-500 text-white border-blue-600">📅 Scheduled</Badge>
    case 'completed':
      return <Badge className="bg-gray-500 text-white border-gray-600">✅ Completed</Badge>
    default:
      return <Badge className="bg-gray-600 text-white border-gray-700">❓ Unknown</Badge>
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

const Schedule: React.FC = () => {
  const [currentDay, setCurrentDay] = useState<string>(getDayName(new Date()));
  const [includeRecent, setIncludeRecent] = useState(false);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);

  // Fetch schedule data
  const { data: scheduleData, isLoading, isError, error, refetch } = useQuery<ScheduleData>({
    queryKey: ['schedule', includeRecent],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-schedule', {
        body: {
          includeRecent,
          daysAhead: 7,
          hoursBack: 24
        }
      })

      if (error) throw error
      return data
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: (data) => {
      // Refetch more frequently if there are live streams
      return data?.stats?.liveNow > 0 ? 2 * 60 * 1000 : 10 * 60 * 1000 // 2 min if live, 10 min otherwise
    }
  })


  // Handle tab changes
  const handleTabChange = (value: string) => {
    setCurrentDay(value);
  };

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


  // Get shows for the selected day with filtering
  const getShowsForDay = (day: string): (ScheduleSlot | LiveStream)[] => {
    if (!scheduleData) return []

    // Calculate target date based on current day selection
    const today = new Date()
    const daysOfWeek = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const targetDayIndex = daysOfWeek.indexOf(day);
    const currentDayIndex = today.getDay();
    const difference = targetDayIndex - currentDayIndex;
    
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + difference);
    const targetDayOfWeek = targetDate.getDay()

    // Get schedule slots for this day
    let slotsForDay = scheduleData.scheduleSlots.filter(slot => {
      if (slot.specific_date) {
        const slotDate = new Date(slot.specific_date)
        return slotDate.toDateString() === targetDate.toDateString()
      }
      return slot.day_of_week && slot.day_of_week.includes(targetDayOfWeek)
    })

    // Get live streams for this day
    let streamsForDay = scheduleData.liveStreams.filter(stream => {
      if (!stream.scheduled_start_time_utc) return false
      const streamDate = new Date(stream.scheduled_start_time_utc)
      return streamDate.toDateString() === targetDate.toDateString()
    })

    // Apply channel filters if any are selected
    if (selectedChannels.length > 0) {
      slotsForDay = slotsForDay.filter(slot => 
        selectedChannels.includes(slot.youtube_channel_id)
      )
      streamsForDay = streamsForDay.filter(stream => 
        selectedChannels.includes(stream.youtube_channel_id)
      )
    }

    return [...slotsForDay, ...streamsForDay].sort((a, b) => {
      const timeA = 'default_start_time_utc' in a ? a.default_start_time_utc : a.scheduled_start_time_utc
      const timeB = 'default_start_time_utc' in b ? b.default_start_time_utc : b.scheduled_start_time_utc
      
      if (!timeA && !timeB) return 0
      if (!timeA) return 1
      if (!timeB) return -1
      
      return timeA.localeCompare(timeB)
    })
  }

  if (isError) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-b from-lolcow-black to-lolcow-darkgray text-white">
        <Navbar />
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="p-4 rounded-lg bg-red-500/20 mb-4 inline-block">
              <Tv className="h-16 w-16 text-red-400 mx-auto mb-4" />
            </div>
            <h1 className="text-3xl font-fredoka mb-4 text-red-400">Schedule Unavailable</h1>
            <p className="text-gray-300 mb-4">{error?.message || 'Failed to load schedule data'}</p>
            <Button onClick={() => refetch()} className="bg-lolcow-blue hover:bg-lolcow-blue/80">
              Try Again
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const currentShows = getShowsForDay(currentDay)
  const daysOfWeek = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-lolcow-black to-lolcow-darkgray text-white">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-8">
        <ScheduleHeader 
          includeRecent={includeRecent}
          onToggleRecent={() => setIncludeRecent(!includeRecent)}
          stats={scheduleData?.stats}
        />

        {/* Stats Row */}
        {scheduleData && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-800/40 to-blue-900/60 rounded-xl px-6 py-5 border border-blue-700/40 shadow-lg backdrop-blur-sm hover:from-blue-700/50 hover:to-blue-800/70 transition-all duration-300">
              <div className="flex items-center">
                <div className="p-3 rounded-xl bg-blue-500/20 mr-4">
                  <Tv className="h-7 w-7 text-blue-400" />
                </div>
                <div>
                  <div className="text-3xl font-bold text-white mb-1">{scheduleData.stats.totalChannels}</div>
                  <div className="text-sm font-medium text-blue-300 uppercase tracking-wider">Channels</div>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-red-800/40 to-red-900/60 rounded-xl px-6 py-5 border border-red-700/40 shadow-lg backdrop-blur-sm hover:from-red-700/50 hover:to-red-800/70 transition-all duration-300">
              <div className="flex items-center">
                <div className="p-3 rounded-xl bg-red-500/20 mr-4">
                  <Radio className="h-7 w-7 text-red-400" />
                </div>
                <div>
                  <div className="text-3xl font-bold text-white mb-1">{scheduleData.stats.liveNow}</div>
                  <div className="text-sm font-medium text-red-300 uppercase tracking-wider">Live Now</div>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-800/40 to-purple-900/60 rounded-xl px-6 py-5 border border-purple-700/40 shadow-lg backdrop-blur-sm hover:from-purple-700/50 hover:to-purple-800/70 transition-all duration-300">
              <div className="flex items-center">
                <div className="p-3 rounded-xl bg-purple-500/20 mr-4">
                  <Activity className="h-7 w-7 text-purple-400" />
                </div>
                <div>
                  <div className="text-3xl font-bold text-white mb-1">{scheduleData.stats.upcomingToday}</div>
                  <div className="text-sm font-medium text-purple-300 uppercase tracking-wider">Today</div>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-800/40 to-green-900/60 rounded-xl px-6 py-5 border border-green-700/40 shadow-lg backdrop-blur-sm hover:from-green-700/50 hover:to-green-800/70 transition-all duration-300">
              <div className="flex items-center">
                <div className="p-3 rounded-xl bg-green-500/20 mr-4">
                  <TrendingUp className="h-7 w-7 text-green-400" />
                </div>
                <div>
                  <div className="text-3xl font-bold text-white mb-1">{scheduleData.stats.totalSlots}</div>
                  <div className="text-sm font-medium text-green-300 uppercase tracking-wider">Shows</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filter Section */}
        {scheduleData && getAvailableChannels().length > 0 && (
          <Card className="bg-gradient-to-br from-gray-800/40 to-gray-900/60 border border-gray-700/50 shadow-lg mb-6">
            <CardHeader className="pb-4">
              <CardTitle className="font-fredoka text-white flex items-center justify-between">
                <div className="flex items-center">
                  <div className="p-2 rounded-lg bg-purple-500/20 mr-3">
                    <Filter className="h-5 w-5 text-purple-400" />
                  </div>
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-white font-bold">
                    Filter by Channel
                  </span>
                </div>
                {hasActiveFilters && (
                  <Button
                    onClick={clearAllFilters}
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:text-white hover:bg-gray-600/50"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear All
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {getAvailableChannels().map((channel) => {
                  const isSelected = selectedChannels.includes(channel.youtube_channel_id)
                  const displayName = channel.custom_display_name || channel.channel_name || 'Unknown Channel'
                  
                  return (
                    <Button
                      key={channel.youtube_channel_id}
                      onClick={() => toggleChannelFilter(channel.youtube_channel_id)}
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      className={`flex items-center gap-2 transition-all ${
                        isSelected 
                          ? 'bg-purple-600 hover:bg-purple-700 text-white border-purple-600' 
                          : 'border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white hover:border-gray-500'
                      }`}
                    >
                      <Tv className="h-4 w-4" />
                      {displayName}
                      {isSelected && (
                        <div className="h-2 w-2 bg-white rounded-full ml-1"></div>
                      )}
                    </Button>
                  )
                })}
              </div>
              {hasActiveFilters && (
                <div className="mt-4 text-sm text-gray-400 bg-purple-800/20 rounded-lg p-3 border border-purple-700/30">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-purple-400" />
                    <span>
                      Showing only: {selectedChannels.map(channelId => {
                        const channel = getAvailableChannels().find(c => c.youtube_channel_id === channelId)
                        return channel?.custom_display_name || channel?.channel_name || 'Unknown'
                      }).join(', ')}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="mb-8">
          <Card className="bg-gray-800/30 border border-gray-700/50 shadow-lg">
            <CardHeader>
              <CardTitle className="font-fredoka text-white flex items-center justify-between">
                <div className="flex items-center">
                  <Play className="mr-2 h-5 w-5 text-blue-500" />
                  <span>
                    Daily Schedule
                  </span>
                </div>
                {isLoading && <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={currentDay} onValueChange={handleTabChange} className="w-full">
                <TabsList className="grid grid-cols-7 mb-6 bg-gray-700/50 border border-gray-600/50">
                  {daysOfWeek.map(day => (
                    <TabsTrigger 
                      key={day}
                      value={day}
                      className="text-xs md:text-sm data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                    >
                      {formatDayTitle(day).slice(0, 3)}
                    </TabsTrigger>
                  ))}
                </TabsList>
                
                {daysOfWeek.map(day => (
                  <TabsContent key={day} value={day} className="space-y-4">
                    {isLoading ? (
                      <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="p-6 border border-gray-700/50 rounded-xl animate-pulse bg-gray-800/20">
                            <div className="h-6 bg-gray-700 rounded mb-3"></div>
                            <div className="h-4 bg-gray-800 rounded mb-2"></div>
                            <div className="h-4 bg-gray-800 rounded w-3/4"></div>
                          </div>
                        ))}
                      </div>
                    ) : currentShows.length === 0 ? (
                      <div className="text-center py-12 text-gray-400 bg-gray-800/20 rounded-xl border border-gray-700/30">
                        <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
                        <p className="text-xl font-medium">No Shows Scheduled</p>
                        <p className="text-sm mt-2">Check back later or try a different day</p>
                      </div>
                    ) : (
                      currentShows.map((item, index) => {
                        const isLiveStream = 'video_id' in item
                        const liveStream = isLiveStream ? item as LiveStream : null
                        const scheduleSlot = !isLiveStream ? item as ScheduleSlot : null

                        return (
                          <div 
                            key={isLiveStream ? liveStream!.id : scheduleSlot!.id} 
                            className="p-6 border border-gray-700/50 rounded-xl hover:bg-gray-800/30 transition-all bg-gray-800/20 shadow-lg"
                          >
                            <div className="flex flex-col md:flex-row md:items-start md:justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-3">
                                  <div className="p-2 rounded-lg bg-blue-500/20">
                                    {isLiveStream && liveStream!.status === 'live' ? (
                                      <Radio className="h-5 w-5 text-red-500" />
                                    ) : (
                                      <Tv className="h-5 w-5 text-blue-500" />
                                    )}
                                  </div>
                                  <h3 className="text-xl font-bold text-white">
                                    {isLiveStream ? liveStream!.title : scheduleSlot!.fallback_title || 'Scheduled Show'}
                                  </h3>
                                  {isLiveStream && getStatusBadge(liveStream!.status)}
                                </div>
                                
                                <div className="flex items-center text-gray-300 mb-3">
                                  <Clock className="h-4 w-4 mr-2 text-blue-400" />
                                  <span className="font-medium">
                                    {isLiveStream ? 
                                      formatDuration(liveStream!.scheduled_start_time_utc, liveStream!.actual_end_time_utc) :
                                      formatTime(scheduleSlot!.default_start_time_utc)
                                    }
                                  </span>
                                  {isLiveStream && liveStream!.scheduled_vs_actual_diff && (
                                    <span className="ml-3 text-yellow-400 text-sm bg-yellow-400/10 px-2 py-1 rounded">
                                      {liveStream!.scheduled_vs_actual_diff} difference
                                    </span>
                                  )}
                                </div>

                                <div className="bg-gray-700/30 rounded-lg p-3 mb-3">
                                  <p className="text-gray-300 text-sm">
                                    <span className="text-blue-400 font-medium">Channel:</span>{' '}
                                    {isLiveStream ? 
                                      (liveStream!.channel?.custom_display_name || liveStream!.channel?.channel_name || 'Unknown') :
                                      (scheduleSlot!.channel?.custom_display_name || scheduleSlot!.channel?.channel_name || 'Unknown')
                                    }
                                  </p>
                                </div>

                                {isLiveStream && liveStream!.description && (
                                  <p className="text-gray-300 text-sm line-clamp-2 bg-gray-700/20 p-3 rounded-lg">
                                    {liveStream!.description}
                                  </p>
                                )}

                                {!isLiveStream && scheduleSlot!.notes && (
                                  <p className="text-gray-300 text-sm bg-gray-700/20 p-3 rounded-lg">
                                    {scheduleSlot!.notes}
                                  </p>
                                )}
                              </div>

                              <div className="flex flex-col gap-3 mt-4 md:mt-0 md:ml-6">
                                {isLiveStream && liveStream!.view_count && (
                                  <div className="flex items-center text-gray-400 text-sm bg-gray-700/30 px-3 py-2 rounded-lg">
                                    <Eye className="h-4 w-4 mr-2" />
                                    <span className="font-medium">{liveStream!.view_count.toLocaleString()} views</span>
                                  </div>
                                )}

                                {isLiveStream && liveStream!.stream_url && (
                                  <Button
                                    className="bg-red-600 hover:bg-red-700 text-white shadow-lg"
                                    onClick={() => window.open(liveStream!.stream_url!, '_blank')}
                                  >
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    Watch Stream
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Status indicator like leaderboard */}
        <div className="flex justify-center mb-8">
          <div className="bg-slate-700/50 border border-slate-600/70 text-sm text-slate-300 px-4 py-2 rounded-full flex items-center">
            <span className="h-2.5 w-2.5 bg-green-500 rounded-full mr-2.5"></span>
            Schedule updated: {scheduleData ? new Date(scheduleData.lastUpdated).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Loading...'}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Schedule;