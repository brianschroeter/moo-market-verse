import React, { useState, useEffect } from 'react';
import { BarChart, ResponsiveContainer, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import RankingsTable from "./RankingsTable";
import { Gift, Award, TrendingUp } from "lucide-react";

// Define types for the props, matching Leaderboard.tsx
interface GiftedMembershipLeaderboardItem {
  id: string;
  rank: number;
  show: string;
  host: string;
  amount: number; // This is the count of gifted memberships
}

interface GiftedMembersTabProps {
  data: GiftedMembershipLeaderboardItem[];
}

// Custom Tooltip for Gifted Memberships
const CustomGiftedTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800/90 p-3 rounded-lg shadow-lg border border-slate-700">
        <p className="text-sm font-semibold text-white mb-2">{label}</p>
        <div className="flex items-center text-xs">
          <Gift className="h-3.5 w-3.5 mr-1.5 text-green-400" />
          <span className="mr-1.5 text-slate-300">{payload[0].name}:</span>
          <span className="font-medium text-white">{payload[0].value.toLocaleString()}</span>
        </div>
      </div>
    );
  }
  return null;
};

const GiftedMembersTab: React.FC<GiftedMembersTabProps> = ({ data }) => {
  const [chartData, setChartData] = useState<any[]>([]);
  const [totalGifts, setTotalGifts] = useState<string>("0");
  const [mostGifted, setMostGifted] = useState<string>("N/A");

  useEffect(() => {
    if (data && data.length > 0) {
      // Transform data for chart display - top 5 only for chart
      const chartDataTransformed = data
        .slice(0, 5)
        .map(item => ({
          name: item.show.startsWith("Lolcow") ? item.show.substring(6) : item.show,
          gifts: item.amount, // Use item.amount as the value for gifts
        }));
      
      setChartData(chartDataTransformed);
    
      // Calculate total gifts
      const total = data
        .reduce((acc, curr) => acc + curr.amount, 0) // Use curr.amount
        .toLocaleString();
      
      setTotalGifts(total);

      // Set Most Gifted (assuming data is sorted by rank or amount descending)
      if (data[0]) {
        setMostGifted(data[0].show);
      } else {
        setMostGifted("N/A");
      }

    } else {
      setChartData([]);
      setTotalGifts("0");
      setMostGifted("N/A");
    }
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-gray-400">
        <Gift className="h-16 w-16 mb-4 opacity-50" />
        <p className="text-xl font-medium">No Gifted Membership Data Available</p>
        <p className="text-sm">Check back later for updates.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div className="flex items-center mb-4 md:mb-0">
          <div className="p-2 rounded-lg bg-green-500/20 mr-3">
            <Gift className="h-6 w-6 text-green-400" />
          </div>
          <h3 className="text-2xl font-bold text-white">
            Gifted Membership <span className="text-green-400">Rankings</span>
          </h3>
        </div>
        
        <div className="flex flex-wrap items-center justify-center md:justify-end gap-4">
          <div className="bg-gray-800/80 rounded-lg px-4 py-2 border border-gray-700/50 flex items-center">
            <Award className="h-4 w-4 text-yellow-500 mr-2" />
            <span className="text-gray-400 text-sm mr-2">Most gifted:</span>
            <span className="font-semibold text-white">{mostGifted}</span>
          </div>
          
          <div className="bg-gray-800/80 rounded-lg px-4 py-2 border border-gray-700/50 flex items-center">
            <TrendingUp className="h-4 w-4 text-green-500 mr-2" />
            <span className="text-gray-400 text-sm mr-2">Total gifts:</span>
            <span className="font-semibold text-white">{totalGifts}</span>
          </div>
        </div>
      </div>
      
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-gray-800/30 p-6 rounded-xl border border-gray-700/50 min-h-[350px] shadow-lg">
          <div className="mb-4 text-lg font-medium text-gray-200">Top 5 Shows by Gifted Memberships</div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 30 }}> {/* Adjusted bottom margin */}
              <defs>
                <linearGradient id="colorGiftsTab" x1="0" y1="0" x2="0" y2="1"> {/* Unique ID */}
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.3}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
              <XAxis 
                dataKey="name"
                tick={{ fill: '#9ca3af' }} 
                axisLine={{ stroke: '#4b5563' }}
                tickLine={false}
                interval={0}
                angle={-45}
                textAnchor="end"
              />
              <YAxis 
                tick={{ fill: '#9ca3af' }} 
                axisLine={{ stroke: '#4b5563' }}
                tickLine={false}
                tickFormatter={(value) => value.toLocaleString()} // Format Y-axis ticks
              />
              <Tooltip 
                content={<CustomGiftedTooltip />} 
                cursor={{ fill: 'rgba(16, 185, 129, 0.1)' }} // Changed to subtle green
              />
              <Bar 
                dataKey="gifts" 
                fill="url(#colorGiftsTab)" // Use unique ID
                name="Gifts" // Tooltip name
                radius={[4, 4, 0, 0]} 
                animationDuration={1200}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-gray-800/30 p-6 rounded-xl border border-gray-700/50 shadow-lg">
          <div className="mb-4 text-lg font-medium text-gray-200">Complete Rankings</div>
          <RankingsTable 
            data={data}
            columns={["rank", "show", "amount"]} // Use 'amount' as the data key for gifts count
            valueFormatter={{
              amount: (value: number) => value.toLocaleString(), // Format the amount (gifts count)
              show: (value: string) => value.startsWith("Lolcow") ? value.substring(6) : value
            }}
            highlightColor="bg-green-500/10 border-l-4 border-green-500"
          />
        </div>
      </div>
    </div>
  );
};

export default GiftedMembersTab; 