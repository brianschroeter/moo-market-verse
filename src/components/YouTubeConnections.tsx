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
import { RefreshCw, Clock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { fetchAndSyncDiscordConnections } from "@/services/discord/discordService"; // Import the service function directly

// Import our components
import YouTubeStatusAlerts from "./youtube/YouTubeStatusAlerts";
import ConnectYouTubeButton from "./youtube/ConnectYouTubeButton";
import YouTubeConnectionsList from "./youtube/YouTubeConnectionsList";
import YouTubeMembershipsList from "./youtube/YouTubeMembershipsList";

const COOLDOWN_DURATION_MS = 5 * 60 * 1000; // 5 minutes in milliseconds
const REFRESH_COOLDOWN_KEY = 'youtubeRefreshCooldownEnd';

// Helper function to format remaining time
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

const YouTubeConnections: React.FC = () => {
  const { toast } = useToast();
  const { session } = useAuth(); // Get session from AuthContext
  const [accounts, setAccounts] = useState<YouTubeConnection[]>([]);
  const [memberships, setMemberships] = useState<YouTubeMembership[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  
  // Cooldown State
  const [cooldownActive, setCooldownActive] = useState<boolean>(false);
  const [cooldownEndTime, setCooldownEndTime] = useState<number | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const cooldownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Debounce the initial data fetching
  const initialFetchDone = useRef<boolean>(false);
  
  // --- Cooldown Timer Logic ---
  useEffect(() => {
    // Function to start the timer interval
    const startTimer = (endTime: number) => {
      if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current); // Clear existing timer

      setCooldownEndTime(endTime);
      setCooldownActive(true);

      cooldownIntervalRef.current = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, (endTime - now) / 1000);
        setCooldownRemaining(remaining);

        if (remaining <= 0) {
          setCooldownActive(false);
          setCooldownEndTime(null);
          localStorage.removeItem(REFRESH_COOLDOWN_KEY);
          if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current);
        }
      }, 1000);
    };

    // Check localStorage on mount
    const storedEndTime = localStorage.getItem(REFRESH_COOLDOWN_KEY);
    if (storedEndTime) {
      const endTime = parseInt(storedEndTime, 10);
      const now = Date.now();
      if (endTime > now) {
        startTimer(endTime); // Start timer if cooldown is still valid
      } else {
        localStorage.removeItem(REFRESH_COOLDOWN_KEY); // Clear expired cooldown
      }
    }

    // Cleanup interval on unmount
    return () => {
      if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current);
    };
  }, []); // Run only on mount and unmount

  // Function to activate cooldown
  const activateCooldown = () => {
    const endTime = Date.now() + COOLDOWN_DURATION_MS;
    localStorage.setItem(REFRESH_COOLDOWN_KEY, endTime.toString());
    
    // Ensure timer starts immediately after activation
    if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current); 

    setCooldownEndTime(endTime);
    setCooldownActive(true);
    setCooldownRemaining(COOLDOWN_DURATION_MS / 1000); // Initial display value

    cooldownIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, (endTime - now) / 1000);
      setCooldownRemaining(remaining);

      if (remaining <= 0) {
        setCooldownActive(false);
        setCooldownEndTime(null);
        localStorage.removeItem(REFRESH_COOLDOWN_KEY);
        if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current);
      }
    }, 1000);
  };
  // --- End Cooldown Timer Logic ---

  // Function to fetch YT connections and memberships for UI update
  const fetchYouTubeDisplayData = useCallback(async () => {
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
  }, [toast]);

  useEffect(() => {
    // Prevent duplicate initial data fetching
    if (!initialFetchDone.current) {
      initialFetchDone.current = true;
      setLoading(true);
      fetchYouTubeDisplayData().finally(() => setLoading(false)); // Fetch initial data
    }
  }, [fetchYouTubeDisplayData]); // Depend on the memoized fetch function

  const handleRefreshConnections = async () => {
    // Check cooldown first
    if (cooldownActive) {
      toast({
          title: "Cooldown Active",
          description: `Please wait ${formatTime(cooldownRemaining)} before refreshing again.`,
          variant: "default"
      });
      return;
    }
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
      
      // Activate cooldown AFTER successful refresh
      activateCooldown(); 

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
          disabled={refreshing || cooldownActive || !session?.provider_token}
          className="h-8 px-2 lg:px-3 hover:text-black min-w-[80px]"
          title={
              !session?.provider_token ? "Discord token missing. Please sign out and back in." 
            : cooldownActive ? `Refresh available in ${formatTime(cooldownRemaining)}`
            : refreshing ? "Refresh in progress..."
            : "Refresh Discord & YouTube connections"
          }
        >
          {cooldownActive ? (
            <>
              <Clock className="h-4 w-4 mr-1" /> 
              <span className="hidden sm:inline">{formatTime(cooldownRemaining)}</span>
              <span className="sm:hidden">{formatTime(cooldownRemaining)}</span>
            </>
          ) : (
            <>
              <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </>
          )}
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
          null 
        ) : (
          <YouTubeConnectionsList accounts={accounts} />
        )}
        
        {/* Memberships and roles */}
        <YouTubeMembershipsList 
          memberships={memberships}
          showMemberships={accounts.length > 0 && memberships.length > 0}
        />

        {/* Always render the Connect button, pass prop */} 
        <ConnectYouTubeButton hasExistingConnections={accounts.length > 0} />

      </CardContent>
    </Card>
  );
};

export default YouTubeConnections;
