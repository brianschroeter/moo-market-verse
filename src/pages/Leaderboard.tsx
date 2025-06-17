import React, { useState, useEffect, useRef } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import SmoothScroll from "@/components/SmoothScroll";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import LeaderboardTabs from "@/components/LeaderboardTabs";
import SuperchatsTab from "@/components/SuperchatsTab";
import GiftedMembersTab from "@/components/GiftedMembersTab";
import BreakdownTab from "@/components/BreakdownTab";
import LeaderboardHeader from "@/components/LeaderboardHeader";
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent 
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Award, Star, TrendingUp, Users, Trophy, Crown, DollarSign, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useScrollAnimation, useParallax, useStaggeredAnimation, usePageLoader, useTextReveal } from "@/hooks/useScrollAnimation";
import "@/styles/animations.css";
import "@/styles/micro-interactions.css";
import "@/styles/leaderboard.css";

// Define types for our fetched and processed data
interface SuperchatLeaderboardItem { // Renamed for clarity
  id: string; 
  rank: number;
  show: string; 
  host: string; 
  amount: number;
}

interface GiftedMembershipLeaderboardItem { // New interface for gifted memberships
  id: string;
  rank: number;
  show: string;
  host: string; // Will be removed from display but kept in data for now
  amount: number; // Total gifted memberships
}

interface MembershipBreakdownItem { // New interface for membership breakdown
  id: string; // channel_name
  rank: number;
  show: string; // channel_name
  host: string; // channel_name
  crownCount: number;
  paypigCount: number;
  cashCowCount: number;
  totalMembers: number;
}

// Map for channel display names and YouTube URLs
const channelDisplayMap: Record<string, { displayName: string; url: string }> = {
  LolcowLive: { displayName: "Lolcow Live", url: "https://www.youtube.com/@LolcowLive" },
  LolcowQueens: { displayName: "Lolcow Queens", url: "https://www.youtube.com/@LolcowQueens" },
  LolcowRewind: { displayName: "Lolcow Rewind", url: "https://www.youtube.com/@LolcowRewind" },
  LolcowMilkers: { displayName: "Lolcow Milkers", url: "https://www.youtube.com/@LolcowMilkers" },
  LolcowNerd: { displayName: "Lolcow Nerds", url: "https://www.youtube.com/@LolcowNerd" }, // Note: Nerds (plural)
  LolcowCafe: { displayName: "Lolcow Cafe", url: "https://www.youtube.com/@LolcowCafe" },
  LolcowTest: { displayName: "Lolcow Test", url: "https://www.youtube.com/@LolcowTest" },
  LolcowAussy: { displayName: "Lolcow Aussy", url: "https://www.youtube.com/@LolcowAussy" },
  LolcowTechTalk: { displayName: "Lolcow Tech Talk", url: "https://www.youtube.com/@LolcowTechTalk" },
  // Add other specific mappings if needed
};

// Helper function to get display name and URL
const formatShowDisplay = (rawChannelName: string): { displayName: string; url?: string } => {
  if (channelDisplayMap[rawChannelName]) {
    return channelDisplayMap[rawChannelName];
  }
  // Fallback for channel names not in the map (e.g., if new ones appear)
  // Simple formatting: add a space if it starts with Lolcow and has a capital letter following.
  if (rawChannelName.startsWith("Lolcow") && rawChannelName.length > 6) {
    const parts = rawChannelName.match(/^Lolcow([A-Z][a-z]*.*)$/);
    if (parts && parts[1]) {
      return { displayName: `Lolcow ${parts[1]}`, url: `https://www.youtube.com/@${rawChannelName}` };
    }
  }
  return { displayName: rawChannelName, url: `https://www.youtube.com/@${rawChannelName}` }; // Default link even if not perfectly formatted
};

// Consolidated and corrected Chart config
const chartConfig = {
  amount: { label: "Amount ($)", theme: { light: "#3b82f6", dark: "#3b82f6" } }, 
  gifts: { label: "Gifts", theme: { light: "#8b5cf6", dark: "#8b5cf6" } }, 
  crown: { label: "Crown", theme: { light: "#f59e0b", dark: "#f59e0b" } }, 
  paypig: { label: "Pay Pig", theme: { light: "#84cc16", dark: "#84cc16" } }, 
  cashCow: { label: "Cash Cow", theme: { light: "#0ea5e9", dark: "#0ea5e9" } }, 
};

const formatCurrency = (value: number): string => {
  return `$${value.toLocaleString()}`;
};

// Updated ChartDataItem to support both superchat and membership chart structures
type ChartDataItem = {
  name: string;
  amount?: number;   
  gifts?: number;    
  crown?: number;    
  paypig?: number;   
  cashCow?: number;  
};

const Leaderboard: React.FC = () => {
  const [tabValue, setTabValue] = useState<"superchats" | "gifted" | "breakdown">("superchats");
  const [showPriorMonth, setShowPriorMonth] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Animation hooks
  const isPageLoading = usePageLoader(1500);
  const heroRef = useScrollAnimation({ threshold: 0.1 });
  const heroTitleRef = useTextReveal();
  const statsRef = useStaggeredAnimation(3, { threshold: 0.2 });
  const contentRef = useScrollAnimation({ threshold: 0.1 });
  const parallaxHeroRef = useParallax(0.3);
  const parallaxBgRef = useParallax(0.5);
  
  const [superchatsData, setSuperchatsData] = useState<SuperchatLeaderboardItem[]>([]);
  const [giftedMembershipsData, setGiftedMembershipsData] = useState<GiftedMembershipLeaderboardItem[]>([]); // New state for gifted
  const [membershipsByLevelData, setMembershipsByLevelData] = useState<MembershipBreakdownItem[]>([]);
  const [chartData, setChartData] = useState<ChartDataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Animated background effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const animate = () => {
      time += 0.001;
      
      ctx.fillStyle = 'rgba(18, 18, 18, 0.02)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw leaderboard-themed gradient orbs
      const drawLeaderboardOrb = (x: number, y: number, size: number, opacity: number, color: string) => {
        const offsetX = Math.sin(time * 0.5) * 30;
        const offsetY = Math.cos(time * 0.3) * 20;
        
        const gradient = ctx.createRadialGradient(
          x + offsetX, y + offsetY, 0,
          x + offsetX, y + offsetY, size
        );
        gradient.addColorStop(0, color.replace('rgb', 'rgba').replace(')', `, ${opacity})`));
        gradient.addColorStop(0.5, color.replace('rgb', 'rgba').replace(')', `, ${opacity * 0.5})`));
        gradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x + offsetX, y + offsetY, size, 0, Math.PI * 2);
        ctx.fill();
      };

      // Draw multiple orbs with trophy colors
      drawLeaderboardOrb(canvas.width * 0.2, canvas.height * 0.3, 150, 0.1, 'rgb(251, 191, 36)');
      drawLeaderboardOrb(canvas.width * 0.8, canvas.height * 0.7, 200, 0.08, 'rgb(209, 213, 219)');
      drawLeaderboardOrb(canvas.width * 0.5, canvas.height * 0.5, 100, 0.12, 'rgb(245, 158, 11)');

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      const currentDate = new Date();
      let targetDate = new Date(currentDate);
      
      // If showing prior month, go back one month
      if (showPriorMonth) {
        targetDate.setMonth(targetDate.getMonth() - 1);
      }
      
      const targetMonth = (targetDate.getMonth() + 1).toString().padStart(2, '0');
      const targetYear = targetDate.getFullYear().toString();

      try {
        // Fetch Superchats data
        const { data: superchatsRaw, error: superchatsError } = await supabase
          .rpc('sum_donations_by_channel_for_month_year', { 
            p_month: targetMonth, 
            p_year: targetYear 
          });

        if (superchatsError) throw superchatsError;

        let processedSuperchats: SuperchatLeaderboardItem[] = [];
        if (superchatsRaw) {
            processedSuperchats = superchatsRaw.map((item: any, index: number) => ({
            id: item.channel_name,
            rank: index + 1, // RPC for donations doesn't return rank, so we assign it here.
            show: item.channel_name,
            host: item.channel_name, 
            amount: parseFloat(item.total_donations_sum || 0),
          }));
        }
        setSuperchatsData(processedSuperchats);

        // Fetch Gifted Memberships data
        const { data: giftedRaw, error: giftedError } = await supabase
          .rpc('sum_gifted_memberships_by_channel_for_month_year', {
            p_month: targetMonth,
            p_year: targetYear
          });
        if (giftedError) throw giftedError;
        let processedGifted: GiftedMembershipLeaderboardItem[] = [];
        if (giftedRaw) {
          processedGifted = giftedRaw.map((item: any, index: number) => ({
            id: item.channel_name,
            rank: index + 1, // Assuming RPC orders by sum DESC
            show: item.channel_name,
            host: item.channel_name, // Keep for data consistency if needed elsewhere, will remove from table
            amount: parseInt(item.total_gifted_memberships_sum || 0, 10),
          }));
        }
        setGiftedMembershipsData(processedGifted);

        // Fetch Memberships breakdown data (only if we don't have it yet, since it's not month-specific)
        if (membershipsByLevelData.length === 0) {
          const { data: membershipsRaw, error: membershipsError } = await supabase
            .rpc('get_channel_membership_breakdown'); // No params - always current data

          if (membershipsError) throw membershipsError;
          
          let processedMemberships: MembershipBreakdownItem[] = [];
          if (membershipsRaw) {
             processedMemberships = membershipsRaw.map((item: any) => ({
              id: item.channel_name,
              rank: item.rank, // RPC returns rank
              show: item.channel_name,
              host: item.channel_name, 
              crownCount: item.crown_count || 0,
              paypigCount: item.paypig_count || 0,
              cashCowCount: item.cash_cow_count || 0,
              totalMembers: item.total_members_count || 0,
            }));
          }
          setMembershipsByLevelData(processedMemberships);
        }

        // Set initial chart data (all superchats)
        setChartData(
          processedSuperchats.map(item => ({
            name: item.show,
            amount: item.amount,
          })));

      } catch (err: any) {
        console.error("Error fetching leaderboard data:", err);
        setError(err.message || "Failed to fetch data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [showPriorMonth]);


  const handleTabChange = (value: string) => {
    setTabValue(value as "superchats" | "gifted" | "breakdown");
    
    if (value === "superchats") {
      setChartData(superchatsData.map(item => ({
        name: item.show,
        amount: item.amount,
      })));
    } else if (value === "gifted") {
      setChartData(giftedMembershipsData.map(item => ({ 
        name: item.show, 
        gifts: item.amount 
      })));
    } else if (value === "breakdown") {
      setChartData(membershipsByLevelData.map(item => ({ 
        name: item.show,
        crown: item.crownCount,
        paypig: item.paypigCount,
        cashCow: item.cashCowCount,
      })));
    }
  };

  const handleTogglePriorMonth = () => {
    setShowPriorMonth(!showPriorMonth);
  };

  if (loading) {
    return (
      <>
        {/* Page Loader */}
        {isPageLoading && (
          <div className="page-loader">
            <div className="loader-content">
              <div className="loader-logo">
                <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="50" cy="50" r="40" stroke="url(#gradient)" strokeWidth="4" fill="none" />
                  <path d="M30 50 Q50 30 70 50 Q50 70 30 50" fill="url(#gradient)" />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#FF3366" />
                      <stop offset="50%" stopColor="#FF6B6B" />
                      <stop offset="100%" stopColor="#4ECDC4" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <div className="loader-progress">
                <div className="loader-progress-bar" />
              </div>
            </div>
          </div>
        )}
        
        <div className={`flex flex-col min-h-screen bg-gradient-to-b from-lolcow-black to-lolcow-darkgray text-white justify-center items-center ${isPageLoading ? 'opacity-0' : 'opacity-100'}`} style={{ transition: 'opacity 0.5s ease-out' }}>
          <p className="text-xl font-fredoka">Loading Leaderboard...</p>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        {/* Page Loader */}
        {isPageLoading && (
          <div className="page-loader">
            <div className="loader-content">
              <div className="loader-logo">
                <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="50" cy="50" r="40" stroke="url(#gradient)" strokeWidth="4" fill="none" />
                  <path d="M30 50 Q50 30 70 50 Q50 70 30 50" fill="url(#gradient)" />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#FF3366" />
                      <stop offset="50%" stopColor="#FF6B6B" />
                      <stop offset="100%" stopColor="#4ECDC4" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <div className="loader-progress">
                <div className="loader-progress-bar" />
              </div>
            </div>
          </div>
        )}
        
        <div className={`flex flex-col min-h-screen bg-gradient-to-b from-lolcow-black to-lolcow-darkgray text-white justify-center items-center ${isPageLoading ? 'opacity-0' : 'opacity-100'}`} style={{ transition: 'opacity 0.5s ease-out' }}>
          <p className="text-xl font-fredoka text-lolcow-red">Error: {error}</p>
          <p className="text-sm text-gray-400 mt-2">Please try refreshing the page or check the console for more details.</p>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Page Loader */}
      {isPageLoading && (
        <div className="page-loader">
          <div className="loader-content">
            <div className="loader-logo">
              <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="50" cy="50" r="40" stroke="url(#gradient)" strokeWidth="4" fill="none" />
                <path d="M30 50 Q50 30 70 50 Q50 70 30 50" fill="url(#gradient)" />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FF3366" />
                    <stop offset="50%" stopColor="#FF6B6B" />
                    <stop offset="100%" stopColor="#4ECDC4" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className="loader-progress">
              <div className="loader-progress-bar" />
            </div>
          </div>
        </div>
      )}
      
      <div className={`flex flex-col min-h-screen ${isPageLoading ? 'opacity-0' : 'opacity-100'}`} style={{ transition: 'opacity 0.5s ease-out' }}>
        <SmoothScroll>
          <div className="flex flex-col min-h-screen bg-gradient-to-b from-lolcow-black to-lolcow-darkgray text-white">
            <Navbar />
            
            {/* Hero Section */}
            <section 
              ref={heroRef.ref}
              className={`relative py-24 bg-gradient-to-br from-lolcow-darkgray via-lolcow-black to-lolcow-darkgray overflow-hidden animate-on-scroll fade-up ${heroRef.isInView ? 'in-view' : ''}`}
            >
              {/* Animated Background Canvas */}
              <canvas 
                ref={canvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none opacity-60"
              />
              
              {/* Trophy Pattern */}
              <div className="trophy-pattern" />
              
              {/* Gradient overlay */}
              <div className="absolute inset-0 leaderboard-hero-gradient" />
              
              {/* Leaderboard Mesh */}
              <div className="leaderboard-mesh" />
              
              {/* Parallax Background Elements */}
              <div 
                ref={parallaxHeroRef.ref}
                className="absolute inset-0"
              >
                {/* Floating trophy elements */}
                <Trophy className="absolute top-20 left-[10%] h-16 w-16 text-yellow-500/30 floating-trophy" />
                <Award className="absolute top-32 right-[15%] h-12 w-12 text-gray-400/30 floating-trophy" style={{ animationDelay: '5s' }} />
                <Crown className="absolute bottom-40 left-[20%] h-20 w-20 text-yellow-600/20 floating-trophy" style={{ animationDelay: '10s' }} />
                <Star className="absolute bottom-20 right-[10%] h-14 w-14 text-yellow-400/20 floating-trophy" style={{ animationDelay: '15s' }} />
                
                {/* Leaderboard orbs */}
                <div className="leaderboard-orb orb-gold top-[20%] left-[25%] w-96 h-96" />
                <div className="leaderboard-orb orb-silver bottom-[20%] right-[20%] w-80 h-80" />
                <div className="leaderboard-orb orb-bronze top-[50%] left-[50%] w-64 h-64" />
                
                {/* Gold particles */}
                <div className="gold-particle" style={{ animationDelay: '0s', left: '10%' }} />
                <div className="gold-particle" style={{ animationDelay: '2s', left: '30%' }} />
                <div className="gold-particle" style={{ animationDelay: '4s', left: '50%' }} />
                <div className="gold-particle" style={{ animationDelay: '6s', left: '70%' }} />
                <div className="gold-particle" style={{ animationDelay: '8s', left: '90%' }} />
                
                {/* Money icons */}
                <DollarSign className="money-icon absolute left-[15%] text-green-500/30" style={{ animationDelay: '1s' }} />
                <DollarSign className="money-icon absolute left-[45%] text-green-500/30" style={{ animationDelay: '3s' }} />
                <DollarSign className="money-icon absolute left-[75%] text-green-500/30" style={{ animationDelay: '5s' }} />
              </div>
              
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                {/* Animated Trophy logo */}
                <div className="flex justify-center mb-8">
                  <div className="relative">
                    <div className="absolute inset-0 bg-yellow-500/20 rounded-full blur-3xl" />
                    <div className="relative z-10 w-20 h-20 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center">
                      <Trophy className="h-10 w-10 text-white" />
                    </div>
                    <div className="absolute -inset-4">
                      <div className="absolute inset-0 rounded-full border border-yellow-500/30 animate-ping" />
                      <div className="absolute inset-0 rounded-full border border-yellow-400/30 animate-ping" style={{ animationDelay: '0.5s' }} />
                    </div>
                  </div>
                </div>
                
                <div className="text-center">
                  <div 
                    ref={heroTitleRef.ref}
                    className={`hero-animate hero-title animate-on-scroll fade-up duration-slow ${heroRef.isInView ? 'in-view' : ''}`}
                  >
                    <h1 className="text-5xl md:text-7xl font-fredoka text-white mb-6 leading-tight">
                      <span className="text-yellow-400 hover-scale inline-block transition-transform duration-300 cursor-pointer">LOL</span>
                      <span className="text-yellow-500 hover-scale inline-block transition-transform duration-300 cursor-pointer">COW</span>
                      <span className="text-white hover-scale inline-block transition-transform duration-300 cursor-pointer"> Leaderboard</span>
                    </h1>
                  </div>
                  
                  <div className={`hero-animate hero-subtitle animate-on-scroll fade-up duration-slow ${heroRef.isInView ? 'in-view' : ''}`}>
                    <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed mb-8">
                      See who's supporting the show the most! Track superchats, gifted memberships, 
                      and membership breakdowns across all LolCow channels.
                    </p>
                  </div>
                  
                  {/* Quick Stats */}
                  <div ref={statsRef.ref} className={`grid grid-cols-1 md:grid-cols-3 gap-4 mb-12 max-w-3xl mx-auto stagger-container ${statsRef.isInView ? 'in-view' : ''}`}>
                    <div className="bg-yellow-500/10 rounded-xl p-4 text-center transform transition-all duration-300 hover:scale-105 animate-on-scroll fade-up border border-yellow-500/20">
                      <div className="flex items-center justify-center space-x-2 mb-2">
                        <DollarSign className="h-5 w-5 text-yellow-400" />
                        <span className="text-gray-400 text-sm">Superchats</span>
                      </div>
                      <div className="text-3xl font-bold text-white counter-flip-animation" style={{ '--counter-delay': '0s' } as React.CSSProperties}>
                        {superchatsData.length}
                      </div>
                      <span className="text-xs text-gray-500">Channels Tracked</span>
                    </div>
                    
                    <div className="bg-purple-500/10 rounded-xl p-4 text-center transform transition-all duration-300 hover:scale-105 animate-on-scroll fade-up border border-purple-500/20">
                      <div className="flex items-center justify-center space-x-2 mb-2">
                        <Users className="h-5 w-5 text-purple-400" />
                        <span className="text-gray-400 text-sm">Memberships</span>
                      </div>
                      <div className="text-3xl font-bold text-white counter-flip-animation" style={{ '--counter-delay': '0.5s' } as React.CSSProperties}>
                        {membershipsByLevelData.reduce((sum, item) => sum + item.totalMembers, 0)}
                      </div>
                      <span className="text-xs text-gray-500">Total Members</span>
                    </div>
                    
                    <div className="bg-green-500/10 rounded-xl p-4 text-center transform transition-all duration-300 hover:scale-105 animate-on-scroll fade-up border border-green-500/20">
                      <div className="flex items-center justify-center space-x-2 mb-2">
                        <TrendingUp className="h-5 w-5 text-green-400" />
                        <span className="text-gray-400 text-sm">Top Channel</span>
                      </div>
                      <div className="text-lg font-bold text-white">
                        {superchatsData[0]?.show || 'N/A'}
                      </div>
                      <span className="text-xs text-gray-500">Leading Superchats</span>
                    </div>
                  </div>
                  
                  <div className={`hero-animate hero-cta animate-on-scroll fade-up duration-slow ${heroRef.isInView ? 'in-view' : ''}`}>
                    <div className="flex flex-wrap justify-center gap-4">
                      <Button 
                        onClick={() => setTabValue('superchats')}
                        className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold px-8 py-4 text-lg hover-lift transition-all duration-300 group"
                      >
                        View Superchats
                        <DollarSign className="h-5 w-5 ml-2 group-hover:scale-110 transition-transform duration-300" />
                      </Button>
                      <Button 
                        onClick={() => setTabValue('breakdown')}
                        variant="outline"
                        className="border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-black font-semibold px-8 py-4 text-lg hover-lift transition-all duration-300 group"
                      >
                        Membership Stats
                        <Crown className="h-5 w-5 ml-2 group-hover:rotate-12 transition-transform duration-300" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
            
            <main className="flex-grow container mx-auto px-4 py-8">
              <LeaderboardHeader 
                showPriorMonth={showPriorMonth}
                onTogglePriorMonth={handleTogglePriorMonth}
              />

              <Card ref={contentRef.ref} className={`bg-lolcow-black border border-lolcow-lightgray mb-8 animate-on-scroll fade-up ${contentRef.isInView ? 'in-view' : ''}`}>
                <CardContent className="pt-6 overflow-hidden">
                  <LeaderboardTabs activeTab={tabValue} onTabChange={handleTabChange} />

                  {tabValue === "superchats" && (
                    <SuperchatsTab data={superchatsData} />
                  )}

                  {tabValue === "gifted" && (
                    <GiftedMembersTab data={giftedMembershipsData} />
                  )}

                  {tabValue === "breakdown" && (
                    <BreakdownTab data={membershipsByLevelData} />
                  )}
                </CardContent>
              </Card>

              <div className="flex justify-center mb-6 sm:mb-8">
                <div className="bg-slate-700/50 border border-slate-600/70 text-xs sm:text-sm text-slate-300 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full flex items-center">
                  <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 bg-green-500 rounded-full mr-2 sm:mr-2.5"></span>
                  Data updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
            </main>
            <Footer />
          </div>
        </SmoothScroll>
      </div>
    </>
  );
};

export default Leaderboard;
