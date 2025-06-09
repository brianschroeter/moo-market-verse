import React from 'react';
import { Calendar, Sparkles, Tv, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ScheduleHeaderProps {
  includeRecent: boolean;
  onToggleRecent: () => void;
  stats?: {
    totalChannels: number;
    totalSlots: number;
    liveNow: number;
    upcomingToday: number;
  };
}

const ScheduleHeader = ({ includeRecent, onToggleRecent, stats }: ScheduleHeaderProps) => {
  const currentDate = new Date();
  const currentDay = currentDate.toLocaleString('default', { weekday: 'long' });
  const currentDateStr = currentDate.toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  });

  const hasLiveContent = (stats?.liveNow || 0) > 0;

  return (
    <div className="text-center md:text-left mb-8">
      <div className="flex items-center justify-center md:justify-start gap-3">
        <div className="relative">
          <Tv className="h-9 w-9 text-blue-500" />
          <Sparkles className="h-4 w-4 text-blue-300 absolute -top-1 -right-1" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-red-500 to-white">
          <span>LOLCOW.CO</span>
          <span className="ml-2 text-white">Schedule</span>
        </h1>
      </div>
      
      <div className="mt-6 md:mt-8">
        <div className="flex items-center justify-center md:justify-start gap-2">
          <Radio className="h-5 w-5 text-blue-500" />
          <h2 className="text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-blue-500">
            Live Shows - {currentDay}, {currentDateStr}
          </h2>
          {hasLiveContent ? (
            <div className="flex items-center ml-2">
              <span className="h-2.5 w-2.5 bg-red-500 rounded-full mr-1.5 animate-pulse"></span>
              <span className="text-xs font-medium text-red-400 uppercase tracking-wider">Live Now</span>
            </div>
          ) : (
            <div className="flex items-center ml-2">
              <span className="h-2.5 w-2.5 bg-blue-500 rounded-full mr-1.5"></span>
              <span className="text-xs font-medium text-blue-400 uppercase tracking-wider">Scheduled</span>
            </div>
          )}
        </div>
        
        {/* Recent Shows Toggle */}
        <div className="flex justify-center md:justify-start mt-4">
          <Button
            onClick={onToggleRecent}
            variant={includeRecent ? "default" : "outline"}
            size="sm"
            className={`flex items-center gap-2 ${includeRecent 
              ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600' 
              : 'border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Calendar className="h-4 w-4" />
            {includeRecent ? "Showing Past Shows" : "Show Past Shows"}
          </Button>
        </div>
        
        <p className="text-gray-400 mt-3 max-w-lg mx-auto md:mx-0">
          {!includeRecent 
            ? "Live schedule showing current and upcoming streams across all channels"
            : "Extended view including past shows from the last 24 hours"
          }
        </p>
      </div>
    </div>
  );
};

export default ScheduleHeader;