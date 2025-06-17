import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Trophy, TrendingUp, ChevronRight, Crown, DollarSign, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface LeaderboardItem {
  channel_name: string;
  total_amount: number;
  rank: number;
}

const channelDisplayMap: Record<string, string> = {
  LolcowLive: "Lolcow Live",
  LolcowQueens: "Lolcow Queens",
  LolcowRewind: "Lolcow Rewind",
  LolcowMilkers: "Lolcow Milkers",
  LolcowNerd: "Lolcow Nerds",
  LolcowCafe: "Lolcow Cafe",
};

const formatChannelName = (name: string): string => {
  return channelDisplayMap[name] || name;
};

const LeaderboardTeaser: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = React.useRef<HTMLDivElement>(null);

  // Fetch top 3 superchat leaders for current month
  const { data: leaders, isLoading } = useQuery({
    queryKey: ['leaderboard-teaser'],
    queryFn: async () => {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();

      const { data, error } = await supabase
        .rpc('sum_donations_by_channel_for_month_year', {
          p_month: String(currentMonth).padStart(2, '0'),
          p_year: String(currentYear)
        });

      if (error) throw error;

      // Take top 3 and assign ranks
      const sorted = (data || [])
        .slice(0, 3)
        .map((item: any, index: number) => ({
          channel_name: item.channel_name,
          total_amount: parseFloat(item.total_donations_sum) || 0,
          rank: index + 1
        }));

      return sorted;
    },
    refetchInterval: 2 * 60 * 1000, // 2 minutes
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

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-6 w-6 text-yellow-400" />;
      case 2:
        return <Trophy className="h-5 w-5 text-gray-300" />;
      case 3:
        return <Trophy className="h-5 w-5 text-orange-600" />;
      default:
        return null;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "from-yellow-500/20 to-yellow-600/20 border-yellow-500/50";
      case 2:
        return "from-gray-400/20 to-gray-500/20 border-gray-400/50";
      case 3:
        return "from-orange-500/20 to-orange-600/20 border-orange-500/50";
      default:
        return "from-lolcow-lightgray/20 to-lolcow-darkgray/20";
    }
  };

  return (
    <div 
      ref={sectionRef}
      className={`relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${isVisible ? 'reveal-on-scroll revealed' : 'reveal-on-scroll'}`}
    >
      {/* Section header */}
      <div className="flex items-center justify-between mb-8 animate-on-scroll fade-up">
        <div className="flex items-center gap-4">
          <Trophy className="h-8 w-8 text-yellow-400 animated-icon" />
          <h2 className="text-3xl lg:text-4xl font-fredoka text-white">
            Top Shows
          </h2>
          <Sparkles className="h-8 w-8 text-lolcow-red animated-icon" style={{ animationDelay: '-1.5s' }} />
        </div>
        
        <Link 
          to="/leaderboard" 
          className="btn-outline group inline-flex items-center gap-2"
        >
          <span>View Full Leaderboard</span>
          <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      {/* Top 3 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {isLoading ? (
          // Loading skeletons
          [1, 2, 3].map((i) => (
            <div key={i} className="discord-glass rounded-xl p-6 h-32 animate-pulse">
              <div className="h-4 bg-white/10 rounded w-3/4 mb-4" />
              <div className="h-6 bg-white/10 rounded w-1/2" />
            </div>
          ))
        ) : (
          leaders?.map((leader, index) => (
            <div
              key={leader.channel_name}
              className={`discord-glass rounded-xl p-6 border bg-gradient-to-br ${getRankColor(leader.rank)} 
                transform transition-all duration-300 hover:scale-105 animate-on-scroll fade-up glass-shimmer`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {getRankIcon(leader.rank)}
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Rank #{leader.rank}</p>
                    <h3 className="text-lg font-semibold text-white">
                      {formatChannelName(leader.channel_name)}
                    </h3>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-400" />
                <span className="text-2xl font-bold text-white counter-pop">
                  ${leader.total_amount.toLocaleString()}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Quick Stats Bar */}
      <div className="discord-glass rounded-xl p-4 animate-on-scroll fade-up">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <TrendingUp className="h-5 w-5 text-lolcow-blue" />
            <p className="text-gray-300">
              Total Superchats This Month: 
              <span className="text-white font-bold ml-2">
                ${leaders?.reduce((sum, leader) => sum + leader.total_amount, 0).toLocaleString() || '0'}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span>Updated live</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaderboardTeaser;