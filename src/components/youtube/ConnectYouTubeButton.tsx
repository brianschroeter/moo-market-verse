
import React from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { signInWithDiscord } from "@/services/authService";

const ConnectYouTubeButton: React.FC = () => {
  const { toast } = useToast();
  
  const handleReconnectDiscord = async () => {
    try {
      toast({
        title: "Reconnecting to Discord",
        description: "Redirecting to Discord authentication to fetch your YouTube connections.",
      });
      await signInWithDiscord();
    } catch (error) {
      console.error("Discord reconnection error:", error);
      toast({
        title: "Connection Error",
        description: "Failed to initiate Discord reconnection.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-8">
      <p className="text-gray-300 mb-4 text-center">
        No YouTube accounts found connected to your Discord.
      </p>
      <div className="space-y-4">
        <Button 
          onClick={handleReconnectDiscord}
          className="bg-[#5865F2] hover:bg-[#4752c4]"
        >
          <i className="fa-brands fa-discord mr-2"></i>
          Reconnect Discord
        </Button>
        
        <div className="bg-lolcow-lightgray p-4 rounded-lg text-sm text-gray-300">
          <h4 className="text-white mb-2">How to connect YouTube to Discord:</h4>
          <ol className="list-decimal list-inside space-y-1">
            <li>Open Discord desktop or web app</li>
            <li>Go to User Settings &gt; Connections</li>
            <li>Click on the YouTube icon</li>
            <li>Log in to your YouTube account and authorize</li>
            <li>Return here and click "Reconnect Discord" above</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default ConnectYouTubeButton;
