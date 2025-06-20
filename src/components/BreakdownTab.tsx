import React, { useState, useEffect } from 'react';
import { BarChart, ResponsiveContainer, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import RankingsTable from "./RankingsTable";
import { LayoutPanelTop, Crown, PiggyBank, TrendingUp, Icon } from "lucide-react";
import { cowHead } from '@lucide/lab';
import { ScrollArea } from "@/components/ui/scroll-area";

// Define types for the props, matching Leaderboard.tsx
interface MembershipBreakdownItem {
  id: string; 
  rank: number;
  show: string; 
  host: string; 
  crownCount: number;
  paypigCount: number;
  cashCowCount: number;
  totalMembers: number;
}

interface BreakdownTabProps {
  data: MembershipBreakdownItem[];
}

// Custom Tooltip Content Component
const CustomBreakdownTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800/90 p-3 rounded-lg shadow-lg border border-slate-700">
        <p className="text-sm font-semibold text-white mb-2">{label}</p>
        {payload.map((pld: any, index: number) => (
          <div key={index} className="flex items-center text-xs mb-1 last:mb-0">
            {pld.dataKey === 'crown' && <Crown className="h-3.5 w-3.5 mr-1.5" style={{ color: '#eab308' }} />}
            {pld.dataKey === 'pig' && 
              <PiggyBank className="h-3.5 w-3.5 mr-1.5" style={{ color: '#ec4899' }} />
            }
            {pld.dataKey === 'cow' && 
              <Icon iconNode={cowHead} className="h-3.5 w-3.5 mr-1.5" style={{ color: '#0ea5e9' }} />
            }
            <span className="capitalize mr-1.5" style={{ color: pld.fill === 'url(#colorCowBreakdown)' ? '#0ea5e9' : pld.fill === 'url(#colorPigBreakdown)' ? '#ec4899' : pld.fill === 'url(#colorCrownBreakdown)' ? '#eab308': '#9ca3af' }}>{pld.name}:</span>
            <span className="font-medium text-white">{pld.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const BreakdownTab: React.FC<BreakdownTabProps> = ({ data }) => {
  const [processedDataForDisplay, setProcessedDataForDisplay] = useState<MembershipBreakdownItem[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [totals, setTotals] = useState({ crown: 0, pig: 0, cow: 0 });

  const CROWN_VALUE = 500;
  const PAYPIG_VALUE = 100;
  const CASH_COW_VALUE = 10;

  useEffect(() => {
    if (data && data.length > 0) {
      // Calculate total value for each item and sort
      const sortedData = [...data] // Create a shallow copy
        .map(item => {
          const totalValue = (item.crownCount * CROWN_VALUE) +
                             (item.paypigCount * PAYPIG_VALUE) +
                             (item.cashCowCount * CASH_COW_VALUE);
          return { ...item, _totalValue: totalValue }; // Store temporary value for sorting
        })
        .sort((a, b) => b._totalValue - a._totalValue)
        .map((item, index) => {
          // Remove the temporary _totalValue and assign new rank based on sorted position
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { _totalValue, ...rest } = item;
          return { ...rest, rank: index + 1 } as MembershipBreakdownItem;
        });
      
      setProcessedDataForDisplay(sortedData);

      // Transform data for chart display - top 5 from sorted data
      const chartDataTransformed = sortedData
        .slice(0, 5)
        .map(item => ({
          name: item.show.startsWith("Lolcow") ? item.show.substring(6) : item.show,
          crown: item.crownCount,
          pig: item.paypigCount,
          cow: item.cashCowCount,
        }));
      
      setChartData(chartDataTransformed);
    
      // Calculate totals for each membership type (can use original data or sortedData, sums are the same)
      const totalCrown = data.reduce((acc, curr) => acc + curr.crownCount, 0);
      const totalPig = data.reduce((acc, curr) => acc + curr.paypigCount, 0);
      const totalCow = data.reduce((acc, curr) => acc + curr.cashCowCount, 0);
      
      setTotals({ crown: totalCrown, pig: totalPig, cow: totalCow });
    } else {
      setProcessedDataForDisplay([]);
      setChartData([]);
      setTotals({ crown: 0, pig: 0, cow: 0 });
    }
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-gray-400">
        <LayoutPanelTop className="h-16 w-16 mb-4 opacity-50" />
        <p className="text-xl font-medium">No Membership Breakdown Data Available</p>
        <p className="text-sm">Check back later for updates.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-4 sm:mb-6">
        <div className="flex flex-col mb-4 lg:mb-0">
          <div className="flex items-center mb-2">
            <div className="p-1.5 sm:p-2 rounded-lg bg-yellow-500/20 mr-2 sm:mr-3">
              <LayoutPanelTop className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-400" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-white">
              Membership <span className="text-yellow-400">Breakdown</span>
            </h3>
          </div>
          <div className="flex flex-col md:flex-row md:items-center gap-2 text-xs sm:text-sm">
            <div className="flex items-center">
              <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 bg-green-500 rounded-full mr-1 sm:mr-1.5"></span>
              <span className="text-green-400 font-medium">Current Active Memberships</span>
            </div>
            <span className="text-gray-500 hidden md:inline">•</span>
            <span className="text-gray-400">Ranked by value (Crown: $500, PayPig: $100, Cash Cow: $10)</span>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 bg-gray-800/80 rounded-lg px-3 py-2 sm:px-4 border border-gray-700/50">
          <div className="flex items-center">
            <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 bg-yellow-500 rounded-full mr-1.5 sm:mr-2"></div>
            <span className="text-gray-300 text-xs sm:text-sm mr-1 sm:mr-2">Crown:</span>
            <span className="font-semibold text-white text-xs sm:text-sm mr-2 sm:mr-3">{totals.crown.toLocaleString()}</span>
          </div>
          <div className="flex items-center">
            <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 bg-pink-500 rounded-full mr-1.5 sm:mr-2"></div>
            <span className="text-gray-300 text-xs sm:text-sm mr-1 sm:mr-2">PayPig:</span>
            <span className="font-semibold text-white text-xs sm:text-sm mr-2 sm:mr-3">{totals.pig.toLocaleString()}</span>
          </div>
          <div className="flex items-center">
            <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 bg-sky-500 rounded-full mr-1.5 sm:mr-2"></div>
            <span className="text-gray-300 text-xs sm:text-sm mr-1 sm:mr-2">CashCow:</span>
            <span className="font-semibold text-white text-xs sm:text-sm">{totals.cow.toLocaleString()}</span>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-gray-800/30 p-4 sm:p-6 rounded-xl border border-gray-700/50 min-h-[300px] sm:min-h-[350px] shadow-lg">
          <div className="mb-3 sm:mb-4">
            <div className="text-base sm:text-lg font-medium text-gray-200">Membership Distribution (Top 5)</div>
            <div className="text-xs text-gray-400 mt-1">Stacked by membership counts • Sorted by total value</div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart 
              data={chartData} 
              margin={{ top: 20, right: 30, left: 0, bottom: 40 }} // Increased bottom margin
            >
              <defs>
                <linearGradient id="colorCrownBreakdown" x1="0" y1="0" x2="0" y2="1"> {/* Unique ID */}
                  <stop offset="5%" stopColor="#eab308" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#eab308" stopOpacity={0.4}/>
                </linearGradient>
                <linearGradient id="colorPigBreakdown" x1="0" y1="0" x2="0" y2="1"> {/* Unique ID */}
                  <stop offset="5%" stopColor="#ec4899" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#ec4899" stopOpacity={0.4}/>
                </linearGradient>
                <linearGradient id="colorCowBreakdown" x1="0" y1="0" x2="0" y2="1"> {/* Unique ID */}
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.4}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
              <XAxis 
                dataKey="name"
                tick={{ fill: '#9ca3af' }} 
                axisLine={{ stroke: '#4b5563' }}
                tickLine={false}
                interval={0}
              />
              <YAxis 
                tick={{ fill: '#9ca3af' }} 
                axisLine={{ stroke: '#4b5563' }}
                tickLine={false}
                tickFormatter={(value) => value.toLocaleString()}
              />
              <Tooltip 
                content={<CustomBreakdownTooltip />} 
                cursor={{ fill: 'rgba(234, 179, 8, 0.1)' }}
              />
              <Legend 
                iconType="circle" 
                wrapperStyle={{ paddingTop: 20, display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }} 
                formatter={(value) => <span className="text-gray-300 capitalize mx-2">{value}</span>} // Added mx-2 for spacing
              />
              {/* For a grouped bar chart, each Bar component needs a unique dataKey and no stackId */}
              {/* Or, if it's meant to be stacked, they all need the same stackId */}
              {/* The example code uses stackId="a", so it's a stacked bar chart. */}
              <Bar name="Crown" dataKey="crown" stackId="a" fill="url(#colorCrownBreakdown)" animationDuration={1200} />
              <Bar name="Pay Pig" dataKey="pig" stackId="a" fill="url(#colorPigBreakdown)" animationDuration={1200} />
              <Bar name="Cash Cow" dataKey="cow" stackId="a" fill="url(#colorCowBreakdown)" radius={[4, 4, 0, 0]} animationDuration={1200} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-gray-800/30 p-4 sm:p-6 rounded-xl border border-gray-700/50 shadow-lg">
          <div className="mb-3 sm:mb-4">
            <div className="text-base sm:text-lg font-medium text-gray-200">Complete Rankings</div>
            <div className="text-xs text-gray-400 mt-1">Ranked by total membership value • Current active memberships only</div>
          </div>
            <RankingsTable
              data={processedDataForDisplay}
              columns={["rank", "show", "crownCount", "paypigCount", "cashCowCount"]}
              valueFormatter={{
                crownCount: (value: number) => value.toLocaleString(),
                paypigCount: (value: number) => value.toLocaleString(),
                cashCowCount: (value: number) => value.toLocaleString(),
                show: (value: string) => value.startsWith("Lolcow") ? value.substring(6) : value
              }}
              highlightColor="bg-yellow-500/10 border-l-4 border-yellow-500"
            />
        </div>
      </div>

      <div className="mt-6 sm:mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6">
        <div className="bg-gray-800/30 p-4 sm:p-6 rounded-xl border border-gray-700/50 flex flex-col items-center text-center shadow-lg">
          <div className="p-2 sm:p-3 rounded-full bg-yellow-500/20 mb-2 sm:mb-3 flex items-center justify-center">
            <Crown className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-400" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-white">Crown Tier</h3>
          <p className="text-yellow-400 font-bold text-xl sm:text-2xl mt-1">{totals.crown.toLocaleString()}</p>
          <p className="text-gray-400 text-xs sm:text-sm mt-2">Premium supporters with exclusive benefits</p>
        </div>
        
        <div className="bg-gray-800/30 p-4 sm:p-6 rounded-xl border border-gray-700/50 flex flex-col items-center text-center shadow-lg">
          <div className="p-2 sm:p-3 rounded-full bg-pink-500/20 mb-2 sm:mb-3 flex items-center justify-center">
            <PiggyBank className="h-6 w-6 sm:h-8 sm:w-8 text-pink-400" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-white">Pay Pig Tier</h3>
          <p className="text-pink-400 font-bold text-xl sm:text-2xl mt-1">{totals.pig.toLocaleString()}</p>
          <p className="text-gray-400 text-xs sm:text-sm mt-2">Mid-tier supporters with special perks</p>
        </div>
        
        <div className="bg-gray-800/30 p-4 sm:p-6 rounded-xl border border-gray-700/50 flex flex-col items-center text-center shadow-lg">
          <div className="p-2 sm:p-3 rounded-full bg-sky-500/20 mb-2 sm:mb-3 flex items-center justify-center">
            <Icon iconNode={cowHead} className="h-6 w-6 sm:h-8 sm:w-8 text-sky-400" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-white">Cash Cow Tier</h3>
          <p className="text-sky-400 font-bold text-xl sm:text-2xl mt-1">{totals.cow.toLocaleString()}</p>
          <p className="text-gray-400 text-xs sm:text-sm mt-2">Basic membership with standard benefits</p>
        </div>
      </div>
    </div>
  );
};

export default BreakdownTab; 