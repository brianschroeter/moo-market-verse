import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  StoredDiscordConnection, 
  getDiscordConnections,
  YouTubeConnection, 
  getYouTubeConnections 
} from "@/services/authService";
import { useAuth } from "@/context/AuthContext";

const DiscordConnections: React.FC = () => {
  const [connections, setConnections] = useState<StoredDiscordConnection[]>([]);
  const [youtubeConnections, setYoutubeConnections] = useState<Record<string, YouTubeConnection>>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { profile } = useAuth();
  
  useEffect(() => {
    const fetchConnections = async () => {
      setLoading(true);
      try {
        const [discordConnectionData, youtubeConnectionData] = await Promise.all([
          getDiscordConnections(),
          getYouTubeConnections()
        ]);
        
        setConnections(discordConnectionData);
        
        // Create a map of YouTube connections keyed by channel ID for easy lookup
        const youtubeMap: Record<string, YouTubeConnection> = {};
        youtubeConnectionData.forEach(conn => {
          youtubeMap[conn.youtube_channel_id] = conn;
        });
        setYoutubeConnections(youtubeMap);

      } catch (error) {
        console.error("Error loading Discord connections:", error);
        toast({
          title: "Error",
          description: "Failed to load Discord connections",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchConnections();
  }, [toast]);

  const getDiscordAvatarUrl = () => {
    if (profile?.discord_id && profile?.discord_avatar) {
      return `https://cdn.discordapp.com/avatars/${profile.discord_id}/${profile.discord_avatar}.png?size=128`;
    }
    return null;
  };

  return (
    <Card className="lolcow-card">
      <CardHeader>
        <CardTitle className="text-xl font-fredoka text-white flex items-center">
          <i className="fa-brands fa-discord text-lolcow-blue mr-2"></i> Discord
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2 border-b border-lolcow-lightgray last:border-0">
            <div className="flex items-center">
              {profile && (
                <Avatar className="h-8 w-8 mr-3">
                  <AvatarImage
                    src={getDiscordAvatarUrl() || undefined}
                    alt={profile.discord_username}
                  />
                  <AvatarFallback className="bg-lolcow-darkgray text-white">
                    {profile.discord_username?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              )}
              <div className="flex flex-col">
                <span className="text-gray-300">{profile?.discord_username || 'Connected'}</span>
                <span className="text-green-500 text-xs">
                  <i className="fa-solid fa-check-circle mr-1"></i>
                  Active
                </span>
              </div>
            </div>
          </div>
          
          <div className="bg-lolcow-lightgray p-4 rounded-lg">
            <h3 className="text-white text-lg mb-2">Server Access</h3>
            <p className="text-gray-300">
              Based on your membership roles, you have access to the LolCow Discord server.
            </p>
            <Button 
              className="mt-3 bg-purple-600 hover:bg-purple-700 text-white hover:scale-105 transition-transform duration-200 ease-in-out"
              size="sm" 
              asChild
            >
              <a href="https://discord.gg/lolcow" target="_blank" rel="noopener noreferrer">
                <i className="fa-brands fa-discord mr-1"></i>
                Join Server
                <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DiscordConnections;
