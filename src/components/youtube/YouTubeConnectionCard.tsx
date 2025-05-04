
import React from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { YouTubeConnection } from "@/services/types/auth-types";

interface YouTubeConnectionCardProps {
  account: YouTubeConnection;
}

const YouTubeConnectionCard: React.FC<YouTubeConnectionCardProps> = ({ account }) => {
  // Get YouTube avatar or use fallback
  const avatarUrl = account.youtube_avatar || 
    `https://i.pravatar.cc/40?u=${account.youtube_channel_id}`;

  return (
    <div className="flex items-center p-3 bg-lolcow-lightgray rounded-lg">
      <Avatar className="h-10 w-10 mr-3">
        <AvatarImage 
          src={avatarUrl} 
          alt={account.youtube_channel_name} 
          className="object-cover"
        />
        <AvatarFallback className="bg-gray-700 text-white">
          {account.youtube_channel_name.substring(0, 1).toUpperCase()}
        </AvatarFallback>
      </Avatar>
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
