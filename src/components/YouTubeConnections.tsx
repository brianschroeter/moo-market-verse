import React, { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { 
  // Types are likely imported separately or from a shared types file
  getYouTubeConnections, 
  getYouTubeMemberships,
  refreshYouTubeAvatar
} from "@/services/youtube/youtubeService";
import { YouTubeConnection, YouTubeMembership } from "@/services/types/auth-types"; // Import types correctly
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

// Import our components
import YouTubeStatusAlerts from "./youtube/YouTubeStatusAlerts";
import ConnectYouTubeButton from "./youtube/ConnectYouTubeButton";
import YouTubeConnectionsList from "./youtube/YouTubeConnectionsList";
import YouTubeMembershipsList from "./youtube/YouTubeMembershipsList";

const YouTubeConnections: React.FC = () => {
  const { toast } = useToast();
  const { session } = useAuth();
  const [accounts, setAccounts] = useState<YouTubeConnection[]>([]);
  const [memberships, setMemberships] = useState<YouTubeMembership[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  
  const refreshYouTubeData = useCallback(async (showToast = false) => {
    if (!session?.user?.id) {
        console.log("No user session found for refresh.");
        return;
    }
    
    setRefreshing(true);
    if (showToast) {
        toast({
            title: "Refreshing",
            description: "Updating YouTube connections and avatars...",
        });
    }

    let refreshedConnections: YouTubeConnection[] = [];
    let refreshErrors = 0;

    try {
        const currentConnections = await getYouTubeConnections();
        
        const refreshPromises = currentConnections.map(async (conn) => {
            console.log(`Refreshing avatar for ${conn.youtube_channel_name} (${conn.youtube_channel_id})`);
            const result = await refreshYouTubeAvatar(conn);
            if (result.success && result.avatarUrl) {
                console.log(`Successfully refreshed avatar for ${conn.youtube_channel_name}: ${result.avatarUrl}`);
                return { ...conn, youtube_avatar: result.avatarUrl };
            } else {
                console.error(`Failed to refresh avatar for ${conn.youtube_channel_name}: ${result.error}`);
                refreshErrors++;
                return conn;
            }
        });
        
        refreshedConnections = await Promise.all(refreshPromises);
        setAccounts(refreshedConnections);

        if (refreshedConnections.length > 0) {
            const membershipData = await getYouTubeMemberships();
            setMemberships(membershipData);
        } else {
            setMemberships([]);
        }

        if (showToast) {
            if (refreshErrors > 0) {
                toast({
                    title: "Refresh Complete (with errors)",
                    description: `Updated connections. Failed to refresh ${refreshErrors} avatar(s).`,
                    variant: "default",
                });
            } else {
                toast({
                    title: "Refresh Complete",
                    description: `Successfully updated ${refreshedConnections.length} YouTube connections.`,
                });
            }
        }

    } catch (error) {
        console.error("Error refreshing YouTube data:", error);
        if (showToast) {
            toast({
                title: "Error",
                description: "Failed to refresh YouTube connections.",
                variant: "destructive",
            });
        }
    } finally {
        setRefreshing(false);
        setLoading(false);
    }
  }, [session, toast]);

  useEffect(() => {
    setLoading(true);
    refreshYouTubeData(false);
  }, [refreshYouTubeData]);
  
  const handleRefreshConnections = () => {
    refreshYouTubeData(true);
  };
  
  const hasNoYouTubeConnections = accounts.length === 0;
  const hasOnlyBanWorldRole = !hasNoYouTubeConnections && 
    memberships.length > 0 && 
    memberships.every(m => m.membership_level === "ban world");
  const hasYouTubeButNoMemberships = !hasNoYouTubeConnections && memberships.length === 0;

  if (loading) {
    return (
      <Card className="lolcow-card w-full">
        <CardHeader>
          <CardTitle className="text-xl font-fredoka text-white flex items-center">
            <i className="fa-brands fa-youtube text-red-500 mr-2"></i> YouTube Connections
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <p className="text-gray-300">Loading YouTube connections...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="lolcow-card w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl font-fredoka text-white flex items-center">
          <i className="fa-brands fa-youtube text-red-500 mr-2"></i> YouTube Connections
        </CardTitle>
        
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleRefreshConnections}
          disabled={refreshing}
          className="h-8 px-2 lg:px-3 hover:text-black"
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </CardHeader>
      <CardContent>
        <YouTubeStatusAlerts 
          hasNoYouTubeConnections={hasNoYouTubeConnections}
          hasOnlyBanWorldRole={hasOnlyBanWorldRole}
          hasYouTubeButNoMemberships={hasYouTubeButNoMemberships}
        />
        
        {/* Connected YouTube accounts */}
        {hasNoYouTubeConnections ? (
          <ConnectYouTubeButton />
        ) : (
          <YouTubeConnectionsList accounts={accounts} />
        )}
        
        {/* Memberships and roles */}
        <YouTubeMembershipsList 
          memberships={memberships}
          showMemberships={accounts.length > 0 && memberships.length > 0}
        />
      </CardContent>
    </Card>
  );
};

export default YouTubeConnections;
