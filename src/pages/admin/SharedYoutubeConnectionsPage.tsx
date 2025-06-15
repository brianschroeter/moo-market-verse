import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, User, AlertTriangle, PlaySquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast";
import { UserAvatar } from "@/components/ui/user-avatar";
import { invokeEdgeFunction } from '@/utils/edgeFunctionUtils';

interface UserProfile {
  user_id: string;
  username: string;
  avatar_url: string | null;
}

interface SharedConnectionGroup {
  youtube_channel_id: string;
  youtube_channel_name: string | null;
  users: UserProfile[];
}

const SharedYoutubeConnectionsPage: React.FC = () => {
  const [sharedConnections, setSharedConnections] = useState<SharedConnectionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchSharedConnections = async () => {
      setLoading(true);
      setError(null);
      try {
        // The Edge Function returns { data: result } or { error: message }
        const { data: functionResponse, error: functionError } = await invokeEdgeFunction(
          'get-shared-youtube-connections'
        );

        if (functionError) {
          console.error("Error invoking function:", functionError);
          throw new Error(functionError.message || "Failed to fetch shared connections.");
        }
        
        // Check for errors returned in the function's response body
        if (functionResponse && functionResponse.error) {
            console.error("Function returned error:", functionResponse.error);
            throw new Error(functionResponse.error.details || functionResponse.error.message || "Function execution failed.");
        }

        // The actual array of shared connections is expected in functionResponse.data
        setSharedConnections(functionResponse?.data || []); 
      } catch (e: any) {
        console.error("Fetch error:", e);
        const errorMessage = e.message || "An unexpected error occurred while fetching shared connections.";
        setError(errorMessage);
        toast({
          title: "Error Loading Data",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSharedConnections();
  }, [toast]);

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-fredoka text-white mb-2">Shared YouTube Connections</h1>
        <p className="text-gray-400">Users sharing the same YouTube Channel ID connection.</p>
      </div>

      {loading && (
        <div className="flex justify-center items-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-lolcow-blue" />
          <span className="ml-2 text-white">Loading shared connections...</span>
        </div>
      )}

      {error && !loading && (
        <div className="lolcow-card bg-red-900/30 border-red-700 p-6 text-center rounded-lg">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Error Loading Data</h2>
          <p className="text-red-300 mb-4">{error}</p>
          <Button 
            variant="outline"
            onClick={() => window.location.reload()} 
            className="text-white border-white hover:bg-white/10"
          >
            Try Again
          </Button>
        </div>
      )}

      {!loading && !error && sharedConnections.length === 0 && (
        <div className="lolcow-card p-8 text-center rounded-lg">
          <PlaySquare className="h-12 w-12 text-gray-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">No Shared Connections Found</h2>
          <p className="text-gray-400">There are currently no YouTube channels connected by multiple users.</p>
        </div>
      )}

      {!loading && !error && sharedConnections.length > 0 && (
        <ScrollArea className="h-[calc(100vh-220px)]"> {/* Adjust height as needed based on your layout */}
          <div className="space-y-6">
            {sharedConnections.map((group) => (
              <div key={group.youtube_channel_id} className="lolcow-card rounded-lg overflow-hidden">
                <div className="p-4 border-b border-lolcow-lightgray flex items-center justify-between space-x-3 bg-lolcow-lightgray/10">
                   <div className='flex items-center space-x-3'>
                     <PlaySquare className="w-6 h-6 text-red-500 flex-shrink-0" />
                     <div>
                      <h2 className="text-lg font-semibold text-white" title={group.youtube_channel_id}>
                        {group.youtube_channel_name || 'Unnamed Channel'}
                      </h2>
                      <p className="text-xs text-gray-400 font-mono">{group.youtube_channel_id}</p>
                     </div>
                   </div>
                   <Badge variant="secondary" className="bg-lolcow-blue text-white">{group.users.length} Users</Badge>
                </div>
                <div className="p-4">
                  <ul className="space-y-3">
                    {group.users.map((user) => (
                      <li key={user.user_id} className="flex items-center space-x-3 p-3 bg-lolcow-lightgray/5 rounded-md hover:bg-lolcow-lightgray/10 transition-colors">
                        <UserAvatar
                          avatarUrl={user.avatar_url}
                          displayName={user.username || 'User'}
                          size="w-10 h-10"
                        />
                        <div className="flex-grow">
                          <p className="text-white font-medium">{user.username || 'Unknown User'}</p>
                          <p className="text-xs text-gray-500 font-mono">{user.user_id}</p>
                        </div>
                        <Button variant="outline" size="sm" asChild className="border-lolcow-blue text-lolcow-blue hover:bg-lolcow-blue hover:text-white">
                          <Link to={`/admin/users?userId=${user.user_id}`} className="flex items-center">
                            <User className="h-3 w-3 mr-1.5" /> View Profile
                          </Link>
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </AdminLayout>
  );
};

export default SharedYoutubeConnectionsPage; 