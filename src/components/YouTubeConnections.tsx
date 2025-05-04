import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { 
  YouTubeConnection, 
  YouTubeMembership,
  getYouTubeConnections, 
  getYouTubeMemberships,
  fetchAndSyncDiscordConnections
} from "@/services/authService";
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
  
  const fetchData = async () => {
    try {
      setLoading(true);
      const connections = await getYouTubeConnections();
      setAccounts(connections);
      
      if (connections.length > 0) {
        const membershipData = await getYouTubeMemberships();
        setMemberships(membershipData);
      }
    } catch (error) {
      console.error("Error fetching YouTube data:", error);
      toast({
        title: "Error",
        description: "Failed to load YouTube connections",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchData();
  }, []);
  
  const handleRefreshConnections = async () => {
    if (!session?.provider_token) {
      toast({
        title: "Session Expired",
        description: "Please log out and log back in to refresh your connections",
      });
      return;
    }
    
    try {
      setRefreshing(true);
      toast({
        title: "Refreshing",
        description: "Checking for new YouTube connections...",
      });
      
      const connections = await fetchAndSyncDiscordConnections();
      
      if (connections) {
        setAccounts(connections);
        if (connections.length > 0) {
          const membershipData = await getYouTubeMemberships();
          setMemberships(membershipData);
        }
        
        toast({
          title: "Refresh Complete",
          description: `Found ${connections.length} YouTube connections`,
        });
      } else {
        toast({
          title: "Refresh Failed",
          description: "Could not refresh YouTube connections",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error refreshing connections:", error);
      toast({
        title: "Error",
        description: "Failed to refresh YouTube connections",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
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
