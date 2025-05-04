
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { StoredDiscordConnection, getDiscordConnections } from "@/services/authService";

const DiscordConnections: React.FC = () => {
  const [connections, setConnections] = useState<StoredDiscordConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  useEffect(() => {
    const fetchConnections = async () => {
      try {
        const connectionData = await getDiscordConnections();
        setConnections(connectionData);
      } catch (error) {
        console.error("Error loading Discord connections:", error);
        toast({
          title: "Error",
          description: "Failed to load Discord connections",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchConnections();
  }, [toast]);

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
              <i className="fa-brands fa-discord text-lg mr-3 text-gray-400"></i>
              <span className="text-gray-300">Connected</span>
            </div>
            <span className="text-green-500">
              <i className="fa-solid fa-check-circle mr-1"></i>
              Active
            </span>
          </div>
          
          {loading ? (
            <div className="text-center py-4">
              <p className="text-gray-400">Loading connections...</p>
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="text-white font-semibold">Connected Accounts</h3>
              
              {connections.length === 0 ? (
                <p className="text-gray-400">No external accounts connected</p>
              ) : (
                connections.map((connection) => (
                  <div 
                    key={connection.id} 
                    className="flex items-center space-x-3 p-3 bg-lolcow-lightgray rounded-lg"
                  >
                    <Avatar className="h-10 w-10">
                      {connection.connection_type === 'youtube' ? (
                        <AvatarImage 
                          src={connection.avatar_url || `https://i.pravatar.cc/40?u=${connection.connection_id}`} 
                          alt={connection.connection_name} 
                        />
                      ) : connection.connection_type === 'twitch' ? (
                        <AvatarImage 
                          src={connection.avatar_url || `https://i.pravatar.cc/40?u=${connection.connection_id}`} 
                          alt={connection.connection_name}
                        />
                      ) : (
                        <AvatarImage 
                          src={connection.avatar_url || `https://i.pravatar.cc/40?u=${connection.connection_id}`}
                          alt={connection.connection_name}
                        />
                      )}
                      <AvatarFallback className="bg-gray-700">
                        {connection.connection_type.substring(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-grow">
                      <p className="text-white">{connection.connection_name}</p>
                      <div className="flex items-center">
                        <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded-full">
                          {connection.connection_type}
                        </span>
                        {connection.connection_verified ? (
                          <span className="text-xs text-green-500 ml-2 flex items-center">
                            <i className="fa-solid fa-check-circle mr-1"></i> Verified
                          </span>
                        ) : (
                          <span className="text-xs text-yellow-500 ml-2">Unverified</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
          
          <div className="bg-lolcow-lightgray p-4 rounded-lg">
            <h3 className="text-white text-lg mb-2">Server Access</h3>
            <p className="text-gray-300">
              Based on your membership roles, you have access to the LolCow Discord server.
            </p>
            <Button variant="outline" className="mt-3" size="sm" asChild>
              <a href="https://discord.gg/lolcow" target="_blank" rel="noopener noreferrer">
                <i className="fa-brands fa-discord mr-1"></i>
                Join Server
                <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DiscordConnections;
