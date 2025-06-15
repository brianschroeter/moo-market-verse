import React, { useState, useEffect } from 'react';
import { BarChart, ResponsiveContainer, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import RankingsTable from "./RankingsTable";
import { DollarSign, Trophy, TrendingUp } from "lucide-react";
import CustomSuperchatTooltip from "./CustomSuperchatTooltip";

interface SuperchatLeaderboardItem {
  id: string;
  rank: number;
  show: string;
  host: string;
  amount: number;
}

interface SuperchatsTabProps {
  data: SuperchatLeaderboardItem[];
}

const SuperchatsTab: React.FC<SuperchatsTabProps> = ({ data }) => {
  const [chartData, setChartData] = useState<any[]>([]);
  const [totalAmount, setTotalAmount] = useState<string>("0");
  const [topEarner, setTopEarner] = useState<string>("N/A");

  useEffect(() => {
    if (data && data.length > 0) {
      const chartDataTransformed = data
        .slice(0, 5)
        .map(item => ({
          name: item.show.startsWith("Lolcow") ? item.show.substring(6) : item.show,
          amount: item.amount,
        }));
      
      setChartData(chartDataTransformed);

      const total = data
        .reduce((acc, curr) => acc + curr.amount, 0)
        .toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      
      setTotalAmount(total);

      if (data[0]) {
        setTopEarner(data[0].show);
      } else {
        setTopEarner("N/A");
      }

    } else {
      setChartData([]);
      setTotalAmount("0.00");
      setTopEarner("N/A");
    }
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-gray-400">
        <DollarSign className="h-16 w-16 mb-4 opacity-50" />
        <p className="text-xl font-medium">No Superchat Data Available</p>
        <p className="text-sm">Check back later for updates.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 sm:mb-6">
        <div className="flex items-center mb-3 md:mb-0">
          <div className="p-1.5 sm:p-2 rounded-lg bg-lolcow-red/20 mr-2 sm:mr-3">
            <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-lolcow-red" />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-white">
            Superchat <span className="text-lolcow-red">Rankings</span>
          </h3>
        </div>
        
        <div className="flex flex-wrap items-center justify-center md:justify-end gap-2 sm:gap-4">
          <div className="bg-gray-800/80 rounded-lg px-3 py-1.5 sm:px-4 sm:py-2 border border-gray-700/50 flex items-center">
            <Trophy className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-500 mr-1.5 sm:mr-2" />
            <span className="text-gray-400 text-xs sm:text-sm mr-1 sm:mr-2">Top:</span>
            <span className="font-semibold text-white text-xs sm:text-sm truncate max-w-[100px] sm:max-w-none">{topEarner}</span>
          </div>
          
          <div className="bg-gray-800/80 rounded-lg px-3 py-1.5 sm:px-4 sm:py-2 border border-gray-700/50 flex items-center">
            <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500 mr-1.5 sm:mr-2" />
            <span className="text-gray-400 text-xs sm:text-sm mr-1 sm:mr-2">Total:</span>
            <span className="font-semibold text-white text-xs sm:text-sm">${totalAmount}</span>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-gray-800/30 p-4 sm:p-6 rounded-xl border border-gray-700/50 min-h-[300px] sm:min-h-[350px] shadow-lg">
          <div className="mb-3 sm:mb-4 text-base sm:text-lg font-medium text-gray-200">Top 5 Shows by Superchat Revenue</div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 30 }}>
              <defs>
                <linearGradient id="colorRevenueSuperchat" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF0000" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#FF0000" stopOpacity={0.3}/>
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
                tickFormatter={(value) => `$${value.toLocaleString()}`}
              />
              <Tooltip 
                content={<CustomSuperchatTooltip />}
                cursor={{ fill: 'rgba(255, 0, 0, 0.1)' }}
              />
              <Bar 
                dataKey="amount" 
                fill="url(#colorRevenueSuperchat)"
                name="Revenue"
                radius={[4, 4, 0, 0]} 
                animationDuration={1200}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-gray-800/30 p-4 sm:p-6 rounded-xl border border-gray-700/50 shadow-lg">
          <div className="mb-3 sm:mb-4 text-base sm:text-lg font-medium text-gray-200">Complete Rankings</div>
          <RankingsTable 
            data={data}
            columns={["rank", "show", "amount"]}
            valueFormatter={{
              amount: (value: number) => `$${value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
              show: (value: string) => value.startsWith("Lolcow") ? value.substring(6) : value
            }}
            highlightColor="bg-lolcow-red/10 border-l-4 border-lolcow-red"
          />
        </div>
      </div>
    </div>
  );
};

export default SuperchatsTab; 