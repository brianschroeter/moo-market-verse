import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, User, AlertTriangle, Fingerprint as FingerprintIcon, Copy, BarChart3, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';

interface EnhancedStats {
  total_devices: number;
  high_confidence_devices: number;
  unique_users: number;
  potential_duplicates: number;
  avg_confidence: number;
}

interface EnhancedUser {
  user_id: string;
  discord_username: string;
  discord_id: string;
  last_seen_at: string;
  confidence_score: number;
  user_agent: string;
}

interface EnhancedSharedFingerprint {
  fingerprint: string;
  user_count: number;
  users: EnhancedUser[];
  avg_confidence: number;
  last_activity: string;
}

interface SuspiciousDevice {
  fingerprint: string;
  confidence_score: number;
  ip_address: string;
  components: any;
  users: Array<{ discord_username: string; discord_id: string }>;
}

const SharedFingerprintsPage: React.FC = () => {
  const [enhancedData, setEnhancedData] = useState<{
    statistics: EnhancedStats | null;
    sharedFingerprints: EnhancedSharedFingerprint[];
    suspiciousDevices: SuspiciousDevice[];
  }>({
    statistics: null,
    sharedFingerprints: [],
    suspiciousDevices: []
  });
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
    const fetchEnhancedFingerprints = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: functionResponse, error: functionError } = await supabase.functions.invoke(
          'get-enhanced-fingerprints'
        );

        if (functionError) {
          console.error("Error invoking enhanced function:", functionError);
          throw new Error(functionError.message || "Failed to fetch enhanced fingerprint data.");
        }
        
        if (functionResponse && functionResponse.error) {
          console.error("Function returned error:", functionResponse.error);
          throw new Error(functionResponse.error.details || functionResponse.error.message || "Function execution failed.");
        }

        setEnhancedData(functionResponse?.data || {
          statistics: null,
          sharedFingerprints: [],
          suspiciousDevices: []
        }); 
      } catch (e: any) {
        console.error("Fetch error:", e);
        const errorMessage = e.message || "An unexpected error occurred while fetching enhanced fingerprint data.";
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

    fetchEnhancedFingerprints();
  }, [toast]);

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-fredoka text-white mb-2">Enhanced Device Fingerprint Analytics</h1>
        <p className="text-gray-400">Advanced fingerprint analysis with confidence scoring and component matching.</p>
      </div>

      {loading && (
        <div className="flex justify-center items-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-lolcow-blue" />
          <span className="ml-2 text-white">Loading enhanced fingerprint data...</span>
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

      {!loading && !error && (
        <div className="space-y-6">
          {/* Statistics Cards */}
          {enhancedData.statistics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              <Card className="bg-lolcow-darkgray border-lolcow-lightgray">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-400 flex items-center">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Total Devices
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-white">{enhancedData.statistics.total_devices}</p>
                </CardContent>
              </Card>
              <Card className="bg-lolcow-darkgray border-lolcow-lightgray">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-400 flex items-center">
                    <Shield className="h-4 w-4 mr-2" />
                    High Confidence
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-green-400">{enhancedData.statistics.high_confidence_devices}</p>
                </CardContent>
              </Card>
              <Card className="bg-lolcow-darkgray border-lolcow-lightgray">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-400">Unique Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-blue-400">{enhancedData.statistics.unique_users}</p>
                </CardContent>
              </Card>
              <Card className="bg-lolcow-darkgray border-lolcow-lightgray">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-400">Potential Duplicates</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-yellow-400">{enhancedData.statistics.potential_duplicates}</p>
                </CardContent>
              </Card>
              <Card className="bg-lolcow-darkgray border-lolcow-lightgray">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-400">Avg Confidence</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-purple-400">{enhancedData.statistics.avg_confidence}%</p>
                </CardContent>
              </Card>
            </div>
          )}

          {enhancedData.sharedFingerprints.length === 0 && enhancedData.suspiciousDevices.length === 0 && (
            <div className="lolcow-card p-8 text-center rounded-lg">
              <FingerprintIcon className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">No Suspicious Activity Found</h2>
              <p className="text-gray-400">All fingerprints appear to be legitimate with high confidence scores.</p>
            </div>
          )}

          {/* Shared Fingerprints */}
          {enhancedData.sharedFingerprints.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">Shared Fingerprints (High Confidence)</h2>
              <ScrollArea className="h-[calc(50vh-100px)]">
                <div className="space-y-4">
                  {enhancedData.sharedFingerprints.map((group) => (
                    <div key={group.fingerprint} className="lolcow-card rounded-lg overflow-hidden">
                      <div className="p-4 border-b border-lolcow-lightgray flex items-center justify-between space-x-3 bg-lolcow-lightgray/10">
                        <div className='flex items-center space-x-3'>
                          <FingerprintIcon className="w-6 h-6 text-sky-500 flex-shrink-0" />
                          <div className='truncate'>
                            <h3 className="text-lg font-semibold text-white truncate" title={group.fingerprint}>
                              {group.fingerprint}
                            </h3>
                            <p className="text-xs text-gray-400">Confidence: {group.avg_confidence}% | Last: {formatDate(group.last_activity)}</p>
                          </div>
                        </div>
                        <div className='flex items-center space-x-2'>
                          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white h-7 w-7" onClick={() => copyToClipboard(group.fingerprint, 'Fingerprint ID')} title="Copy Fingerprint ID">
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Badge variant="secondary" className="bg-lolcow-blue text-white">{group.user_count} Users</Badge>
                        </div>
                      </div>
                      <div className="p-4">
                        <ul className="space-y-3">
                          {group.users.map((user) => (
                            <li key={user.user_id} className="flex items-center space-x-3 p-3 bg-lolcow-lightgray/5 rounded-md hover:bg-lolcow-lightgray/10 transition-colors">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-lolcow-blue to-lolcow-pink flex items-center justify-center text-white font-semibold">
                                {user.discord_username.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-grow">
                                <p className="text-white font-medium">{user.discord_username}</p>
                                <p className="text-xs text-gray-500 font-mono">ID: {user.discord_id}</p>
                                <p className="text-xs text-gray-400">Confidence: {user.confidence_score}% | Last: {formatDate(user.last_seen_at)}</p>
                              </div>
                              <Button variant="outline" size="sm" asChild className="border-lolcow-blue text-lolcow-blue hover:bg-lolcow-blue hover:text-white">
                                <Link to={`/admin/users?userId=${user.user_id}`} className="flex items-center">
                                  <User className="h-3 w-3 mr-1.5" /> View
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
            </div>
          )}

          {/* Suspicious Recent Activity */}
          {enhancedData.suspiciousDevices.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">Recent Suspicious Activity</h2>
              <ScrollArea className="h-[calc(50vh-100px)]">
                <div className="space-y-4">
                  {enhancedData.suspiciousDevices.map((device) => (
                    <div key={device.fingerprint} className="lolcow-card rounded-lg overflow-hidden border-yellow-600/50">
                      <div className="p-4 border-b border-lolcow-lightgray flex items-center justify-between space-x-3 bg-yellow-900/20">
                        <div className='flex items-center space-x-3'>
                          <AlertTriangle className="w-6 h-6 text-yellow-500 flex-shrink-0" />
                          <div className='truncate'>
                            <h3 className="text-lg font-semibold text-white truncate" title={device.fingerprint}>
                              {device.fingerprint}
                            </h3>
                            <p className="text-xs text-gray-400">IP: {device.ip_address} | Confidence: {device.confidence_score}%</p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="bg-yellow-600 text-white">{device.users.length} Users</Badge>
                      </div>
                      <div className="p-4">
                        <div className="flex flex-wrap gap-2">
                          {device.users.map((user, idx) => (
                            <Badge key={idx} variant="outline" className="text-white border-gray-500">
                              {user.discord_username}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      )}
    </AdminLayout>
  );
};

export default SharedFingerprintsPage; 