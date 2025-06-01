import React from 'react';
import { Trophy, Sparkles, Star, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LeaderboardHeaderProps {
  showPriorMonth: boolean;
  onTogglePriorMonth: () => void;
}

const LeaderboardHeader = ({ showPriorMonth, onTogglePriorMonth }: LeaderboardHeaderProps) => {
  const currentDate = new Date();
  const currentMonth = currentDate.toLocaleString('default', { month: 'long' });
  const currentYear = currentDate.getFullYear();
  
  // Calculate prior month
  const priorDate = new Date(currentDate);
  priorDate.setMonth(priorDate.getMonth() - 1);
  const priorMonth = priorDate.toLocaleString('default', { month: 'long' });
  const priorYear = priorDate.getFullYear();
  
  const displayMonth = showPriorMonth ? priorMonth : currentMonth;
  const displayYear = showPriorMonth ? priorYear : currentYear;

  return (
    <div className="text-center md:text-left mb-8">
      <div className="flex items-center justify-center md:justify-start gap-3">
        <div className="relative">
          <Trophy className="h-9 w-9 text-yellow-500" />
          <Sparkles className="h-4 w-4 text-yellow-300 absolute -top-1 -right-1" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-red-500 to-white">
          <span>LOLCOW.CO</span>
          <span className="ml-2 text-white">Leaderboard</span>
        </h1>
      </div>
      
      <div className="mt-6 md:mt-8">
        <div className="flex items-center justify-center md:justify-start gap-2">
          <Star className="h-5 w-5 text-yellow-500" />
          <h2 className="text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-200 to-yellow-500">
            Top Shows - {displayMonth} {displayYear}
          </h2>
          {!showPriorMonth ? (
            <div className="flex items-center ml-2">
              <span className="h-2.5 w-2.5 bg-red-500 rounded-full mr-1.5"></span>
              <span className="text-xs font-medium text-red-400 uppercase tracking-wider">Live</span>
            </div>
          ) : (
            <div className="flex items-center ml-2">
              <span className="h-2.5 w-2.5 bg-blue-500 rounded-full mr-1.5"></span>
              <span className="text-xs font-medium text-blue-400 uppercase tracking-wider">Final Results</span>
            </div>
          )}
        </div>
        
        {/* Prior Month Toggle */}
        <div className="flex justify-center md:justify-start mt-4">
          <Button
            onClick={onTogglePriorMonth}
            variant={showPriorMonth ? "default" : "outline"}
            size="sm"
            className={`flex items-center gap-2 ${showPriorMonth 
              ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600' 
              : 'border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Calendar className="h-4 w-4" />
            {showPriorMonth ? `Viewing ${priorMonth} ${priorYear}` : `View ${priorMonth} ${priorYear} Results`}
          </Button>
        </div>
        
        <p className="text-gray-400 mt-3 max-w-lg mx-auto md:mx-0">
          {!showPriorMonth 
            ? "Current month rankings based on live viewer engagement metrics and donation activity"
            : `Final results for ${displayMonth} ${displayYear} - completed monthly rankings`
          }
        </p>
      </div>
    </div>
  );
};

export default LeaderboardHeader; 