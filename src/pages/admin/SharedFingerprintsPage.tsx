import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, User, AlertTriangle, Fingerprint as FingerprintIcon, Copy } from 'lucide-react'; // Added FingerprintIcon and Copy
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';

interface UserFingerprintProfile {
  user_id: string;
  username: string;
  avatar_url: string | null;
  last_seen_at: string; 
  first_seen_at: string;
}

interface SharedFingerprintGroup {
  fingerprint: string;
  users: UserFingerprintProfile[];
}

const SharedFingerprintsPage: React.FC = () => {
  const [sharedFingerprints, setSharedFingerprints] = useState<SharedFingerprintGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'PPpp'); // Format like: Sep 21, 2024, 3:30:15 PM
    } catch (e) {
      console.error("Error formatting date:", dateString, e);
      return 'Invalid Date';
    }
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        toast({ title: "Copied to Clipboard", description: `${fieldName} copied.` });
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
        toast({ title: "Copy Failed", description: `Could not copy ${fieldName}.`, variant: "destructive" });
      });
  };

  useEffect(() => {
    const fetchSharedFingerprints = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: functionResponse, error: functionError } = await supabase.functions.invoke(
          'get-shared-fingerprints'
        );

        if (functionError) {
          console.error("Error invoking function:", functionError);
          throw new Error(functionError.message || "Failed to fetch shared fingerprints.");
        }
        
        if (functionResponse && functionResponse.error) {
            console.error("Function returned error:", functionResponse.error);
            throw new Error(functionResponse.error.details || functionResponse.error.message || "Function execution failed.");
        }

        setSharedFingerprints(functionResponse?.data || []); 
      } catch (e: any) {
        console.error("Fetch error:", e);
        const errorMessage = e.message || "An unexpected error occurred while fetching shared fingerprints.";
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

    fetchSharedFingerprints();
  }, [toast]);

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-fredoka text-white mb-2">Shared Device Fingerprints</h1>
        <p className="text-gray-400">Users sharing the same device fingerprint ID.</p>
      </div>

      {loading && (
        <div className="flex justify-center items-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-lolcow-blue" />
          <span className="ml-2 text-white">Loading shared fingerprints...</span>
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

      {!loading && !error && sharedFingerprints.length === 0 && (
        <div className="lolcow-card p-8 text-center rounded-lg">
          <FingerprintIcon className="h-12 w-12 text-gray-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">No Shared Fingerprints Found</h2>
          <p className="text-gray-400">There are currently no device fingerprints shared by multiple users.</p>
        </div>
      )}

      {!loading && !error && sharedFingerprints.length > 0 && (
        <ScrollArea className="h-[calc(100vh-220px)]">
          <div className="space-y-6">
            {sharedFingerprints.map((group) => (
              <div key={group.fingerprint} className="lolcow-card rounded-lg overflow-hidden">
                <div className="p-4 border-b border-lolcow-lightgray flex items-center justify-between space-x-3 bg-lolcow-lightgray/10">
                   <div className='flex items-center space-x-3'>
                     <FingerprintIcon className="w-6 h-6 text-sky-500 flex-shrink-0" />
                     <div className='truncate'>
                      <h2 className="text-lg font-semibold text-white truncate" title={group.fingerprint}>
                        {group.fingerprint}
                      </h2>
                      <p className="text-xs text-gray-400 font-mono">Device Fingerprint ID</p>
                     </div>
                   </div>
                   <div className='flex items-center space-x-2'>
                     <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white h-7 w-7" onClick={() => copyToClipboard(group.fingerprint, 'Fingerprint ID')} title="Copy Fingerprint ID">
                       <Copy className="h-4 w-4" />
                     </Button>
                     <Badge variant="secondary" className="bg-lolcow-blue text-white">{group.users.length} Users</Badge>
                   </div>
                </div>
                <div className="p-4">
                  <ul className="space-y-3">
                    {group.users.map((user) => (
                      <li key={user.user_id} className="flex items-center space-x-3 p-3 bg-lolcow-lightgray/5 rounded-md hover:bg-lolcow-lightgray/10 transition-colors">
                        <img
                          src={user.avatar_url || "https://placehold.co/40x40"}
                          alt={user.username || 'User Avatar'}
                          className="w-10 h-10 rounded-full bg-lolcow-lightgray/20"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            if (!target.src.includes('placehold.co')) {
                              target.src = "https://placehold.co/40x40";
                            }
                          }}
                        />
                        <div className="flex-grow">
                          <p className="text-white font-medium">{user.username || 'Unknown User'}</p>
                          <p className="text-xs text-gray-500 font-mono">User ID: {user.user_id}</p>
                          <p className="text-xs text-gray-400">First Seen: {formatDate(user.first_seen_at)}</p>
                          <p className="text-xs text-gray-400">Last Seen: {formatDate(user.last_seen_at)}</p>
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

export default SharedFingerprintsPage; 