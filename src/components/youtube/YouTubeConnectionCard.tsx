
import React from "react";
import { YouTubeConnection } from "@/services/authService";

interface YouTubeConnectionCardProps {
  account: YouTubeConnection;
}

const YouTubeConnectionCard: React.FC<YouTubeConnectionCardProps> = ({ account }) => {
  return (
    <div className="flex items-center p-3 bg-lolcow-lightgray rounded-lg">
      <img 
        src={account.youtube_avatar || "https://via.placeholder.com/40"} 
        alt={account.youtube_channel_name} 
        className="w-10 h-10 rounded-full mr-3"
      />
      <div className="flex-grow">
        <p className="text-white">{account.youtube_channel_name}</p>
        <p className="text-sm text-gray-400">{account.youtube_channel_id}</p>
        {!account.is_verified && (
          <span className="text-xs text-yellow-500">Verification pending</span>
        )}
      </div>
    </div>
  );
};

export default YouTubeConnectionCard;
