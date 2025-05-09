import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { verifyYouTubeConnection } from '@/services/youtube/youtubeService';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Search, User } from 'lucide-react';

// Define Membership type locally or import if shared
interface MembershipInfo {
  membership_level: string;
  channel_name: string; 
}

// ---- Add props interface ----
interface ConnectYouTubeButtonProps {
  hasExistingConnections: boolean;
}
// ---- End props interface ----

const ConnectYouTubeButton: React.FC<ConnectYouTubeButtonProps> = ({ hasExistingConnections }) => {
  const [open, setOpen] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  const [fetchedDetails, setFetchedDetails] = useState<{
    id: string | null;
    name: string | null;
    pfpUrl: string | null;
    memberships: MembershipInfo[]; // Added memberships field
  } | null>(null);
  const [pfpLoadError, setPfpLoadError] = useState(false);
  const { toast } = useToast();

  const handleFetchDetails = async () => {
    if (!identifier.trim()) {
      toast({ title: "Input Error", description: "Please enter a YouTube Channel ID or @Username.", variant: "default" });
      return;
    }
    setIsFetchingDetails(true);
    setFetchedDetails(null);
    setPfpLoadError(false);

    try {
      console.log("[ConnectYouTubeButton] Fetching details for identifier:", identifier);
      const { data, error } = await supabase.functions.invoke(
        'get-youtube-channel-details',
        { body: { identifier: identifier.trim() } }
      );

      if (error) {
        console.error("[ConnectYouTubeButton] Error invoking get-youtube-channel-details:", error);
        if (error.message?.includes("Could not resolve") || error.context?.status === 404) {
            throw new Error(`Could not resolve '${identifier.trim()}' to a YouTube Channel ID.`);
        } else {
            throw new Error(error.message || "Failed to fetch channel details from function.");
        }
      }
      if (data && data.error) {
        console.error("[ConnectYouTubeButton] Function returned error:", data.error);
        throw new Error(data.error.details || data.error.message || "Function execution failed.");
      }
      if (!data || !data.id) {
        throw new Error(`Could not resolve '${identifier.trim()}' to a YouTube Channel ID (unexpected empty response).`);
      }

      console.log("[ConnectYouTubeButton] Fetched details:", data);
      setFetchedDetails({
        id: data.id,
        name: data.name || null,
        pfpUrl: data.pfpUrl || null,
        memberships: data.memberships || [] // Store memberships
      });
      if (!data.name || !data.pfpUrl) {
         toast({ title: "Details Limited", description: `Resolved to ID ${data.id}, but could not fetch name/PFP via API.`, variant: "default" });
      }

    } catch (err) {
      toast({
        title: "Fetch Error",
        description: err instanceof Error ? err.message : "Could not fetch YouTube channel details.",
        variant: "destructive"
      });
      setFetchedDetails(null);
    } finally {
      setIsFetchingDetails(false);
    }
  };

  const handleConnect = async () => {
    if (!fetchedDetails || !fetchedDetails.id) {
      toast({
        title: "Error",
        description: "Please fetch channel details first.",
        variant: "destructive",
      });
      return;
    }

    const resolvedChannelId = fetchedDetails.id;
    const resolvedChannelName = fetchedDetails.name || resolvedChannelId; 

    setIsConnecting(true);
    
    try {
      console.log("[ConnectYouTubeButton] Connecting resolved YouTube channel ID:", resolvedChannelId, "with name:", resolvedChannelName);
      
      const success = await verifyYouTubeConnection(
        resolvedChannelId,
        resolvedChannelName,
        null
      );
      
      if (success) {
        toast({
          title: "Success",
          description: "YouTube connection created! Verification is pending.",
        });
        setOpen(false);
        setIdentifier('');
        setFetchedDetails(null);
        setPfpLoadError(false);
        window.location.reload(); 
      } else {
        toast({
          title: "Error",
          description: "Failed to connect YouTube account. The backend verification might have failed.",
          variant: "destructive",
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("[ConnectYouTubeButton] Error connecting channel:", error);
      
      toast({
        title: "Error",
        description: `An exception occurred while connecting: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleOpenChange = (newOpenState: boolean) => {
    setOpen(newOpenState);
    if (!newOpenState) {
        setIdentifier('');
        setFetchedDetails(null);
        setIsFetchingDetails(false);
        setIsConnecting(false);
        setPfpLoadError(false);
    }
  }

  return (
    <div className="py-6">
      <div className="bg-lolcow-lightgray p-4 rounded-lg text-center">
        <p className="text-gray-300 mb-4">
          {/* Conditional Text */} 
          {hasExistingConnections
            ? "Need to add another YouTube account?"
            : "Connect your YouTube account to access membership benefits."} 
        </p>
        <Button
          onClick={() => setOpen(true)}
          className="bg-red-600 hover:bg-red-700 text-white"
        >
          <i className="fa-brands fa-youtube mr-2"></i>
          Connect YouTube
        </Button>

        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogContent className="bg-lolcow-darkgray border-lolcow-lightgray">
            <DialogHeader>
              <DialogTitle className="text-white">Connect YouTube Channel</DialogTitle>
              <DialogDescription className="text-gray-400">
                Enter your YouTube Channel ID or @Username to find and connect your channel.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-300">YouTube Channel ID or @Username</label>
                <div className="flex items-center space-x-2">
                  <Input
                    type="text"
                    placeholder="e.g., UC... or @YourHandle"
                    className="flex-grow bg-lolcow-lightgray border-lolcow-lightgray text-white"
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      setFetchedDetails(null);
                      setPfpLoadError(false);
                    }}
                  />
                  <Button 
                    type="button" 
                    onClick={handleFetchDetails} 
                    disabled={isFetchingDetails || !identifier.trim()}
                    variant="secondary"
                    size="sm"
                  >
                    {isFetchingDetails ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" /> 
                    )}
                    <span className="ml-2 hidden sm:inline">Fetch Details</span>
                  </Button>
                </div>
              </div>

              {isFetchingDetails && (
                 <div className="mt-4 flex items-center justify-center p-4 bg-lolcow-lightgray/30 rounded-md">
                     <Loader2 className="h-5 w-5 animate-spin text-lolcow-blue" />
                     <span className="ml-2 text-white">Fetching details...</span>
                 </div>
              )}
              
              {fetchedDetails && (
                  <div className="mt-4 p-3 bg-lolcow-lightgray/30 rounded-md border border-lolcow-lightgray/50">
                    <h4 className="text-md font-semibold text-white mb-3">Channel Found:</h4>
                    <div className="flex items-center space-x-3">
                        {!pfpLoadError && fetchedDetails.pfpUrl ? (
                            <img 
                                src={fetchedDetails.pfpUrl} 
                                alt={fetchedDetails.name || 'Channel PFP'} 
                                className="w-12 h-12 rounded-full bg-lolcow-lightgray/30"
                                onError={() => setPfpLoadError(true)} 
                            />
                        ) : fetchedDetails.name ? (
                            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-lolcow-blue text-white text-xl font-semibold">
                                {fetchedDetails.name.charAt(0).toUpperCase()}
                            </div>
                        ) : (
                            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-lolcow-lightgray text-gray-400">
                                <User size={24}/>
                            </div>
                        )}
                        <div>
                            <p className="text-white font-medium">{fetchedDetails.name || "(Name not found)"}</p>
                            <p className="text-gray-400 text-xs font-mono">ID: {fetchedDetails.id}</p>
                        </div>
                     </div>
                     {/* --- Display Memberships --- */}
                     {fetchedDetails.memberships && fetchedDetails.memberships.length > 0 && (
                       <div className="mt-3 pt-3 border-t border-lolcow-lightgray/30">
                         <h5 className="text-sm font-semibold text-white mb-1">Memberships Found (in DB):</h5>
                         <ul className="list-disc list-inside text-gray-400 text-xs space-y-1">
                           {fetchedDetails.memberships.map((mem, index) => {
                             // Format channel name: add space after "Lolcow" if followed by an uppercase letter
                             const formattedChannelName = mem.channel_name.replace(/(Lolcow)([A-Z])/g, '$1 $2');
                             return (
                               <li key={index}>{mem.membership_level} for {formattedChannelName}</li>
                             );
                           })}
                         </ul>
                       </div>
                     )}
                     {(!fetchedDetails.memberships || fetchedDetails.memberships.length === 0) && (
                       <p className="text-xs text-gray-500 mt-2">No existing memberships found in DB for this Channel ID.</p>
                     )}
                     {/* --- End Display Memberships --- */}
                     <p className="text-xs text-gray-400 mt-3">
                        <i className="fa-solid fa-check-circle mr-1 text-green-500"></i>
                        If this is correct, click 'Connect Channel' below.
                     </p>
                  </div>
              )}
            </div>

            <DialogFooter>
              <Button 
                onClick={() => setOpen(false)}
                variant="outline" 
                className="bg-transparent border-gray-500 text-gray-300 hover:bg-gray-700 hover:text-white"
                disabled={isConnecting}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleConnect}
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={isConnecting || isFetchingDetails || !fetchedDetails?.id}
              >
                {isConnecting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Connecting...</>
                ) : (
                  'Connect Channel'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default ConnectYouTubeButton;
