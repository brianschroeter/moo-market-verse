import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { YouTubeConnection } from "@/services/types/auth-types";
import { getAvatarPlaceholderStyle } from "@/utils/avatarUtils";

interface YouTubeConnectionCardProps {
  account: YouTubeConnection;
}

const YouTubeConnectionCard: React.FC<YouTubeConnectionCardProps> = ({ account }) => {
  // Generate consistent placeholder style
  const placeholderStyle = getAvatarPlaceholderStyle(account.youtube_channel_name);

  return (
    <div className="flex flex-col p-3 bg-lolcow-lightgray rounded-lg">
      <div className="flex items-center">
        <Avatar className="h-10 w-10 mr-3">
          {account.youtube_avatar && (
            <AvatarImage 
              src={account.youtube_avatar} 
              alt={`${account.youtube_channel_name} avatar`}
            />
          )}
          <AvatarFallback 
            style={{
              backgroundColor: placeholderStyle.backgroundColor,
              color: placeholderStyle.color,
              fontWeight: placeholderStyle.fontWeight
            }}
          >
            {placeholderStyle.initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-grow">
          <p className="text-white">{account.youtube_channel_name}</p>
          <p className="text-sm text-gray-400">{account.youtube_channel_id}</p>
        </div>
      </div>
    </div>
  );
};

export default YouTubeConnectionCard;
