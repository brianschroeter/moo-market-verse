import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, Radio, Clock, ChevronRight, Play, Tv, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { getProxiedImageUrl, getImageWithFallback } from "@/utils/imageProxy";

interface LiveStream {
  id: string;
  video_id: string;
  youtube_channel_id: string;
  title: string | null;
  thumbnail_url: string | null;
  scheduled_start_time_utc: string | null;
  actual_start_time_utc: string | null;
  status: string | null;
  youtube_channels: {
    channel_name: string | null;
    custom_display_name: string | null;
    avatar_url: string | null;
  };
}

const formatTimeUntil = (dateString: string): string => {
  const now = new Date();
  const scheduled = new Date(dateString);
  const diff = scheduled.getTime() - now.getTime();
  
  if (diff < 0) return "Starting soon";
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `in ${days} day${days > 1 ? 's' : ''}`;
  }
  if (hours > 0) {
    return `in ${hours}h ${minutes}m`;
  }
  return `in ${minutes}m`;
};

const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  }).replace(' ', '\u00A0');
};

const ScheduleTeaser: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = React.useRef<HTMLDivElement>(null);

  // Fetch today's live and upcoming streams
  const { data: streams, isLoading } = useQuery({
    queryKey: ['schedule-teaser'],
    queryFn: async () => {
      const now = new Date();
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('live_streams')
        .select(`
          id,
          video_id,
          youtube_channel_id,
          title,
          thumbnail_url,
          scheduled_start_time_utc,
          actual_start_time_utc,
          status,
          youtube_channels!inner (
            channel_name,
            custom_display_name,
            avatar_url
          )
        `)
        .or(`status.eq.live,and(status.eq.upcoming,scheduled_start_time_utc.gte.${startOfDay.toISOString()},scheduled_start_time_utc.lte.${endOfDay.toISOString()})`)
        .order('scheduled_start_time_utc', { ascending: true });

      if (error) throw error;

      return data as LiveStream[];
    },
    refetchInterval: 30 * 1000, // 30 seconds
  });

  // Intersection observer for animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, []);

  const liveStreams = streams?.filter(s => s.status === 'live') || [];
  const upcomingStreams = streams?.filter(s => s.status === 'upcoming') || [];

  return (
    <div 
      ref={sectionRef}
      className={`relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${isVisible ? 'reveal-on-scroll revealed' : 'reveal-on-scroll'}`}
    >
      {/* Section header */}
      <div className="flex items-center justify-between mb-8 animate-on-scroll fade-up">
        <div className="flex items-center gap-4">
          <Calendar className="h-8 w-8 text-lolcow-blue animated-icon" />
          <h2 className="text-3xl lg:text-4xl font-fredoka text-white">
            Today's Schedule
          </h2>
          <Tv className="h-8 w-8 text-lolcow-red animated-icon" style={{ animationDelay: '-1.5s' }} />
        </div>
        
        <Link 
          to="/schedule" 
          className="btn-outline group inline-flex items-center gap-2"
        >
          <span>View Full Schedule</span>
          <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      {/* Live Now Banner */}
      {liveStreams.length > 0 && (
        <div className="mb-6 animate-on-scroll fade-up">
          <div className="discord-glass rounded-xl p-6 border border-red-500/30 bg-gradient-to-br from-red-500/10 to-transparent">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative">
                <Radio className="h-6 w-6 text-red-500" />
                <div className="absolute inset-0 w-6 h-6 bg-red-500 rounded-full animate-ping opacity-30" />
              </div>
              <h3 className="text-xl font-semibold text-white">Live Now</h3>
              <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                {liveStreams.length} LIVE
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {liveStreams.slice(0, 2).map((stream, index) => (
                <Link
                  key={stream.id}
                  to={`https://youtube.com/watch?v=${stream.video_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex gap-4 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-all"
                >
                  {/* Thumbnail */}
                  <div className="relative w-24 h-16 rounded overflow-hidden flex-shrink-0">
                    <img 
                      {...getImageWithFallback(
                        stream.thumbnail_url,
                        'https://via.placeholder.com/320x180?text=Live+Stream'
                      )}
                      alt={stream.title || 'Stream'}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Play className="h-6 w-6 text-white opacity-80 group-hover:scale-110 transition-transform" />
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {stream.title || 'Live Stream'}
                    </p>
                    <p className="text-xs text-gray-400 flex items-center gap-2 mt-1">
                      <img 
                        src={getProxiedImageUrl(stream.youtube_channels.avatar_url || '')}
                        alt={stream.youtube_channels.channel_name || ''}
                        className="w-4 h-4 rounded-full"
                      />
                      {stream.youtube_channels.custom_display_name || stream.youtube_channels.channel_name}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Upcoming Streams */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-on-scroll fade-up">
        {isLoading ? (
          // Loading skeletons
          [1, 2, 3].map((i) => (
            <div key={i} className="discord-glass rounded-lg p-4 h-24 animate-pulse">
              <div className="h-4 bg-white/10 rounded w-3/4 mb-2" />
              <div className="h-3 bg-white/10 rounded w-1/2" />
            </div>
          ))
        ) : upcomingStreams.length > 0 ? (
          upcomingStreams.slice(0, 3).map((stream, index) => (
            <div
              key={stream.id}
              className="discord-glass rounded-lg p-4 hover:bg-white/5 transition-all animate-on-scroll fade-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <img 
                    src={getProxiedImageUrl(stream.youtube_channels.avatar_url || '')}
                    alt={stream.youtube_channels.channel_name || ''}
                    className="w-10 h-10 rounded-full"
                  />
                  <div>
                    <p className="text-sm font-medium text-white">
                      {stream.youtube_channels.custom_display_name || stream.youtube_channels.channel_name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatTime(stream.scheduled_start_time_utc!)}
                    </p>
                  </div>
                </div>
                <Badge className="bg-lolcow-blue/20 text-lolcow-blue border-lolcow-blue/30 text-xs">
                  {formatTimeUntil(stream.scheduled_start_time_utc!)}
                </Badge>
              </div>
              
              <p className="text-sm text-gray-300 truncate">
                {stream.title || 'Upcoming Stream'}
              </p>
            </div>
          ))
        ) : (
          <div className="col-span-3 text-center py-8 text-gray-400">
            <Tv className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No more streams scheduled for today</p>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="flex items-center justify-center gap-6 mt-6 text-sm text-gray-400 animate-on-scroll fade-up">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          <span>9 Channels</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <span>Updated every 30s</span>
        </div>
      </div>
    </div>
  );
};

export default ScheduleTeaser;