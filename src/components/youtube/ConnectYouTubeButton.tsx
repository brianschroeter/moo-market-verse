
import React from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const ConnectYouTubeButton: React.FC = () => {
  const { toast } = useToast();
  
  const handleConnectYouTube = () => {
    toast({
      title: "Coming soon",
      description: "YouTube connection will be available shortly.",
    });
  };

  return (
    <div className="flex flex-col items-center justify-center py-8">
      <p className="text-gray-300 mb-4 text-center">
        You haven't connected any YouTube accounts yet.
      </p>
      <Button 
        onClick={handleConnectYouTube}
        className="bg-red-600 hover:bg-red-700"
      >
        <i className="fa-brands fa-youtube mr-2"></i>
        Connect YouTube
      </Button>
    </div>
  );
};

export default ConnectYouTubeButton;
