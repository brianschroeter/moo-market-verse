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
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  // Get YouTube avatar or use fallback
  const avatarUrl = localAccount.youtube_avatar || 
    `https://i.pravatar.cc/40?u=${localAccount.youtube_channel_id}`;

  const handleRefreshAvatar = async () => {
    setIsRefreshing(true);
    setDebugInfo("Starting avatar refresh request...");
    
    try {
      console.log("[YouTubeConnectionCard] Starting refresh for channel:", localAccount.youtube_channel_id);
      setDebugInfo(prev => `${prev}\nSending request to refresh avatar...`);
      
      const result = await refreshYouTubeAvatar(localAccount);
      console.log("[YouTubeConnectionCard] Refresh avatar response:", result);
      
      setDebugInfo(prev => `${prev}\nReceived response: ${JSON.stringify(result, null, 2)}`);
      
      if (result.success) {
        toast({
          title: "Avatar Refreshed",
          description: "YouTube avatar successfully updated.",
        });
        
        if (result.avatarUrl) {
          // Update local state to show new avatar immediately without page refresh
          setLocalAccount({
            ...localAccount,
            youtube_avatar: result.avatarUrl
          });
          setDebugInfo(prev => `${prev}\nAvatar updated successfully with URL: ${result.avatarUrl}`);
        } else {
          setDebugInfo(prev => `${prev}\nSuccess reported but no avatar URL returned. Reloading page.`);
          // Reload page as fallback if no avatar URL returned
          window.location.reload();
        }
      } else {
        const errorMsg = result.error || "Could not refresh the YouTube avatar.";
        setDebugInfo(prev => `${prev}\nError: ${errorMsg}`);
        
        toast({
          title: "Refresh Failed",
          description: errorMsg,
          variant: "destructive",
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("[YouTubeConnectionCard] Error refreshing avatar:", error);
      setDebugInfo(prev => `${prev}\nException: ${errorMessage}`);
      
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
    <div className="flex flex-col p-3 bg-lolcow-lightgray rounded-lg">
      <div className="flex items-center">
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
      </div>
      
      {debugInfo && (
        <div className="mt-2 p-2 bg-gray-700 rounded text-xs text-gray-300 overflow-auto max-h-48">
          <p className="font-mono whitespace-pre-wrap">{debugInfo}</p>
        </div>
      )}
    </div>
  );
};

export default YouTubeConnectionCard;
