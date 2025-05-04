
import React, { useState } from "react";
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

// Mock leaderboard data
const leaderboardData = {
  superchats: [
    { id: 1, rank: 1, show: "Morning Milk", host: "MilkMaster", amount: 5280, count: 198 },
    { id: 2, rank: 2, show: "Barn Burner", host: "HaymakerHank", amount: 4150, count: 156 },
    { id: 3, rank: 3, show: "Night Grazing", host: "MoonlightMoo", amount: 3720, count: 133 },
    { id: 4, rank: 4, show: "Udder Nonsense", host: "ComicCow", amount: 2950, count: 112 },
    { id: 5, rank: 5, show: "Pasture Party", host: "CelebrationCeleste", amount: 2780, count: 95 },
    { id: 6, rank: 6, show: "Weekly Roundup", host: "SummarySteve", amount: 2340, count: 87 },
    { id: 7, rank: 7, show: "Fresh Fields Friday", host: "WeekendWilly", amount: 1980, count: 76 },
    { id: 8, rank: 8, show: "Midnight Moos", host: "InsomniIan", amount: 1650, count: 62 },
    { id: 9, rank: 9, show: "Dairy Diaries", host: "StorytellerSteve", amount: 1320, count: 54 },
    { id: 10, rank: 10, show: "Sunday Serenity", host: "PeacefulPaul", amount: 980, count: 43 },
  ],
  memberships: [
    { id: 1, rank: 1, show: "Pasture Party", host: "CelebrationCeleste", amount: 245, growth: "+12%" },
    { id: 2, rank: 2, show: "Morning Milk", host: "MilkMaster", amount: 224, growth: "+9%" },
    { id: 3, rank: 3, show: "Barn Burner", host: "HaymakerHank", amount: 198, growth: "+15%" },
    { id: 4, rank: 4, show: "Night Grazing", host: "MoonlightMoo", amount: 176, growth: "+7%" },
    { id: 5, rank: 5, show: "Udder Nonsense", host: "ComicCow", amount: 152, growth: "+5%" },
    { id: 6, rank: 6, show: "Weekly Roundup", host: "SummarySteve", amount: 134, growth: "+4%" },
    { id: 7, rank: 7, show: "Fresh Fields Friday", host: "WeekendWilly", amount: 123, growth: "+8%" },
    { id: 8, rank: 8, show: "Midnight Moos", host: "InsomniIan", amount: 115, growth: "+3%" },
    { id: 9, rank: 9, show: "Dairy Diaries", host: "StorytellerSteve", amount: 104, growth: "+6%" },
    { id: 10, rank: 10, show: "Sunday Serenity", host: "PeacefulPaul", amount: 89, growth: "+2%" },
  ],
  viewership: [
    { id: 1, rank: 1, show: "Morning Milk", host: "MilkMaster", average: 12500, peak: 15780 },
    { id: 2, rank: 2, show: "Pasture Party", host: "CelebrationCeleste", average: 11200, peak: 14320 },
    { id: 3, rank: 3, show: "Barn Burner", host: "HaymakerHank", average: 10800, peak: 13650 },
    { id: 4, rank: 4, show: "Night Grazing", host: "MoonlightMoo", average: 9500, peak: 12100 },
    { id: 5, rank: 5, show: "Weekly Roundup", host: "SummarySteve", average: 8700, peak: 11300 },
    { id: 6, rank: 6, show: "Udder Nonsense", host: "ComicCow", average: 8300, peak: 10500 },
    { id: 7, rank: 7, show: "Fresh Fields Friday", host: "WeekendWilly", average: 7600, peak: 9800 },
    { id: 8, rank: 8, show: "Midnight Moos", host: "InsomniIan", average: 6900, peak: 8700 },
    { id: 9, rank: 9, show: "Dairy Diaries", host: "StorytellerSteve", average: 6400, peak: 8200 },
    { id: 10, rank: 10, show: "Sunday Serenity", host: "PeacefulPaul", average: 5800, peak: 7500 },
  ],
};

// Chart config
const chartConfig = {
  amount: { label: "Amount ($)", theme: { light: "#3b82f6", dark: "#3b82f6" } },
  count: { label: "Count", theme: { light: "#ef4444", dark: "#ef4444" } },
  average: { label: "Average Viewers", theme: { light: "#0ea5e9", dark: "#0ea5e9" } },
  peak: { label: "Peak Viewers", theme: { light: "#f97316", dark: "#f97316" } },
};

// Format currency
const formatCurrency = (value: number): string => {
  return `$${value.toLocaleString()}`;
};

// Define chart data type that supports all our different chart data shapes
type ChartDataItem = {
  name: string;
  amount?: number;
  count?: number;
  average?: number;
  peak?: number;
};

const Leaderboard: React.FC = () => {
  const [tabValue, setTabValue] = useState("superchats");
  const [chartData, setChartData] = useState<ChartDataItem[]>(
    leaderboardData.superchats.slice(0, 5).map(item => ({
      name: item.show,
      amount: item.amount,
      count: item.count,
    }))
  );

  const handleTabChange = (value: string) => {
    setTabValue(value);
    
    if (value === "superchats") {
      setChartData(leaderboardData.superchats.slice(0, 5).map(item => ({
        name: item.show,
        amount: item.amount,
        count: item.count,
      })));
    } else if (value === "memberships") {
      setChartData(leaderboardData.memberships.slice(0, 5).map(item => ({
        name: item.show,
        amount: item.amount,
        // Add a default count of 0 to match the type
        count: 0,
      })));
    } else {
      setChartData(leaderboardData.viewership.slice(0, 5).map(item => ({
        name: item.show,
        average: item.average,
        peak: item.peak,
        // Add defaults for amount and count to match the type
        amount: 0,
        count: 0,
      })));
    }
  };

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
              Top Shows - May 2025
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
                <TabsTrigger value="memberships" className="text-sm">
                  <Users className="h-4 w-4 mr-2" />
                  <span className="hidden md:inline">Memberships</span>
                  <span className="inline md:hidden">Mems</span>
                </TabsTrigger>
                <TabsTrigger value="viewership" className="text-sm">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  <span className="hidden md:inline">Viewership</span>
                  <span className="inline md:hidden">Views</span>
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
                              <YAxis 
                                yAxisId="right"
                                orientation="right"
                                tick={{ fill: '#9CA3AF' }}
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
                              <Bar
                                dataKey="count"
                                fill="#ef4444"
                                name="Count"
                                yAxisId="right"
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
                          <TableHead className="text-gray-300 text-right">Count</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {leaderboardData.superchats.map((item) => (
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
                            <TableCell className="text-right">{item.count}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="memberships">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="bg-lolcow-darkgray border border-lolcow-lightgray">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg font-fredoka text-white">
                        Membership Gift Rankings
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
                                tick={{ fill: '#9CA3AF' }}
                              />
                              <Tooltip content={<ChartTooltipContent />} />
                              <Legend />
                              <Bar
                                dataKey="amount"
                                fill="#8b5cf6"
                                name="Gifts"
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
                          <TableHead className="text-gray-300 text-right">Gifts</TableHead>
                          <TableHead className="text-gray-300 text-right">Growth</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {leaderboardData.memberships.map((item) => (
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
                            <TableCell className="text-right">{item.amount}</TableCell>
                            <TableCell className="text-green-400 text-right">{item.growth}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="viewership">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="bg-lolcow-darkgray border border-lolcow-lightgray">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg font-fredoka text-white">
                        Viewership Rankings
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
                                tick={{ fill: '#9CA3AF' }}
                              />
                              <Tooltip content={<ChartTooltipContent />} />
                              <Legend />
                              <Bar
                                dataKey="average"
                                fill="#0ea5e9"
                                name="Average Viewers"
                                radius={[4, 4, 0, 0]}
                              />
                              <Bar
                                dataKey="peak"
                                fill="#f97316"
                                name="Peak Viewers"
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
                          <TableHead className="text-gray-300 text-right">Avg Viewers</TableHead>
                          <TableHead className="text-gray-300 text-right">Peak</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {leaderboardData.viewership.map((item) => (
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
                            <TableCell className="text-right">{item.average.toLocaleString()}</TableCell>
                            <TableCell className="text-right">{item.peak.toLocaleString()}</TableCell>
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
