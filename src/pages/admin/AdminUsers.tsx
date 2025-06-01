import React, { useState, useEffect, ReactNode } from "react";
import AdminLayout from "../../components/AdminLayout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { User, Shield, Loader2, Server, Search, Trash2, Link as LinkIcon, Smartphone, PlaySquare, UserCheck } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { assignRole, removeRole } from "@/services/roleService";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import { useSearchParams } from 'react-router-dom';
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog';
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from 'date-fns';
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { YouTubeMembership } from "@/services/types/auth-types";

// ---- Added: Interface for User Device ----
interface UserDevice {
  id: string; // UUID
  fingerprint: string;
  user_agent?: string | null; // Allow null
  ip_address?: string | null; // Added IP Address (Optional)
  last_seen_at: string; // Timestamptz
  created_at: string; // Timestamptz
}
// ---- End Added Interface ----

interface UserData {
  id: string;
  email: string;
  username: string;
  discord_id?: string | null; // Added discord_id
  avatar: string | null;
  joined: string;
  connections: {
    platform: string;
    username: string;
    connected: boolean;
    connection_id: string;
  }[];
  roles: string[];
  guild_count?: number;
  devices?: UserDevice[]; // Added optional devices array
  youtubeMemberships?: YouTubeMembership[]; // Added optional YouTube memberships array
}

// Define type for a single guild
interface Guild {
  guild_id: string;
  guild_name: string;
}

// ---- Interface for RPC Result ----
interface FingerprintMatch {
    user_id: string;
    username: string | null;
}

// ---- Updated User Devices Dialog Component ----
const UserDevicesDialog: React.FC<{ 
  user: UserData | null; 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
}> = ({ user, open, onOpenChange }) => {
  const { toast } = useToast();
  // ---- Added State for Matching ----
  const [matchingUsers, setMatchingUsers] = useState<Record<string, FingerprintMatch[]>>({}); // Store matches per fingerprint
  const [loadingMatches, setLoadingMatches] = useState<Record<string, boolean>>({}); // Loading state per fingerprint
  // ---- End Added State ----

  if (!user) return null;

  const sortedDevices = user.devices?.sort((a, b) => 
    new Date(b.last_seen_at).getTime() - new Date(a.last_seen_at).getTime()
  ) || []; // Sort by last seen, newest first

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'PPpp'); // Format like: Sep 21, 2024, 3:30:15 PM
    } catch (e) {
      console.error("Error formatting date:", dateString, e);
      return 'Invalid Date';
    }
  };

  // ---- Added: Copy to Clipboard Helper ----
  const copyToClipboard = (text: string | null | undefined, fieldName: string) => {
    if (!text) {
        toast({ title: "Nothing to copy", description: `${fieldName} is empty.`, variant: "default" });
        return;
    }
    navigator.clipboard.writeText(text)
      .then(() => {
        toast({ title: "Copied to Clipboard", description: `Full ${fieldName} copied.` });
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
        toast({ title: "Copy Failed", description: `Could not copy ${fieldName}.`, variant: "destructive" });
      });
  };
  // ---- End Added Helper ----

  // ---- Added Handler for Checking Matches ----
  const handleCheckMatches = async (fingerprint: string) => {
    if (!fingerprint) return;
    setLoadingMatches(prev => ({ ...prev, [fingerprint]: true }));
    setMatchingUsers(prev => ({ ...prev, [fingerprint]: [] })); // Clear previous results for this FP

    try {
      const { data, error } = await supabase.rpc('get_users_by_fingerprint', {
        p_fingerprint: fingerprint
      });

      if (error) {
        console.error("Error calling get_users_by_fingerprint:", error);
        throw new Error(error.message || "Failed to check for matching users.");
      }
      
      // Filter out the current user being viewed, if present
      const otherUsers = (data as FingerprintMatch[] || []).filter(match => match.user_id !== user.id);
      setMatchingUsers(prev => ({ ...prev, [fingerprint]: otherUsers }));

    } catch (error) {
      toast({
        title: "Match Check Failed",
        description: error instanceof Error ? error.message : "Could not check for fingerprint matches.",
        variant: "destructive"
      });
      setMatchingUsers(prev => ({ ...prev, [fingerprint]: [] })); // Ensure results are cleared on error
    } finally {
      setLoadingMatches(prev => ({ ...prev, [fingerprint]: false }));
    }
  };
  // ---- End Added Handler ----

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl"> {/* Made dialog even wider */}
        <DialogHeader>
          <DialogTitle>Device History for {user.username}</DialogTitle>
          <DialogDescription>
            Showing {sortedDevices.length} device(s) associated with this user account, sorted by last seen.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] rounded-md border p-4"> {/* Scrollable area */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fingerprint ID</TableHead>
                <TableHead>User Agent</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Last Seen</TableHead>
                <TableHead>First Seen</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedDevices.length > 0 ? (
                sortedDevices.map((device) => {
                  const isLoading = loadingMatches[device.fingerprint];
                  const matches = matchingUsers[device.fingerprint] || [];
                  const hasMatches = matches.length > 0;

                  return (
                    <TableRow key={device.id}>
                      <TableCell 
                        className="font-mono text-xs cursor-pointer hover:text-blue-400" 
                        title={`Click to copy full fingerprint: ${device.fingerprint}`}
                        onClick={() => copyToClipboard(device.fingerprint, 'Fingerprint ID')}
                      >
                          {device.fingerprint.substring(0, 16)}...
                      </TableCell> 
                      <TableCell 
                        className="text-xs cursor-pointer hover:text-blue-400" 
                        title={`Click to copy full User Agent: ${device.user_agent || 'N/A'}`}
                        onClick={() => copyToClipboard(device.user_agent, 'User Agent')}
                      >
                          {device.user_agent ? `${device.user_agent.substring(0, 50)}...` : 'N/A'}
                      </TableCell> 
                       <TableCell className="font-mono text-xs">{device.ip_address || 'N/A'}</TableCell>
                      <TableCell className="text-xs">{formatDate(device.last_seen_at)}</TableCell>
                      <TableCell className="text-xs">{formatDate(device.created_at)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col items-start space-y-1">
                            <Button 
                                variant="secondary"
                                size="sm"
                                onClick={() => handleCheckMatches(device.fingerprint)}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <><Loader2 className="h-3 w-3 animate-spin mr-1" /> Checking...</>
                                ) : (
                                    <> <Search className="h-3 w-3 mr-1" /> Check Matches</>
                                )}
                           </Button>
                           {/* Display Matches Result */}
                           {matches !== undefined && !isLoading && (
                             <div className="text-xs mt-1">
                               {hasMatches ? (
                                 <div className="flex flex-col items-start">
                                    <Badge variant="destructive" className="mb-1">Matches found!</Badge>
                                    {matches.map(match => (
                                        <Link 
                                            key={match.user_id} 
                                            to={`/admin/users?userId=${match.user_id}`} 
                                            className="text-blue-400 hover:underline"
                                            onClick={() => onOpenChange(false)} // Close current dialog on click
                                            title={`View profile for ${match.username || match.user_id}`}
                                        >
                                            - {match.username || match.user_id}
                                        </Link>
                                    ))}
                                 </div>
                               ) : (
                                 <span className="text-gray-500">No other users found.</span>
                               )}
                             </div>
                           )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">No device history found for this user.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
// ---- End Updated Component ----

// ---- Component for YouTube Memberships Dialog ----
const UserYouTubeMembershipsDialog: React.FC<{
  user: UserData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}> = ({ user, open, onOpenChange }) => {
  if (!user) return null;

  // Sort memberships - using a predefined order similar to YouTubeMembershipsList
  const membershipOrder: { [key: string]: number } = {
    "Crown": 1,
    "Pay Pig": 2,
    "Cash Cow": 3,
    "Ban World": 4,
    // Add other levels if they exist and need specific ordering
  };

  // If all memberships passed are considered active, no explicit client-side filter by status is needed here.
  const sortedMemberships = [...(user.youtubeMemberships || [])].sort((a, b) => {
    const orderA = membershipOrder[a.membership_level] || 99;
    const orderB = membershipOrder[b.membership_level] || 99;
    return orderA - orderB;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-lolcow-darkgray text-white border-lolcow-lightgray"> {/* Adjusted width slightly */}
        <DialogHeader>
          <DialogTitle className="text-xl font-fredoka flex items-center">
            <PlaySquare className="w-5 h-5 mr-2 text-red-500" />
            YouTube Memberships for {user.username}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Showing {sortedMemberships.length} YouTube Memberships.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[auto] max-h-[60vh] rounded-md border border-lolcow-lightgray p-4 my-4">
          {sortedMemberships.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="border-b border-lolcow-lightgray">
                  <TableHead className="text-gray-300">Channel Name</TableHead>
                  <TableHead className="text-gray-300">Level</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedMemberships.map((membership) => {
                  // Format channel name: add space after "Lolcow" if followed by an uppercase letter
                  const formattedChannelName = membership.channel_name.replace(/(Lolcow)([A-Z])/g, '$1 $2');

                  return (
                    <TableRow key={membership.id} className="border-b border-lolcow-lightgray/50 hover:bg-lolcow-lightgray/10">
                      <TableCell className="text-white font-medium" title={membership.creator_channel_id}> {/* Title might still use creator_channel_id if that's the ID for the channel */}
                        {formattedChannelName}
                      </TableCell>
                      <TableCell className="text-gray-300">{membership.membership_level}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center text-gray-400 py-8">
              No active YouTube memberships found for this user.
            </div>
          )}
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
// ---- End YouTube Memberships Dialog ----

const AdminUsers: React.FC = (): ReactNode => {
  const [showConnectionDialog, setShowConnectionDialog] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [newConnection, setNewConnection] = useState({ platform: "YouTube", username: "" });
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingConnection, setIsAddingConnection] = useState(false);
  const { toast } = useToast();
  const { startImpersonation } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const USERS_PER_PAGE = 25; // Or your desired number of users per page
  const [totalUsers, setTotalUsers] = useState(0);

  // Sorting State
  const [sortBy, setSortBy] = useState<string>('created_at'); // Default sort by joined date
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc'); // Default to descending

  // State for Guilds Dialog
  const [showGuildsDialog, setShowGuildsDialog] = useState(false);
  const [selectedUserForGuilds, setSelectedUserForGuilds] = useState<UserData | null>(null);
  const [loadingGuilds, setLoadingGuilds] = useState(false);
  const [userGuilds, setUserGuilds] = useState<Guild[]>([]);
  const [guildSearchTerm, setGuildSearchTerm] = useState("");
  const [filteredGuilds, setFilteredGuilds] = useState<Guild[]>([]);

  // State for Delete Confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ---- Added State for Devices Dialog ----
  const [showDevicesDialog, setShowDevicesDialog] = useState(false);
  const [selectedUserForDevices, setSelectedUserForDevices] = useState<UserData | null>(null);
  // ---- End Added State ----

  // ---- Added State for YouTube Memberships Dialog ----
  const [showYouTubeMembershipsDialog, setShowYouTubeMembershipsDialog] = useState(false);
  const [selectedUserForYouTubeMemberships, setSelectedUserForYouTubeMemberships] = useState<UserData | null>(null);
  // ---- End Added State ----

  // ---- Added: State for Fetched YouTube Channel Details ----
  const [youtubeChannelDetails, setYoutubeChannelDetails] = useState<{
    id: string | null; // Added field for the resolved Channel ID
    name: string | null;
    pfpUrl: string | null;
    memberships: { membership_level: string; channel_name: string; }[];
  } | null>(null);
  const [isFetchingYouTubeDetails, setIsFetchingYouTubeDetails] = useState(false);
  const [pfpLoadError, setPfpLoadError] = useState(false); // Added state for PFP load error
  // ---- End Added State ----

  useEffect(() => {
    const userIdFromUrl = searchParams.get('userId');
    if (userIdFromUrl) {
      // If a specific user ID is in the URL, clear any active search term
      // and ensure we are on page 1 (though pagination will be hidden).
      if (searchTerm !== "") {
        setSearchTerm("");
      }
      if (currentPage !== 1) {
        setCurrentPage(1);
      }
      // fetchUsers will be called by the change in searchTerm or currentPage,
      // or if they were already cleared/1, it's called by searchParams change directly.
    }
    // This effect will call fetchUsers due to dependency changes
    fetchUsers(currentPage, searchTerm, userIdFromUrl, sortBy, sortDirection);
  }, [currentPage, searchTerm, searchParams, sortBy, sortDirection]);

  // Effect to reset to page 1 when search term changes,
  // but only if not navigating to a specific user via URL.
  useEffect(() => {
    const userIdFromUrl = searchParams.get('userId');
    if (searchTerm !== "" && !userIdFromUrl) {
      if (currentPage !== 1) {
        setCurrentPage(1);
      }
    }
  }, [searchTerm]); // Removed currentPage from deps to avoid loop, fetchUsers is handled by the main effect.

  // Effect to reset to page 1 when sorting changes,
  // but only if not navigating to a specific user via URL.
  useEffect(() => {
    const userIdFromUrl = searchParams.get('userId');
    if (!userIdFromUrl && currentPage !== 1) {
        // Check if sortBy or sortDirection caused this effect, if so, reset page
        // This simple check might run more often but ensures page reset on sort.
        // A more complex check could compare previous sortBy/sortDirection values.
        setCurrentPage(1);
    }
  }, [sortBy, sortDirection]);

  // The 'users' state will hold the correctly filtered and paginated list from fetchUsers.
  // 'filteredUsers' is primarily to handle the specific case of displaying a single user from URL if needed,
  // or can be removed if 'users' state is directly used and correctly populated by fetchUsers in all cases.
  useEffect(() => {
    const userIdFromUrl = searchParams.get('userId');
    if (userIdFromUrl && users.length === 1 && users[0].id === userIdFromUrl) {
      // If we fetched a specific user and it's the only one in 'users', use it.
      setFilteredUsers(users);
    } else if (userIdFromUrl && users.length > 0 && users.filter(user => user.id === userIdFromUrl).length === 1){
      // Fallback: if fetchUsers returned more (e.g. due to search term not cleared yet) but the user is there
      setFilteredUsers(users.filter(user => user.id === userIdFromUrl));
    } else if (userIdFromUrl) {
        // User ID in URL but user not found in current 'users' list (e.g. after fetch)
        setFilteredUsers([]);
    }else {
      // Default case: no specific user ID in URL, so display current page/search results from 'users'
      setFilteredUsers(users);
    }
  }, [users, searchParams]);

  // Effect to filter guilds based on search term
  useEffect(() => {
    if (!guildSearchTerm.trim()) {
      setFilteredGuilds(userGuilds);
    } else {
      const lowerCaseSearch = guildSearchTerm.toLowerCase();
      setFilteredGuilds(
        userGuilds.filter(guild => 
          guild.guild_name.toLowerCase().includes(lowerCaseSearch) ||
          guild.guild_id.toLowerCase().includes(lowerCaseSearch)
        )
      );
    }
  }, [guildSearchTerm, userGuilds]);

  const fetchUsers = async (
    pageToFetch = currentPage,
    currentSearchTerm = searchTerm,
    userIdToFetch = searchParams.get('userId'),
    currentSortBy = sortBy, // Added currentSortBy
    currentSortDirection = sortDirection // Added currentSortDirection
  ) => {
    setLoading(true);
    try {
      // Use the new view 'profiles_with_guild_info'
      let profilesBaseQuery = supabase.from('profiles_with_guild_info');
      // The count query can still use 'profiles' or 'profiles_with_guild_info'
      // Using 'profiles' for count might be slightly more direct if the view adds overhead for counting.
      // However, for consistency and to ensure filters apply correctly, using the view is safer.
      let countBaseQuery = supabase.from('profiles_with_guild_info');

      // Define the columns to select from the view.
      // Ensure 'guild_count' is selected.
      // Also include 'discord_id' as it's used for avatar URLs and other logic.
      const selectColumns = 'id, discord_username, discord_avatar, created_at, discord_id, guild_count';

      let finalProfilesQuery;
      let finalCountQuery;

      if (userIdToFetch) {
        finalProfilesQuery = profilesBaseQuery.select(selectColumns).eq('id', userIdToFetch);
        finalCountQuery = countBaseQuery.select('*', { count: 'exact', head: true }).eq('id', userIdToFetch);
      } else if (currentSearchTerm && currentSearchTerm.trim() !== "") {
        const cleanedSearchTerm = currentSearchTerm.trim();
        const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
        const isSearchTermUUID = uuidRegex.test(cleanedSearchTerm);

        // Adjust search conditions for view columns if necessary
        let searchOrConditions = [`discord_username.ilike.%${cleanedSearchTerm}%`];
        if (isSearchTermUUID) {
          searchOrConditions.push(`id.eq.${cleanedSearchTerm}`);
        }
        const searchFilterString = searchOrConditions.join(',');

        finalProfilesQuery = profilesBaseQuery
          .select(selectColumns)
          .or(searchFilterString)
          .order(currentSortBy, { ascending: currentSortDirection === 'asc' }) // Apply sorting
          .range((pageToFetch - 1) * USERS_PER_PAGE, pageToFetch * USERS_PER_PAGE - 1);
        finalCountQuery = countBaseQuery.select('*', { count: 'exact', head: true }).or(searchFilterString);
      } else {
        finalProfilesQuery = profilesBaseQuery
          .select(selectColumns)
          .order(currentSortBy, { ascending: currentSortDirection === 'asc' }) // Apply sorting
          .range((pageToFetch - 1) * USERS_PER_PAGE, pageToFetch * USERS_PER_PAGE - 1);
        finalCountQuery = countBaseQuery.select('*', { count: 'exact', head: true });
      }

      const { count, error: countError } = await finalCountQuery;

      if (countError) {
        console.error("Error fetching total user count:", countError);
        toast({
          title: "Error",
          description: "Could not fetch total user count.",
          variant: "destructive",
        });
        setTotalUsers(0);
      } else {
        setTotalUsers(count || 0);
      }

      const { data: profiles, error: profilesError } = await finalProfilesQuery;

      if (profilesError) {
        throw profilesError;
      }

      if (!profiles || profiles.length === 0) {
        setUsers([]);
        setLoading(false);
        return;
      }
      
      const profileIds = profiles.map(p => p.id);
      console.log("[AdminUsers] Profile IDs for current page:", profileIds);

      // Fetch roles for the current page's users
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .in('user_id', profileIds);

      if (rolesError) {
        throw rolesError;
      }

      // Fetch all connections for the current page's users
      const { data: allConnections, error: connectionsError } = await supabase
        .from('discord_connections')
        .select('*')
        .in('user_id', profileIds);

      if (connectionsError) {
        throw connectionsError;
      }

      // Fetch User Devices for the current page's users
      const { data: allDevices, error: devicesError } = await supabase
        .from('user_devices')
        .select('id, user_id, fingerprint, user_agent, ip_address, last_seen_at, created_at')
        .in('user_id', profileIds);
      
      if (devicesError) {
        // Log error but don't necessarily fail the whole user load
        console.error("Error fetching user devices:", devicesError);
        toast({
          title: "Warning",
          description: "Could not load device information for users.",
          variant: "default" // Or another appropriate variant
        });
      }

      // Fetch YouTube Memberships - Revised Approach
      let allYoutubeMemberships: (YouTubeMembership & { user_id: string | null })[] = [];
      const { data: userYoutubeConnections, error: ytConnectionsError } = await supabase
        .from('youtube_connections')
        .select('id, user_id') // Select youtube_connection_id (as id) and user_id
        .in('user_id', profileIds);
      
      console.log("[AdminUsers] Fetched YouTube Connections:", userYoutubeConnections, "Error:", ytConnectionsError);

      if (ytConnectionsError) {
        console.error("Error fetching YouTube connections:", ytConnectionsError);
        toast({
          title: "Warning",
          description: "Could not load YouTube connection data for users.",
          variant: "default"
        });
      } else if (userYoutubeConnections && userYoutubeConnections.length > 0) {
        const youtubeConnectionIds = userYoutubeConnections.map(conn => conn.id);
        console.log("[AdminUsers] YouTube Connection IDs for memberships query:", youtubeConnectionIds);

        const { data: fetchedMemberships, error: ytMembershipsError } = await supabase
          .from('youtube_memberships')
          .select('*, youtube_connection_id') // youtube_connection_id is crucial for mapping back
          .in('youtube_connection_id', youtubeConnectionIds);
        
        console.log("[AdminUsers] Fetched YouTube Memberships:", fetchedMemberships, "Error:", ytMembershipsError);

        if (ytMembershipsError) {
          console.error("Error fetching YouTube memberships:", ytMembershipsError);
          toast({
            title: "Warning",
            description: "Could not load YouTube membership information for users.",
            variant: "default"
          });
        } else if (fetchedMemberships) {
          // Add user_id to each membership object for easier mapping later
          allYoutubeMemberships = fetchedMemberships.map(mem => {
            const connection = userYoutubeConnections.find(conn => conn.id === mem.youtube_connection_id);
            return {
              ...mem,
              user_id: connection ? connection.user_id : null // Add user_id
            };
          }).filter(mem => mem.user_id !== null) as (YouTubeMembership & { user_id: string })[];
          console.log("[AdminUsers] Processed allYoutubeMemberships (with user_id):", allYoutubeMemberships);
        }
      }
      // ---- End YouTube Memberships Fetching ----

      // Process and combine the data
      const userMap = new Map<string, UserData>();

      profiles.forEach(profile => {
        // Log the profile data for debugging
        // console.log("Processing profile:", profile);

        // Construct the full avatar URL using discord_id
        const avatarUrl = profile.discord_avatar && profile.discord_id 
                        ? `https://cdn.discordapp.com/avatars/${profile.discord_id}/${profile.discord_avatar}.png` 
                        : null; // Set to null if no avatar hash or discord_id

        userMap.set(profile.id, { // Keep using profile.id (UUID) as the map key
          id: profile.id,
          email: "", // We don't have direct access to this
          username: profile.discord_username || "Unknown",
          discord_id: profile.discord_id,
          avatar: avatarUrl, // Use the correctly constructed URL
          joined: new Date(profile.created_at).toLocaleDateString(),
          connections: [],
          roles: [],
          guild_count: profile.guild_count, // Use guild_count from the view
          devices: [], // Initialize devices array
          youtubeMemberships: [] // Initialize YouTube memberships array
        });
      });

      // Add roles
      roles.forEach(role => {
        const user = userMap.get(role.user_id);
        if (user) {
          user.roles.push(role.role);
        }
      });

      // Add All connections (using connection_type)
      allConnections.forEach(conn => {
        const user = userMap.get(conn.user_id);
        if (user) {
          // Use connection_type from the table
          const platform = conn.connection_type || 'Unknown'; // Default if null/undefined
          // Capitalize first letter for display
          const displayPlatform = platform.charAt(0).toUpperCase() + platform.slice(1);
          
          user.connections.push({
            platform: displayPlatform, // Use the type from the DB
            username: conn.connection_name, // Assuming this holds the username for all types
            connected: conn.connection_verified !== null ? conn.connection_verified : true, // Use verification status if available
            connection_id: conn.connection_id // Store the connection_id
          });
        }
      });

      // ---- Added: Add Devices to Users ----
      if (allDevices) {
        allDevices.forEach(rawDevice => {
          // Cast the raw device data to the expected structure
          const device = rawDevice as {
            id: string;
            user_id: string;
            fingerprint: string;
            user_agent: string | null;
            ip_address: string | null;
            last_seen_at: string;
            created_at: string;
          };
          
          const user = userMap.get(device.user_id);
          if (user) {
            user.devices?.push({
              id: device.id,
              fingerprint: device.fingerprint,
              user_agent: device.user_agent ?? null,
              ip_address: device.ip_address ?? null,
              last_seen_at: device.last_seen_at,
              created_at: device.created_at
            });
          }
        });
      }
      // ---- End Added Logic ----

      // ---- Added: Fetch and process YouTube Memberships ----
      if (profileIds.length > 0) {
        // 1. Fetch all YouTube connections for the current page's users
        const { data: userYouTubeConnections, error: ytConnectionsError } = await supabase
          .from('youtube_connections')
          .select('user_id, youtube_channel_id') // Select user_id to map back and channel_id for memberships
          .in('user_id', profileIds);

        if (ytConnectionsError) {
          console.error("Error fetching YouTube connections for users:", ytConnectionsError);
          // Decide if this should be a toast/hard error or just a warning
        } else if (userYouTubeConnections && userYouTubeConnections.length > 0) {
          const userConnectionMap = new Map<string, string[]>(); // user_id -> [youtube_channel_id, ...]
          userYouTubeConnections.forEach(conn => {
            if (!userConnectionMap.has(conn.user_id)) {
              userConnectionMap.set(conn.user_id, []);
            }
            if (conn.youtube_channel_id) {
              userConnectionMap.get(conn.user_id)!.push(conn.youtube_channel_id);
            }
          });

          const allYouTubeChannelIds = userYouTubeConnections
            .map(conn => conn.youtube_channel_id)
            .filter((id): id is string => !!id); // Filter out null/undefined and ensure type is string
          
          if (allYouTubeChannelIds.length > 0) {
            // 2. Fetch all YouTube memberships linked to these connection IDs
            const { data: allMembershipsData, error: ytMembershipsError } = await supabase
              .from('youtube_memberships')
              .select('*') // Select all fields from YouTubeMembership interface
              .in('youtube_connection_id', allYouTubeChannelIds);
            
            if (ytMembershipsError) {
              console.error("Error fetching YouTube memberships:", ytMembershipsError);
              toast({
                title: "Warning",
                description: "Could not load YouTube membership information for users.",
                variant: "default"
              });
            } else if (allMembershipsData) {
              // 3. Map memberships back to users
              allMembershipsData.forEach(membership => {
                // Find which user this membership belongs to by checking their youtube_channel_ids
                for (const [userId, channelIds] of userConnectionMap.entries()) {
                  if (channelIds.includes(membership.youtube_connection_id)) {
                    const user = userMap.get(userId);
                    if (user) {
                      user.youtubeMemberships?.push(membership as YouTubeMembership);
                    }
                    break; // Found the user, no need to check other users for this membership
                  }
                }
              });
            }
          }
        }
      }
      // ---- End Added: Fetch and process YouTube Memberships ----

      setUsers(Array.from(userMap.values()));
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditConnections = (user: UserData) => {
    setCurrentUser(user);
    setShowConnectionDialog(true);
  };

  const handleImpersonateUser = async (user: UserData) => {
    await startImpersonation(user.id);
  };

  const handleAddConnection = async () => {
    // Check if platform is YouTube and details are ready
    if (newConnection.platform === 'YouTube' && (!youtubeChannelDetails || !youtubeChannelDetails.id)) {
      toast({
        title: "Error",
        description: "Please fetch and resolve YouTube channel details before adding.",
        variant: "destructive"
      });
      return;
    }

    if (!currentUser) { // General check
        toast({ title: "Error", description: "Current user not selected.", variant: "destructive" });
        return;
    }

    setIsAddingConnection(true);

    try {
      const connectionType = newConnection.platform.toLowerCase();
      // Use the RESOLVED channel ID and fetched channel name for YouTube
      const connectionId = newConnection.platform === 'YouTube' ? youtubeChannelDetails!.id! : newConnection.username.trim();
      const connectionName = newConnection.platform === 'YouTube' ? youtubeChannelDetails!.name || connectionId : newConnection.username.trim(); // Fallback to ID if name is missing

      if (!connectionId) {
        toast({ title: "Error", description: "Connection ID is missing.", variant: "destructive" });
        setIsAddingConnection(false);
        return;
      }
      if (!connectionName) {
         toast({ title: "Error", description: "Connection Name is missing.", variant: "destructive" });
         setIsAddingConnection(false);
         return;
      }

      // Call the Supabase Edge function to add the connection
      const { data: functionResponse, error } = await supabase.functions.invoke(
        'add-user-connection',
        {
          body: {
            target_user_id: currentUser.id,
            connection_type: connectionType,
            connection_id: connectionId,
            connection_name: connectionName,
          },
        }
      );

      if (error) {
        // Try to parse more specific error from function if available
        let detailedError = error.message;
        if (error.context && typeof error.context.error === 'string') {
            detailedError = error.context.error;
        } else if (error.context && error.context.details) {
            detailedError = error.context.details;
        }
        throw new Error(detailedError);
      }

      // The function itself might return an error in its response body if something went wrong internally
      if (functionResponse && functionResponse.error) {
        throw new Error(functionResponse.error);
      }
      
      // Assuming the function returns the new connection object in a 'connection' field on success
      const addedConnectionData = functionResponse?.connection;
      if (!addedConnectionData) {
        // This case might happen if the function succeeded (status 2xx) but didn't return expected data
        throw new Error("Edge function succeeded but did not return connection data.");
      }

      // Optimistically update the local state using the data returned from the function
      const addedConnection = {
        platform: newConnection.platform,
        // Use connection_name and connection_id from the function response if they are indeed returned and named so
        // For now, let's stick to what we sent, assuming the DB schema is aligned
        username: addedConnectionData.connection_name || connectionName, 
        connected: addedConnectionData.connection_verified !== null ? addedConnectionData.connection_verified : true,
        connection_id: addedConnectionData.connection_id || connectionId 
      };

      setUsers(users.map(u => {
        if (u.id === currentUser.id) {
          return {
            ...u,
            connections: [...u.connections, addedConnection]
          };
        }
        return u;
      }));
      // Update currentUser as well for the dialog state
      setCurrentUser({
          ...currentUser,
          connections: [...currentUser.connections, addedConnection]
      });

      toast({
        title: "Connection Added",
        description: `Added ${newConnection.platform} connection for ${currentUser.username}.`,
      });
      
      // Reset form and close dialog
      setNewConnection({ platform: 'YouTube', username: '' });
      setShowConnectionDialog(false);
      setYoutubeChannelDetails(null); // Reset fetched details

    } catch (error) {
      console.error("Error adding connection:", error);
      toast({
        title: "Error",
        description: `Failed to add ${newConnection.platform} connection. ${error instanceof Error ? error.message : ''}`,
        variant: "destructive"
      });
    } finally {
      setIsAddingConnection(false);
    }
  };

  const handleRemoveConnection = async (connectionIdToRemove: string) => {
    if (!currentUser) return;

    const connectionDetails = currentUser.connections.find(c => c.connection_id === connectionIdToRemove);

    if (!connectionDetails) {
        toast({ title: "Error", description: "Connection details not found for removal.", variant: "destructive"});
        return;
    }

    if (!window.confirm(`Are you sure you want to remove the ${connectionDetails.platform} connection (${connectionDetails.username})? This will also remove it from YouTube specific tables if applicable.`)) {
        return;
    }

    // Show loading toast
    const removalToast = toast({ title: "Processing", description: `Removing ${connectionDetails.platform} connection...` });

    try {
      const { error: functionError } = await supabase.functions.invoke('delete-user-connection', {
        body: {
          user_id: currentUser.id,
          connection_id: connectionIdToRemove, // This is the ID like YouTube Channel ID
        },
      });

      if (functionError) {
        let detailedError = functionError.message;
        if (functionError.context && typeof functionError.context.error === 'string') {
            detailedError = functionError.context.error;
        } else if (functionError.context && functionError.context.details) {
            detailedError = functionError.context.details;
        }
        throw new Error(detailedError);
      }

      // Optimistically update the local state
      const updatedConnections = currentUser.connections.filter(c => c.connection_id !== connectionIdToRemove);
      setUsers(users.map(u => (u.id === currentUser.id ? { ...u, connections: updatedConnections } : u)));
      setCurrentUser({ ...currentUser, connections: updatedConnections });
      
      // Update toast to success
      removalToast.update({
        id: removalToast.id, 
        title: "Connection Removed", 
        description: `Successfully removed ${connectionDetails.platform} connection.`, 
        variant: "default"
      });

    } catch (error) {
      console.error("Error removing connection via Edge Function:", error);
      // Update toast to error
      removalToast.update({
        id: removalToast.id, 
        title: "Error", 
        description: `Failed to remove connection. ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    }
  };

  const handleToggleAdminRole = async (user: UserData) => {
    const isAdmin = user.roles.includes("admin");
    const roleToToggle: 'admin' | 'user' = 'admin'; // We are only toggling admin here
    const action = isAdmin ? removeRole : assignRole;
    const actionText = isAdmin ? "Removing admin role" : "Assigning admin role";
    const successText = isAdmin ? "Admin role removed" : "Admin role assigned";

    toast({ title: "Processing", description: `${actionText} for ${user.username}` });

    try {
      // Pass both userId and the role to the action function
      const success = await action(user.id, roleToToggle);

      if (!success) {
        // The roleService functions return false on error, throw to catch below
        throw new Error(`Failed to ${isAdmin ? 'remove' : 'assign'} admin role via roleService.`);
      }

      // Refetch users to update roles accurately
      await fetchUsers();

      toast({ title: "Success", description: `${successText} for ${user.username}.` });
    } catch (error: any) {
      console.error(`Error ${actionText}:`, error);
      toast({
        title: "Error",
        description: `Failed to ${isAdmin ? 'remove' : 'assign'} admin role. ${error.message || ''}`,
        variant: "destructive"
      });
    }
  };

  // Function to fetch and show guilds for a user
  const handleShowGuilds = async (user: UserData) => {
    if (!user || (user.guild_count ?? 0) === 0) return; // Don't open if no guilds

    setSelectedUserForGuilds(user);
    setShowGuildsDialog(true);
    setLoadingGuilds(true);
    setUserGuilds([]); // Clear previous guilds
    setGuildSearchTerm(""); // Reset search term when opening dialog

    try {
      // Fix: Remove the third type parameter from the RPC call
      const { data, error } = await supabase
        .rpc('get_guilds_for_user', { user_uuid: user.id });

      if (error) {
        throw error;
      }

      // Ensure data is an array before setting state
      setUserGuilds(Array.isArray(data) ? data : []);

    } catch (error) {
      console.error("Error fetching user guilds:", error);
      toast({
        title: "Error",
        description: `Failed to load guilds for ${user.username}. ${error instanceof Error ? error.message : ''}`,
        variant: "destructive",
      });
    } finally {
      setLoadingGuilds(false);
    }
  };

  // ---- Added Handler for Showing Devices ----
  const handleShowDevices = (user: UserData) => {
    setSelectedUserForDevices(user);
    setShowDevicesDialog(true);
  };
  // ---- End Added Handler ----

  // ---- Added Handler for Showing YouTube Memberships ----
  const handleShowYouTubeMemberships = (user: UserData) => {
    setSelectedUserForYouTubeMemberships(user);
    setShowYouTubeMembershipsDialog(true);
  };
  // ---- End Added Handler ----

  // --- Delete User Logic ---
  const handleDeleteUser = (user: UserData) => {
    setUserToDelete(user);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;

    setIsDeleting(true);
    try {
      // Call the Supabase Edge function
      const { error } = await supabase.functions.invoke('delete-user', {
        body: { target_user_id: userToDelete.id },
      });

      if (error) {
        // Check if the error object has more details, e.g., from the function's response
         let errorMessage = "Failed to delete user.";
         if (error.context && typeof error.context.error === 'string') {
             errorMessage = error.context.error; // Use error message from function if available
         } else if (error instanceof Error) {
             errorMessage = error.message; // Fallback to generic error message
         }
         console.error("Function invocation error:", error);
         throw new Error(errorMessage); // Throw a new error with the specific message
      }

      // Remove user from local state
      setUsers(prevUsers => prevUsers.filter(u => u.id !== userToDelete.id));

      toast({
        title: "User Deleted",
        description: `Successfully deleted user ${userToDelete.username}.`,
      });

      // Close dialog and reset state
      setShowDeleteConfirm(false);
      setUserToDelete(null);

    } catch (error) {
      console.error("Error deleting user:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unknown error occurred during deletion.",
        variant: "destructive",
      });
      // Keep dialog open on error? Optional.
      // setShowDeleteConfirm(false);
      // setUserToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };
  // --- End Delete User Logic ---

  // --- Sorting Handler ---
  const handleSort = (columnName: string) => {
    if (sortBy === columnName) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(columnName);
      // Default to descending for guild_count and created_at (joined date), ascending for username
      if (columnName === 'guild_count' || columnName === 'created_at') {
        setSortDirection('desc');
      } else {
        setSortDirection('asc');
      }
    }
    // Resetting to page 1 is handled by the useEffect watching sortBy and sortDirection
  };

  // --- Pagination Handlers ---
  const totalPages = Math.ceil(totalUsers / USERS_PER_PAGE);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };
  // --- End Pagination Handlers ---

  // ---- Added: Function to fetch YouTube Channel Details ----
  const handleFetchYouTubeDetails = async (identifier: string) => {
    if (!identifier.trim()) {
      toast({ title: "Input Error", description: "Please enter a YouTube Channel ID or @Username.", variant: "default" });
      return;
    }
    setIsFetchingYouTubeDetails(true);
    setYoutubeChannelDetails(null); // Clear previous details
    setPfpLoadError(false); // Reset PFP error state on new fetch

    try {
      const { data, error } = await supabase.functions.invoke(
        'get-youtube-channel-details',
        { body: { identifier: identifier.trim() } } // Pass identifier
      );

      if (error) {
        console.error("Error invoking get-youtube-channel-details:", error);
        // Check if the error is specifically the 404 we added for not resolving
        if (error.message?.includes("Could not resolve") || error.context?.status === 404) { 
            throw new Error(`Could not resolve '${identifier.trim()}' to a YouTube Channel ID.`);
        } else {
            throw new Error(error.message || "Failed to fetch channel details from function.");
        }
      }

      if (data && data.error) { // Error returned by the function itself (e.g., API key issue)
        console.error("Function returned error:", data.error);
        throw new Error(data.error.details || data.error.message || "Function execution failed.");
      }

      if (!data || !data.id) { // Should have an ID if successful
        throw new Error(`Could not resolve '${identifier.trim()}' to a YouTube Channel ID (unexpected empty response).`);
      }
      
      // Display message if name wasn't found via API, even if ID was resolved
      if (!data.name) { 
        toast({
          title: "Channel Name Not Found",
          description: `Resolved to ID ${data.id}, but could not fetch channel name via API. Memberships shown if any.`, 
          variant: "default"
        });
      }
      
      // Store resolved ID along with other details
      setYoutubeChannelDetails({
        id: data.id, // Store the resolved ID
        name: data.name || null,
        pfpUrl: data.pfpUrl || null,
        memberships: data.memberships || []
      });

    } catch (err) {
      toast({
        title: "Fetch Error",
        description: err instanceof Error ? err.message : "Could not fetch YouTube channel details.",
        variant: "destructive"
      });
      setYoutubeChannelDetails(null); 
    } finally {
      setIsFetchingYouTubeDetails(false);
    }
  };
  // ---- End Added Function ----

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-fredoka text-white mb-2">User Management</h1>
        <p className="text-gray-400">Manage user accounts and their connections</p>
      </div>

      <div className="mb-6">
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search by username, ID or connection..."
            className="pl-9 bg-lolcow-lightgray text-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="lolcow-card overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-lolcow-blue" />
            <span className="ml-2 text-white">Loading users...</span>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-b border-lolcow-lightgray">
                <TableHead 
                  className="text-gray-300 cursor-pointer hover:text-white"
                  onClick={() => handleSort('discord_username')}
                >
                  User 
                  {sortBy === 'discord_username' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '🔼' : '🔽'}</span>
                  )}
                </TableHead>
                <TableHead className="text-gray-300">Connections</TableHead>
                <TableHead 
                  className="text-gray-300 cursor-pointer hover:text-white"
                  onClick={() => handleSort('guild_count')}
                >
                  Guilds 
                  {sortBy === 'guild_count' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '🔼' : '🔽'}</span>
                  )}
                </TableHead>
                <TableHead className="text-gray-300">Memberships</TableHead>
                <TableHead className="text-gray-300">Roles</TableHead>
                <TableHead 
                  className="text-gray-300 cursor-pointer hover:text-white"
                  onClick={() => handleSort('created_at')}
                >
                  Joined 
                  {sortBy === 'created_at' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '🔼' : '🔽'}</span>
                  )}
                </TableHead>
                <TableHead className="text-gray-300 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow 
                  key={user.id}
                  className="border-b border-lolcow-lightgray hover:bg-lolcow-lightgray/10"
                >
                  <TableCell className="py-4">
                    <div className="flex items-center">
                      <img 
                        src={user.avatar || "https://placehold.co/40x40"} 
                        alt={user.username} 
                        className="w-10 h-10 rounded-full mr-3"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (target.src.includes('placehold.co')) {
                            target.style.display = 'none';
                          } else {
                            target.src = "https://placehold.co/40x40";
                          }
                        }}
                      />
                      <div>
                        <div className="font-medium text-white">{user.username}</div>
                        {user.discord_id && (
                          <div className="text-xs text-gray-500">Discord ID: {user.discord_id}</div>
                        )}
                        <div className="text-sm text-gray-400">{user.id}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {user.connections.length > 0 ? (
                        user.connections.map((conn, index) => (
                          <div key={index} className="flex items-center justify-between bg-lolcow-lightgray/20 p-3 rounded">
                            <div className="flex items-center">
                              <span className={`w-3 h-3 rounded-full mr-3 ${conn.connected ? 'bg-green-500' : 'bg-red-500'}`}></span>
                              <div>
                                <span className="font-medium text-white">{conn.platform}: </span>
                                {conn.connected ? (
                                  <>
                                    <span className="text-gray-300">{conn.username}</span>
                                    {conn.platform === 'YouTube' && conn.connection_id && (
                                      <span className="ml-1 text-xs text-gray-400">({conn.connection_id})</span>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-gray-400">Not connected</span>
                                )}
                              </div>
                            </div>
                            {conn.connected && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-white hover:bg-red-500"
                                onClick={() => handleRemoveConnection(conn.connection_id)}
                              >
                                Remove
                              </Button>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="text-gray-400">No connections found</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {/* Display Guild Count - Make it clickable */}
                    {(user.guild_count ?? 0) > 0 ? (
                      <Button 
                        variant="link"
                        className="text-lolcow-blue p-0 h-auto hover:underline"
                        onClick={() => handleShowGuilds(user)}
                      >
                         {user.guild_count}
                      </Button>
                    ) : (
                      <div className="text-gray-400">0</div>
                    )}
                  </TableCell>
                  <TableCell>
                    {(user.youtubeMemberships?.length ?? 0) > 0 ? (
                      <Button
                        variant="link"
                        className="text-red-500 p-0 h-auto hover:underline"
                        onClick={() => handleShowYouTubeMemberships(user)}
                      >
                        {user.youtubeMemberships?.length}
                      </Button>
                    ) : (
                      <div className="text-gray-400">0</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="space-x-1">
                      {user.roles.includes('admin') ? (
                        <span className={`px-2 py-1 rounded-full text-xs bg-yellow-500`}>
                          admin
                        </span>
                      ) : (
                        <span className={`px-2 py-1 rounded-full text-xs bg-blue-500`}>
                          user
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-300">{user.joined}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2 items-center">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-green-500 text-green-500 hover:bg-green-500 hover:text-white"
                        onClick={() => handleImpersonateUser(user)}
                        title="Impersonate User"
                      >
                        <UserCheck className="h-4 w-4 mr-1" />
                        Impersonate
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className={`
                          ${user.roles.includes('admin') 
                            ? 'border-red-500 text-red-500 hover:bg-red-500'
                            : 'border-yellow-500 text-yellow-500 hover:bg-yellow-500'
                          } hover:text-white
                        `}
                        onClick={() => handleToggleAdminRole(user)}
                      >
                        <Shield className="h-4 w-4 mr-1" />
                        {user.roles.includes('admin') ? 'Remove Admin' : 'Make Admin'}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="border-lolcow-blue text-lolcow-blue hover:bg-lolcow-blue hover:text-white"
                        onClick={() => handleEditConnections(user)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleShowDevices(user)} 
                        title="View Devices"
                      >
                        <Smartphone className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteUser(user)}
                        title="Delete User"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-400">
                    {/* Adjust message based on whether a search is active or specific user */}
                    {searchParams.get('userId') && users.length === 0 && !loading ? (
                      `User with ID ${searchParams.get('userId')} not found.`
                    ) : searchTerm.trim() !== "" ? (
                      "No users match your search"
                    ) : totalUsers === 0 && !loading ? (
                      "No users found"
                    ) : (
                      "No users on this page" // Should ideally not be shown if totalUsers > 0
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination Controls - Hide if a specific user is being viewed via URL */}
      {!loading && !searchParams.get('userId') && totalUsers > USERS_PER_PAGE && (
        <div className="flex items-center justify-between mt-6">
          <Button
            variant="outline"
            onClick={handlePreviousPage}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="text-white">
            Page {currentPage} of {totalPages} (Total: {totalUsers} users)
          </span>
          <Button
            variant="outline"
            onClick={handleNextPage}
            disabled={currentPage === totalPages || totalUsers === 0}
          >
            Next
          </Button>
        </div>
      )}

      {/* Add Connection Dialog */}
      <Dialog open={showConnectionDialog} onOpenChange={setShowConnectionDialog}>
        <DialogContent className="bg-lolcow-darkgray text-white border-lolcow-lightgray">
          <DialogHeader>
            <DialogTitle className="text-xl font-fredoka">Manage Connections</DialogTitle>
            <DialogDescription className="text-gray-400">
              Add or edit connections for {currentUser?.username}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <h3 className="text-lg text-white">Current Connections</h3>
            <div className="space-y-2">
              {currentUser?.connections.map((conn, index) => (
                <div key={index} className="flex items-center justify-between bg-lolcow-lightgray/20 p-3 rounded">
                  <div className="flex items-center">
                    <span className={`w-3 h-3 rounded-full mr-3 ${conn.connected ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    <div>
                      <span className="font-medium text-white">{conn.platform}: </span>
                      {conn.connected ? (
                        <>
                          <span className="text-gray-300">{conn.username}</span>
                          {conn.platform === 'YouTube' && conn.connection_id && (
                            <span className="ml-1 text-xs text-gray-400">({conn.connection_id})</span>
                          )}
                        </>
                      ) : (
                        <span className="text-gray-400">Not connected</span>
                      )}
                    </div>
                  </div>
                  {conn.connected && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-white hover:bg-red-500"
                      onClick={() => handleRemoveConnection(conn.connection_id)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
              {(!currentUser?.connections || currentUser.connections.length === 0) && (
                <div className="text-gray-400">No connections found</div>
              )}
            </div>
            
            <div>
              <h3 className="text-lg text-white mb-3">Add Connection</h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-gray-300 mb-1">Platform</label>
                  <select 
                    className="w-full py-2 px-3 rounded-md bg-lolcow-lightgray text-white border border-lolcow-lightgray"
                    value={newConnection.platform}
                    onChange={(e) => {
                      setNewConnection({...newConnection, platform: e.target.value, username: ''}); // Reset username on platform change
                      setYoutubeChannelDetails(null); // Reset fetched details on platform change
                      setPfpLoadError(false); // Reset PFP error state
                    }}
                  >
                    <option value="YouTube">YouTube</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-300 mb-1">
                    {/* Updated Label */}
                    {newConnection.platform === 'YouTube' ? 'YouTube Channel ID or @Username' : 'Username'}
                  </label>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="text" 
                      className="flex-grow py-2 px-3 rounded-md bg-lolcow-lightgray text-white border border-lolcow-lightgray"
                      value={newConnection.username} // This holds the user input (ID or Username)
                      onChange={(e) => {
                        setNewConnection({...newConnection, username: e.target.value});
                        setYoutubeChannelDetails(null); // Clear details if input changes
                        setPfpLoadError(false); // Reset PFP error state
                      }}
                      placeholder={newConnection.platform === 'YouTube' ? 'Enter Channel ID or @Username' : 'Enter username'}
                    />
                    {newConnection.platform === 'YouTube' && (
                      <Button 
                        type="button" 
                        onClick={() => handleFetchYouTubeDetails(newConnection.username)} // Pass the input value
                        disabled={isFetchingYouTubeDetails || !newConnection.username.trim()}
                        variant="secondary"
                        size="sm"
                      >
                        {isFetchingYouTubeDetails ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Search className="h-4 w-4" /> 
                        )}
                         <span className="ml-2">Fetch Details</span>
                      </Button>
                    )}
                  </div>
                </div>
                
                {/* ---- Display Fetched YouTube Channel Details ---- */}
                {newConnection.platform === 'YouTube' && youtubeChannelDetails && (
                  <div className="mt-4 p-3 bg-lolcow-lightgray/30 rounded-md">
                    <h4 className="text-md font-semibold text-white mb-2">Channel Details:</h4>
                    {/* --- Updated PFP Rendering --- */}
                    {!pfpLoadError && youtubeChannelDetails.pfpUrl ? (
                      <img 
                        src={youtubeChannelDetails.pfpUrl} 
                        alt={youtubeChannelDetails.name || 'Channel PFP'} 
                        className="w-16 h-16 rounded-full mb-2 bg-lolcow-lightgray/30" // Added bg for loading phase
                        onError={() => setPfpLoadError(true)} // Set error state on failure
                      />
                    ) : youtubeChannelDetails.name ? ( // Show initial only if name exists
                      <div className="w-16 h-16 rounded-full mb-2 flex items-center justify-center bg-lolcow-blue text-white text-2xl font-semibold">
                        {youtubeChannelDetails.name.charAt(0).toUpperCase()}
                      </div>
                    ) : ( // Fallback if no URL and no name
                       <div className="w-16 h-16 rounded-full mb-2 flex items-center justify-center bg-lolcow-lightgray text-gray-400">
                         <User size={32}/> {/* Placeholder Icon */}
                       </div>
                    )}
                    {/* --- End Updated PFP Rendering --- */}

                    {youtubeChannelDetails.id && ( // Display the resolved ID
                       <p className="text-gray-400 text-xs font-mono mb-1">ID: {youtubeChannelDetails.id}</p>
                    )}
                    {youtubeChannelDetails.name ? (
                      <p className="text-gray-300"><span className="font-medium text-white">Name:</span> {youtubeChannelDetails.name}</p>
                    ) : (
                      <p className="text-gray-400">Channel name not found via API.</p>
                    )}

                    {youtubeChannelDetails.memberships && youtubeChannelDetails.memberships.length > 0 && (
                      <div className="mt-3">
                        <h5 className="text-sm font-semibold text-white mb-1">Existing Memberships (from DB):</h5>
                        <ul className="list-disc list-inside text-gray-400 text-xs space-y-1">
                          {youtubeChannelDetails.memberships.map((mem, index) => (
                            <li key={index}>{mem.membership_level} for {mem.channel_name}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                     {(!youtubeChannelDetails.memberships || youtubeChannelDetails.memberships.length === 0) && (
                        <p className="text-xs text-gray-500 mt-2">No existing memberships found in DB for this Channel ID.</p>
                    )}
                  </div>
                )}
                {newConnection.platform === 'YouTube' && isFetchingYouTubeDetails && !youtubeChannelDetails && (
                    <div className="mt-4 flex items-center justify-center p-4 bg-lolcow-lightgray/30 rounded-md">
                        <Loader2 className="h-5 w-5 animate-spin text-lolcow-blue" />
                        <span className="ml-2 text-white">Fetching details...</span>
                    </div>
                )}
                {/* ---- End Display Fetched YouTube Channel Details ---- */}

              </div>
            </div>
          </div>
          
          <div className="flex justify-end mt-6">
            <Button
              className="mr-2 bg-lolcow-blue hover:bg-lolcow-blue/80"
              onClick={handleAddConnection}
              disabled={isAddingConnection || (newConnection.platform === 'YouTube' && !youtubeChannelDetails?.id)} // Check for resolved ID
            >
              {isAddingConnection ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} 
              {isAddingConnection ? 'Adding...' : 'Add Connection'}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowConnectionDialog(false)}
              disabled={isAddingConnection}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Show Guilds Dialog */}
      <Dialog open={showGuildsDialog} onOpenChange={setShowGuildsDialog}>
        <DialogContent className="bg-lolcow-darkgray text-white border-lolcow-lightgray max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-fredoka flex items-center">
              <Server className="w-5 h-5 mr-2" />
              Guilds for {selectedUserForGuilds?.username}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              List of Discord servers the user is in.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 max-h-[60vh] overflow-y-auto">
            {/* Add Guild Search Input */}
            <div className="relative mb-4 px-1">
              <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by guild name or ID..."
                className="pl-9 bg-lolcow-lightgray/30 text-white border-lolcow-lightgray focus:ring-lolcow-blue"
                value={guildSearchTerm}
                onChange={(e) => setGuildSearchTerm(e.target.value)}
              />
            </div>

            {loadingGuilds ? (
              <div className="flex justify-center items-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-lolcow-blue" />
                <span className="ml-2 text-white">Loading guilds...</span>
              </div>
            ) : userGuilds.length > 0 ? (
              <ul className="space-y-2 px-1">
                {/* Map over filteredGuilds instead of userGuilds */}
                {filteredGuilds.length > 0 ? (
                  filteredGuilds.map((guild) => (
                    <li 
                      key={guild.guild_id} 
                      className="flex items-center bg-lolcow-lightgray/20 p-3 rounded text-sm"
                    >
                      <span className="truncate" title={guild.guild_name}>{guild.guild_name}</span>
                      <span className="ml-auto text-xs text-gray-500" title={guild.guild_id}>({guild.guild_id})</span>
                    </li>
                  ))
                ) : (
                   <div className="text-center text-gray-400 py-4">
                     No guilds match your search.
                   </div>
                )}
              </ul>
            ) : (
              <div className="text-center text-gray-400 py-4">
                No guilds found or unable to load guilds.
              </div>
            )}
          </div>
          
          <div className="flex justify-end mt-4">
            <Button 
              variant="outline" 
              onClick={() => setShowGuildsDialog(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Replace Delete Confirmation Dialog with reusable component */}
      <ConfirmationDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={handleConfirmDelete}
        isConfirming={isDeleting}
        title="Confirm User Deletion"
        description={
          <> {/* Use JSX fragment for dynamic description */}
            Are you sure you want to permanently delete user <span className="font-semibold text-white">{userToDelete?.username}</span>?
            This action cannot be undone. All associated data (profile, connections, etc.) will be removed.
          </>
        }
        confirmText="Confirm Delete"
        confirmVariant="destructive"
      />

      {/* ---- Added Devices Dialog Render ---- */}
      <UserDevicesDialog 
        user={selectedUserForDevices}
        open={showDevicesDialog}
        onOpenChange={setShowDevicesDialog}
      />
      {/* ---- End Added Dialog Render ---- */}

      {/* ---- Added YouTube Memberships Dialog Render ---- */}
      <UserYouTubeMembershipsDialog
        user={selectedUserForYouTubeMemberships}
        open={showYouTubeMembershipsDialog}
        onOpenChange={setShowYouTubeMembershipsDialog}
      />
      {/* ---- End Added YouTube Memberships Dialog Render ---- */}

    </AdminLayout>
  );
};

export default AdminUsers;