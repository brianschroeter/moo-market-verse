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
  getYouTubeMemberships 
} from "@/services/authService";
import { YouTubeConnection as YouTubeConnectionFromYoutubeService } from "@/services/youtube/youtubeService";
import { Membership } from "@/services/authService";
import { useAuth } from "@/context/AuthContext";

const DiscordConnections: React.FC = () => {
  const [connections, setConnections] = useState<StoredDiscordConnection[]>([]);
  const [youtubeConnections, setYoutubeConnections] = useState<YouTubeConnectionFromYoutubeService[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { profile } = useAuth();
  
  useEffect(() => {
    const fetchConnectionsAndMemberships = async () => {
      setLoading(true);
      try {
        const [discordConnectionData, youtubeConnectionData, membershipData] = await Promise.all([
          getDiscordConnections(),
          getYouTubeMemberships(),
          getUserMemberships()
        ]);
        
        setConnections(discordConnectionData);
        setYoutubeConnections(youtubeConnectionData);
        setMemberships(membershipData);

      } catch (error) {
        console.error("Error loading connections or memberships:", error);
        toast({
          title: "Error",
          description: "Failed to load connections or membership data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchConnectionsAndMemberships();
  }, [toast]);

  const getDiscordAvatarUrl = () => {
    if (profile?.discord_id && profile?.discord_avatar) {
      return `https://cdn.discordapp.com/avatars/${profile.discord_id}/${profile.discord_avatar}.png?size=128`;
    }
    return null;
  };

  // Determine if Discord access should be shown
  const hasYouTubeConnection = youtubeConnections.length > 0;
  const hasMemberships = memberships.length > 0;
  // Assuming 'ban_world' is the identifier for the Ban World tier
  const onlyHasBanWorld = hasMemberships && memberships.every(m => m.membership_level === 'ban_world');
  
  const showDiscordAccess = hasYouTubeConnection && hasMemberships && !onlyHasBanWorld;

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
          
          {showDiscordAccess ? (
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
          ) : (
            <div className="bg-lolcow-lightgray p-4 rounded-lg">
              <h3 className="text-white text-lg mb-2">Discord Access Not Ready</h3>
              <p className="text-gray-300 text-sm">
                {!hasYouTubeConnection && "Please connect your YouTube account first."}
                {hasYouTubeConnection && !hasMemberships && "You need an active YouTube membership to access the Discord server."}
                {hasYouTubeConnection && onlyHasBanWorld && "Your current membership tier does not grant Discord access."}
              </p>
              {/* Optionally add buttons to connect YT or view memberships */}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default DiscordConnections;
