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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

// Consolidated and corrected Chart config
const chartConfig = {
  amount: { label: "Amount ($)", theme: { light: "#3b82f6", dark: "#3b82f6" } }, 
  gifts: { label: "Gifts", theme: { light: "#8b5cf6", dark: "#8b5cf6" } }, 
  crown: { label: "Crown", theme: { light: "#f59e0b", dark: "#f59e0b" } }, 
  paypig: { label: "Paypig", theme: { light: "#84cc16", dark: "#84cc16" } }, 
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
  const [tabValue, setTabValue] = useState("superchats");
  
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
      const currentMonth = (currentDate.getMonth() + 1).toString().padStart(2, '0');
      const currentYear = currentDate.getFullYear().toString();

      try {
        // Fetch Superchats data
        const { data: superchatsRaw, error: superchatsError } = await supabase
          .rpc('sum_donations_by_channel_for_month_year', { 
            p_month: currentMonth, 
            p_year: currentYear 
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
            p_month: currentMonth,
            p_year: currentYear
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

        // Fetch Memberships breakdown data
        const { data: membershipsRaw, error: membershipsError } = await supabase
          .rpc('get_channel_membership_breakdown'); // No params for now

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
  }, []);


  const handleTabChange = (value: string) => {
    setTabValue(value);
    
    if (value === "superchats") {
      setChartData(superchatsData.map(item => ({
        name: item.show,
        amount: item.amount,
      })));
    } else if (value === "giftedMemberships") { // New case for gifted memberships tab
      setChartData(giftedMembershipsData.map(item => ({ 
        name: item.show, 
        gifts: item.amount 
      })));
    } else if (value === "membershipBreakdown") { // Renamed from "memberships"
      setChartData(membershipsByLevelData.map(item => ({ 
        name: item.show,
        crown: item.crownCount,
        paypig: item.paypigCount,
        cashCow: item.cashCowCount,
      })));
    }
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
        <h1 className="text-3xl font-fredoka text-center mb-8">
          <span className="text-lolcow-blue">LOL</span>
          <span className="text-lolcow-red">COW</span>
          <span className="text-white">.CO</span>
          <span className="text-white"> Leaderboard</span>
        </h1>

        <Card className="bg-lolcow-black border border-lolcow-lightgray mb-8">
          <CardHeader>
            <CardTitle className="font-fredoka text-white">
              <Award className="inline-block mr-2 h-5 w-5 text-lolcow-red" />
              Top Shows - {new Date().toLocaleString('default', { month: 'long' })} {new Date().getFullYear()}
            </CardTitle>
            <CardDescription className="text-gray-400">
              Monthly rankings based on viewer engagement metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={tabValue} onValueChange={handleTabChange} className="w-full">
              <TabsList className="grid grid-cols-3 mb-4 bg-lolcow-lightgray">
                <TabsTrigger value="superchats" className="text-sm">
                  <Star className="h-4 w-4 mr-2" />
                  <span className="hidden md:inline">Superchats</span>
                  <span className="inline md:hidden">SC</span>
                </TabsTrigger>
                <TabsTrigger value="giftedMemberships" className="text-sm">
                  <Users className="h-4 w-4 mr-2" />
                  <span className="hidden md:inline">Gifted Members</span>
                  <span className="inline md:hidden">Gifts</span>
                </TabsTrigger>
                <TabsTrigger value="membershipBreakdown" className="text-sm">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  <span className="hidden md:inline">Breakdown</span>
                  <span className="inline md:hidden">Levels</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="superchats">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="bg-lolcow-darkgray border border-lolcow-lightgray">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg font-fredoka text-white">
                        Superchat Rankings
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px] w-full">
                        <ChartContainer config={chartConfig}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                              <XAxis 
                                dataKey="name" 
                                tick={{ fill: '#9CA3AF' }}
                                tickFormatter={(value) => value.split(' ')[0]}
                              />
                              <YAxis 
                                yAxisId="left"
                                tick={{ fill: '#9CA3AF' }}
                                tickFormatter={(value) => `$${value}`}
                              />
                              <Tooltip content={<ChartTooltipContent />} />
                              <Legend />
                              <Bar
                                dataKey="amount"
                                fill="#3b82f6"
                                name="Amount ($)"
                                yAxisId="left"
                                radius={[4, 4, 0, 0]}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </ChartContainer>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <div className="overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-lolcow-lightgray/20">
                          <TableHead className="text-gray-300">Rank</TableHead>
                          <TableHead className="text-gray-300">Show</TableHead>
                          <TableHead className="text-gray-300">Host</TableHead>
                          <TableHead className="text-gray-300 text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {superchatsData.map((item) => (
                          <TableRow key={item.id} className="hover:bg-lolcow-lightgray/20">
                            <TableCell className="font-medium">
                              {item.rank === 1 && <span className="text-yellow-400">#1 🏆</span>}
                              {item.rank === 2 && <span className="text-gray-300">#2 🥈</span>}
                              {item.rank === 3 && <span className="text-amber-600">#3 🥉</span>}
                              {item.rank > 3 && <span>#{item.rank}</span>}
                            </TableCell>
                            <TableCell className="font-medium text-lolcow-blue">
                              {item.show}
                            </TableCell>
                            <TableCell>{item.host}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="giftedMemberships">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="bg-lolcow-darkgray border border-lolcow-lightgray">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg font-fredoka text-white">
                        Gifted Membership Rankings
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px] w-full">
                        <ChartContainer config={chartConfig}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                              <XAxis 
                                dataKey="name" 
                                tick={{ fill: '#9CA3AF' }}
                                tickFormatter={(value) => value.split(' ')[0]}
                              />
                              <YAxis tick={{ fill: '#9CA3AF' }} />
                              <Tooltip content={<ChartTooltipContent />} />
                              <Legend />
                              <Bar
                                dataKey="gifts"
                                fill={chartConfig.gifts.theme.light}
                                name={chartConfig.gifts.label}
                                radius={[4, 4, 0, 0]}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </ChartContainer>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <div className="overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-lolcow-lightgray/20">
                          <TableHead className="text-gray-300">Rank</TableHead>
                          <TableHead className="text-gray-300">Show</TableHead>
                          <TableHead className="text-gray-300 text-right">Total Gifts</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {giftedMembershipsData.map((item) => (
                          <TableRow key={item.id} className="hover:bg-lolcow-lightgray/20">
                            <TableCell className="font-medium">
                              {item.rank === 1 && <span className="text-yellow-400">#1 🏆</span>}
                              {item.rank === 2 && <span className="text-gray-300">#2 🥈</span>}
                              {item.rank === 3 && <span className="text-amber-600">#3 🥉</span>}
                              {item.rank > 3 && <span>#{item.rank}</span>}
                            </TableCell>
                            <TableCell className="font-medium text-lolcow-blue">{item.show}</TableCell>
                            <TableCell className="text-right">{item.amount}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="membershipBreakdown">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="bg-lolcow-darkgray border border-lolcow-lightgray">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg font-fredoka text-white">
                        Membership Level Breakdown
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px] w-full">
                        <ChartContainer config={chartConfig}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} layout="vertical">
                              <XAxis type="number" tick={{ fill: '#9CA3AF' }} />
                              <YAxis 
                                dataKey="name" 
                                type="category" 
                                tick={{ fill: '#9CA3AF' }}
                                width={80}
                                tickFormatter={(value) => value.split(' ')[0]}
                              />
                              <Tooltip content={<ChartTooltipContent />} />
                              <Legend />
                              <Bar dataKey="crown" stackId="a" fill={chartConfig.crown.theme.light} name={chartConfig.crown.label} radius={[0, 4, 4, 0]} />
                              <Bar dataKey="paypig" stackId="a" fill={chartConfig.paypig.theme.light} name={chartConfig.paypig.label} />
                              <Bar dataKey="cashCow" stackId="a" fill={chartConfig.cashCow.theme.light} name={chartConfig.cashCow.label} radius={[4, 0, 0, 4]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </ChartContainer>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <div className="overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-lolcow-lightgray/20">
                          <TableHead className="text-gray-300">Rank</TableHead>
                          <TableHead className="text-gray-300">Show</TableHead>
                          <TableHead className="text-gray-300 text-right">👑</TableHead>
                          <TableHead className="text-gray-300 text-right">🐖</TableHead>
                          <TableHead className="text-gray-300 text-right">🐄</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {membershipsByLevelData.map((item) => (
                          <TableRow key={item.id} className="hover:bg-lolcow-lightgray/20">
                            <TableCell className="font-medium">
                              {item.rank === 1 && <span className="text-yellow-400">#1 🏆</span>}
                              {item.rank === 2 && <span className="text-gray-300">#2 🥈</span>}
                              {item.rank === 3 && <span className="text-amber-600">#3 🥉</span>}
                              {item.rank > 3 && <span>#{item.rank}</span>}
                            </TableCell>
                            <TableCell className="font-medium text-lolcow-blue">{item.show}</TableCell>
                            <TableCell className="text-right">{item.crownCount}</TableCell>
                            <TableCell className="text-right">{item.paypigCount}</TableCell>
                            <TableCell className="text-right">{item.cashCowCount}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default Leaderboard;
