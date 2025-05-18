import React from 'react';
import { Trophy, Sparkles, Star } from "lucide-react";

const LeaderboardHeader = () => {
  const currentDate = new Date();
  const month = currentDate.toLocaleString('default', { month: 'long' });
  const year = currentDate.getFullYear();

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
            Top Shows - {month} {year}
          </h2>
          <div className="flex items-center ml-2">
            <span className="h-2.5 w-2.5 bg-red-500 rounded-full mr-1.5"></span>
            <span className="text-xs font-medium text-red-400 uppercase tracking-wider">Live</span>
          </div>
        </div>
        <p className="text-gray-400 mt-1 max-w-lg mx-auto md:mx-0">
          Monthly rankings based on viewer engagement metrics and donation activity
        </p>
      </div>
    </div>
  );
};

export default LeaderboardHeader; 