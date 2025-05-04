
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { verifyYouTubeConnection } from '@/services/youtube/youtubeService';

const ConnectYouTubeButton: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [channelId, setChannelId] = useState('');
  const [channelName, setChannelName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const { toast } = useToast();

  const handleConnect = async () => {
    if (!channelId.trim()) {
      toast({
        title: "Error",
        description: "Channel ID is required",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    setDebugInfo("Connecting to YouTube channel...");
    
    try {
      console.log("[ConnectYouTubeButton] Connecting YouTube channel:", channelId);
      setDebugInfo(prev => `${prev}\nSending connection request...`);
      
      const success = await verifyYouTubeConnection(
        channelId.trim(),
        channelName.trim(), 
        null // Let the API fetch the avatar automatically
      );

      setDebugInfo(prev => `${prev}\nConnection response: ${success ? "Success" : "Failed"}`);
      
      if (success) {
        toast({
          title: "Success",
          description: "YouTube connection created! Verification is pending.",
        });
        setOpen(false);
        // Refresh page to show new connection
        window.location.reload();
      } else {
        toast({
          title: "Error",
          description: "Failed to connect YouTube account",
          variant: "destructive",
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("[ConnectYouTubeButton] Error connecting channel:", error);
      setDebugInfo(prev => `${prev}\nException: ${errorMessage}`);
      
      toast({
        title: "Error",
        description: "An exception occurred while connecting the channel",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="py-6">
      <div className="bg-lolcow-lightgray p-4 rounded-lg text-center">
        <p className="text-gray-300 mb-4">
          Connect your YouTube account to access membership benefits.
        </p>
        <Button
          onClick={() => setOpen(true)}
          className="bg-red-600 hover:bg-red-700 text-white"
        >
          <i className="fa-brands fa-youtube mr-2"></i>
          Connect YouTube
        </Button>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="bg-lolcow-darkgray border-lolcow-lightgray">
            <DialogHeader>
              <DialogTitle className="text-white">Connect YouTube Channel</DialogTitle>
              <DialogDescription className="text-gray-400">
                Enter your YouTube channel information below.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-300">YouTube Channel ID</label>
                <Input
                  type="text"
                  placeholder="e.g. UCzXVyw3hQ3fKDHX009LFJGQ"
                  className="bg-lolcow-lightgray border-lolcow-lightgray text-white"
                  value={channelId}
                  onChange={(e) => setChannelId(e.target.value)}
                />
                <p className="text-xs text-gray-400">This is the unique identifier for your channel</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-300">Channel Name (Optional)</label>
                <Input
                  type="text"
                  placeholder="e.g. My Gaming Channel"
                  className="bg-lolcow-lightgray border-lolcow-lightgray text-white"
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                />
                <p className="text-xs text-gray-400">Leave blank to use the name from YouTube</p>
              </div>

              <div className="bg-gray-700 p-3 rounded-md">
                <p className="text-xs text-gray-300">
                  <i className="fa-solid fa-info-circle mr-1"></i>
                  Your channel avatar will be automatically fetched from YouTube's API
                </p>
              </div>
              
              {debugInfo && (
                <div className="bg-gray-700 p-3 rounded-md mt-4">
                  <p className="text-xs text-white font-bold mb-1">Debug Information:</p>
                  <pre className="text-xs text-gray-300 overflow-auto max-h-32 whitespace-pre-wrap">{debugInfo}</pre>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button 
                onClick={() => setOpen(false)}
                variant="outline" 
                className="bg-transparent border-gray-500 text-gray-300 hover:bg-gray-700 hover:text-white"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleConnect}
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Connecting...' : 'Connect Channel'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default ConnectYouTubeButton;
