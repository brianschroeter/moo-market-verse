
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

// Mock data - in a real app, this would come from your Supabase database
interface YouTubeAccount {
  id: string;
  channelName: string;
  avatar: string;
  isConnected: boolean;
}

interface MembershipRole {
  channelId: string;
  channelName: string;
  role: "crown" | "pay pig" | "cash cow" | "ban world";
  icon: string;
}

interface YouTubeConnectionsProps {
  accounts?: YouTubeAccount[];
  memberships?: MembershipRole[];
}

const YouTubeConnections: React.FC<YouTubeConnectionsProps> = ({ 
  accounts = [], 
  memberships = []
}) => {
  const { toast } = useToast();
  
  const handleConnectYouTube = () => {
    toast({
      title: "Coming soon",
      description: "YouTube connection will be available shortly.",
    });
  };
  
  const hasNoYouTubeConnections = accounts.length === 0;
  const hasOnlyBanWorldRole = !hasNoYouTubeConnections && 
    memberships.length > 0 && 
    memberships.every(m => m.role === "ban world");
  const hasYouTubeButNoMemberships = !hasNoYouTubeConnections && memberships.length === 0;
  
  const renderAlert = () => {
    if (hasNoYouTubeConnections) {
      return (
        <Alert className="bg-lolcow-lightgray border-lolcow-red mb-4">
          <AlertTitle className="text-lolcow-red">No YouTube Account Connected</AlertTitle>
          <AlertDescription>
            Connect your YouTube account to unlock memberships and access special features.
          </AlertDescription>
        </Alert>
      );
    }
    
    if (hasOnlyBanWorldRole) {
      return (
        <Alert className="bg-lolcow-lightgray border-lolcow-red mb-4">
          <AlertTitle className="text-lolcow-red">Limited Access</AlertTitle>
          <AlertDescription>
            Your current role (Ban World) doesn't provide access to the Discord server. 
            Please upgrade your membership or submit a support ticket if you believe this is an error.
          </AlertDescription>
        </Alert>
      );
    }
    
    if (hasYouTubeButNoMemberships) {
      return (
        <Alert className="bg-lolcow-lightgray border-yellow-600 mb-4">
          <AlertTitle className="text-yellow-500">No Memberships Found</AlertTitle>
          <AlertDescription>
            Your YouTube account is connected, but we couldn't find any active memberships. 
            If you believe this is an error, please submit a support ticket.
          </AlertDescription>
        </Alert>
      );
    }
    
    return null;
  };

  return (
    <Card className="lolcow-card w-full">
      <CardHeader>
        <CardTitle className="text-xl font-fredoka text-white flex items-center">
          <i className="fa-brands fa-youtube text-red-500 mr-2"></i> YouTube Connections
        </CardTitle>
      </CardHeader>
      <CardContent>
        {renderAlert()}
        
        {/* Connected YouTube accounts */}
        {accounts.length > 0 ? (
          <div className="space-y-4">
            <h3 className="text-white text-lg">Connected Accounts</h3>
            <div className="space-y-3">
              {accounts.map((account) => (
                <div key={account.id} className="flex items-center p-3 bg-lolcow-lightgray rounded-lg">
                  <img 
                    src={account.avatar} 
                    alt={account.channelName} 
                    className="w-10 h-10 rounded-full mr-3"
                  />
                  <div className="flex-grow">
                    <p className="text-white">{account.channelName}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
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
        )}
        
        {/* Memberships and roles */}
        {accounts.length > 0 && memberships.length > 0 && (
          <div className="mt-6 space-y-4">
            <h3 className="text-white text-lg">Your Memberships</h3>
            <div className="space-y-3">
              {memberships.map((membership, index) => (
                <div 
                  key={index} 
                  className={`flex items-center p-3 rounded-lg ${
                    membership.role === "ban world" 
                      ? "bg-lolcow-lightgray/50 border border-lolcow-red" 
                      : "bg-lolcow-lightgray"
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-lolcow-darkgray flex items-center justify-center mr-3">
                    <i className={membership.icon}></i>
                  </div>
                  <div className="flex-grow">
                    <p className="text-white">{membership.channelName}</p>
                    <p className={`text-sm ${getRoleColor(membership.role)}`}>
                      {formatRoleName(membership.role)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Helper functions
function formatRoleName(role: string): string {
  switch (role) {
    case "crown": return "Crown Member";
    case "pay pig": return "Pay Pig";
    case "cash cow": return "Cash Cow";
    case "ban world": return "Ban World";
    default: return role;
  }
}

function getRoleColor(role: string): string {
  switch (role) {
    case "crown": return "text-yellow-400";
    case "pay pig": return "text-purple-400";
    case "cash cow": return "text-green-400";
    case "ban world": return "text-red-500";
    default: return "text-gray-300";
  }
}

export default YouTubeConnections;
