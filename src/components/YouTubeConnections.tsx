import React, { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { 
  // Types are likely imported separately or from a shared types file
  getYouTubeConnections, 
  getYouTubeMemberships,
  // refreshYouTubeAvatar // No longer used here
} from "@/services/youtube/youtubeService";
import { YouTubeConnection, YouTubeMembership } from "@/services/types/auth-types"; // Import types correctly
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { fetchAndSyncDiscordConnections } from "@/services/discord/discordService"; // Import the service function directly

// Import our components
import YouTubeStatusAlerts from "./youtube/YouTubeStatusAlerts";
import ConnectYouTubeButton from "./youtube/ConnectYouTubeButton";
import YouTubeConnectionsList from "./youtube/YouTubeConnectionsList";
import YouTubeMembershipsList from "./youtube/YouTubeMembershipsList";

const YouTubeConnections: React.FC = () => {
  const { toast } = useToast();
  const { session } = useAuth(); // Get session from AuthContext
  const [accounts, setAccounts] = useState<YouTubeConnection[]>([]);
  const [memberships, setMemberships] = useState<YouTubeMembership[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  
  // Debounce the initial data fetching
  const initialFetchDone = useRef<boolean>(false);
  
  // Function to fetch YT connections and memberships for UI update
  const fetchYouTubeDisplayData = async () => {
    try {
      const connections = await getYouTubeConnections();
      setAccounts(connections);
      if (connections.length > 0) {
        const memberships = await getYouTubeMemberships();
        setMemberships(memberships);
      } else {
        setMemberships([]);
      }
    } catch (error) {
      console.error("Error fetching YouTube display data:", error);
      toast({ title: "Error", description: "Could not load YouTube connections.", variant: "destructive" });
    }
  };

  useEffect(() => {
    // Prevent duplicate initial data fetching
    if (!initialFetchDone.current) {
      initialFetchDone.current = true;
      setLoading(true);
      fetchYouTubeDisplayData().finally(() => setLoading(false)); // Fetch initial data
    }
  }, [toast]); // Dependency array updated, session removed if not needed

  const handleRefreshConnections = async () => {
    if (refreshing) return;
    
    // Check if we have the necessary session details from useAuth
    if (!session?.user?.id || !session?.provider_token) {
      toast({
        title: "Refresh Error",
        description: "Missing user session or Discord token. Please try signing out and back in.",
        variant: "destructive",
      });
      return;
    }

    setRefreshing(true);
    toast({
      title: "Refreshing Discord & YouTube Data",
      description: "Please wait...",
    });

    try {
      // Call the service function directly with required details and force=true
      await fetchAndSyncDiscordConnections({ 
        userId: session.user.id, 
        providerToken: session.provider_token, 
        force: true 
      });
      
      toast({
        title: "Discord Sync Complete",
        description: "Fetching updated YouTube connections...",
      });
      await fetchYouTubeDisplayData(); // Fetch updated YT data for display
      toast({
        title: "Refresh Complete",
        description: "YouTube connections updated.",
      });
    } catch (error) {
      console.error("Error during full refresh:", error);
      toast({ title: "Refresh Error", description: "Failed to refresh data.", variant: "destructive" });
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
          disabled={refreshing || !session?.provider_token}
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
