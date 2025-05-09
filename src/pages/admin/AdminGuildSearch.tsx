import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import AdminLayout from '@/components/AdminLayout';
import { Server } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link as RouterLink } from 'react-router-dom';

interface GuildSearchResult {
  guild_id: string;
  guild_name: string;
  user_profile_id: string;
  user_discord_username: string | null;
  user_discord_avatar: string | null;
  user_discord_id: string | null;
}

export default function AdminGuildSearch() {
  const { user, isAdmin } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GuildSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a search query.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setSearchResults([]);
    setHasSearched(true);

    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'search_all_guilds', 
        {
          search_term: searchQuery.trim(),
        }
      );

      if (rpcError) {
        throw rpcError;
      }

      const typedData = rpcData as GuildSearchResult[] | null;
      console.log("Data received from search_all_guilds RPC:", typedData);

      setSearchResults(typedData || []);
      if (!typedData || typedData.length === 0) {
        toast.info('No guilds or associated users found matching your query.');
      }
    } catch (e: any) {
      console.error('Error searching guilds & users:', e);
      setError(`Failed to search: ${e.message}`);
      toast.error(`Failed to search: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const constructAvatarUrl = (discordId: string | null, avatarHash: string | null) => {
    if (discordId && avatarHash) {
      return `https://cdn.discordapp.com/avatars/${discordId}/${avatarHash}.png`;
    }
    return "https://placehold.co/40x40";
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-fredoka text-white mb-2 flex items-center">
          <Server className="w-6 h-6 mr-2" /> Global Guild Search
        </h1>
        <p className="text-gray-400">Search for Discord guilds and see associated users.</p>
      </div>
      
      <div className="space-y-6">
        <Card className="bg-lolcow-darkgray border-lolcow-lightgray">
          <CardHeader>
            <CardTitle className="text-white">Search Guilds</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-2">
              <Input
                type="text"
                placeholder="Enter Guild Name or ID"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-grow bg-lolcow-lightgray text-white border-lolcow-lightgray"
              />
              <Button onClick={handleSearch} disabled={isLoading} className="bg-lolcow-blue hover:bg-lolcow-blue/80">
                {isLoading ? 'Searching...' : 'Search'}
              </Button>
            </div>
            {error && <p className="text-red-500">{error}</p>}
          </CardContent>
        </Card>

        {hasSearched && !isLoading && searchResults.length > 0 && (
          <div className="lolcow-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-lolcow-lightgray">
                  <TableHead className="text-gray-300 w-1/3">Guild</TableHead>
                  <TableHead className="text-gray-300 w-2/3">Associated User</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {searchResults.map((item, index) => (
                  <TableRow 
                    key={`${item.guild_id}-${item.user_profile_id || index}`} 
                    className="border-b border-lolcow-lightgray/50 hover:bg-lolcow-lightgray/10"
                  >
                    <TableCell className="py-3">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white text-lg font-bold mr-3 flex-shrink-0">
                          {item.guild_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div className="font-medium text-white truncate" title={item.guild_name}>{item.guild_name}</div>
                            <div className="text-xs text-gray-400 font-mono">{item.guild_id}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                        <div className="flex items-center">
                            <img 
                                src={constructAvatarUrl(item.user_discord_id, item.user_discord_avatar)}
                                alt={item.user_discord_username || 'User'}
                                className="w-10 h-10 rounded-full mr-3"
                                onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    if (!target.src.includes('placehold.co')) {
                                        target.src = "https://placehold.co/40x40";
                                    }
                                }}
                            />
                            <div>
                                <RouterLink 
                                    to={`/admin/users?userId=${item.user_profile_id}`}
                                    className="font-medium text-lolcow-blue hover:underline"
                                    title={`View profile for ${item.user_discord_username || item.user_discord_id || item.user_profile_id}`}
                                >
                                    {item.user_discord_username || item.user_discord_id || "Unknown User"}
                                </RouterLink>
                                {item.user_discord_id && (
                                    <div className="text-xs text-gray-500 font-mono">Discord ID: {item.user_discord_id}</div>
                                )}
                                <div className="text-sm text-gray-400 font-mono">{item.user_profile_id}</div>
                            </div>
                        </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {hasSearched && !isLoading && searchResults.length === 0 && !error && (
            <Card className="bg-lolcow-darkgray border-lolcow-lightgray">
                <CardContent className="pt-6">
                    <p className="text-center text-gray-400">No guilds or associated users found matching your query.</p>
                </CardContent>
            </Card>
        )}
      </div>
    </AdminLayout>
  );
} 