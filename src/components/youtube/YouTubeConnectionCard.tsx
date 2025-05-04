
import React, { useState } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw } from "lucide-react";
import { YouTubeConnection } from "@/services/types/auth-types";
import { refreshYouTubeAvatar } from "@/services/youtube/youtubeService";

interface YouTubeConnectionCardProps {
  account: YouTubeConnection;
}

const YouTubeConnectionCard: React.FC<YouTubeConnectionCardProps> = ({ account }) => {
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [localAccount, setLocalAccount] = useState<YouTubeConnection>(account);

  // Get YouTube avatar or use fallback
  const avatarUrl = localAccount.youtube_avatar || 
    `https://i.pravatar.cc/40?u=${localAccount.youtube_channel_id}`;

  const handleRefreshAvatar = async () => {
    setIsRefreshing(true);
    try {
      const success = await refreshYouTubeAvatar(localAccount);
      
      if (success) {
        toast({
          title: "Avatar Refreshed",
          description: "YouTube avatar successfully updated.",
        });
        
        // Reload page to show updated avatar
        window.location.reload();
      } else {
        toast({
          title: "Refresh Failed",
          description: "Could not refresh the YouTube avatar.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error refreshing avatar:", error);
      toast({
        title: "Error",
        description: "An error occurred while refreshing the avatar.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="flex items-center p-3 bg-lolcow-lightgray rounded-lg">
      <Avatar className="h-10 w-10 mr-3">
        <AvatarImage 
          src={avatarUrl} 
          alt={localAccount.youtube_channel_name} 
          className="object-cover"
        />
        <AvatarFallback className="bg-gray-700 text-white">
          {localAccount.youtube_channel_name.substring(0, 1).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-grow">
        <p className="text-white">{localAccount.youtube_channel_name}</p>
        <p className="text-sm text-gray-400">{localAccount.youtube_channel_id}</p>
        {!localAccount.is_verified && (
          <span className="text-xs text-yellow-500">Verification pending</span>
        )}
      </div>
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={handleRefreshAvatar}
        disabled={isRefreshing}
        className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-gray-700"
        title="Refresh avatar from YouTube"
      >
        <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        <span className="sr-only">Refresh Avatar</span>
      </Button>
    </div>
  );
};

export default YouTubeConnectionCard;
