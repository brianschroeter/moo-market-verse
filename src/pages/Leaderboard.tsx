import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
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
import { Award, Star, TrendingUp, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
  
  const [superchatsData, setSuperchatsData] = useState<SuperchatLeaderboardItem[]>([]);
  const [giftedMembershipsData, setGiftedMembershipsData] = useState<GiftedMembershipLeaderboardItem[]>([]); // New state for gifted
  const [membershipsByLevelData, setMembershipsByLevelData] = useState<MembershipBreakdownItem[]>([]);
  const [chartData, setChartData] = useState<ChartDataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      <div className="flex flex-col min-h-screen bg-gradient-to-b from-lolcow-black to-lolcow-darkgray text-white justify-center items-center">
        <p className="text-xl font-fredoka">Loading Leaderboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-b from-lolcow-black to-lolcow-darkgray text-white justify-center items-center">
        <p className="text-xl font-fredoka text-lolcow-red">Error: {error}</p>
        <p className="text-sm text-gray-400 mt-2">Please try refreshing the page or check the console for more details.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-lolcow-black to-lolcow-darkgray text-white">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-8">
        <LeaderboardHeader 
          showPriorMonth={showPriorMonth}
          onTogglePriorMonth={handleTogglePriorMonth}
        />

        <Card className="bg-lolcow-black border border-lolcow-lightgray mb-8">
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

        <div className="flex justify-center mb-8">
          <div className="bg-slate-700/50 border border-slate-600/70 text-sm text-slate-300 px-4 py-2 rounded-full flex items-center">
            <span className="h-2.5 w-2.5 bg-green-500 rounded-full mr-2.5"></span>
            Data updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Leaderboard;
