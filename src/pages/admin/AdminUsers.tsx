import React, { useState, useEffect, ReactNode } from "react";
import AdminLayout from "../../components/AdminLayout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { User, Shield, Loader2, Server, Search, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { assignRole, removeRole } from "@/services/roleService";
import { Input } from "@/components/ui/input";

interface UserData {
  id: string;
  email: string;
  username: string;
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
}

// Define type for a single guild
interface Guild {
  guild_id: string;
  guild_name: string;
}

const AdminUsers: React.FC = (): ReactNode => {
  const [showConnectionDialog, setShowConnectionDialog] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [newConnection, setNewConnection] = useState({ platform: "YouTube", username: "" });
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingConnection, setIsAddingConnection] = useState(false);
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);

  // State for Guilds Dialog
  const [showGuildsDialog, setShowGuildsDialog] = useState(false);
  const [selectedUserForGuilds, setSelectedUserForGuilds] = useState<UserData | null>(null);
  const [loadingGuilds, setLoadingGuilds] = useState(false);
  const [userGuilds, setUserGuilds] = useState<Guild[]>([]);

  // State for Delete Confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    // Filter users based on search term
    if (!searchTerm.trim()) {
      setFilteredUsers(users);
    } else {
      const lowercaseSearch = searchTerm.toLowerCase();
      setFilteredUsers(users.filter(user => 
        user.username.toLowerCase().includes(lowercaseSearch) || 
        user.id.toLowerCase().includes(lowercaseSearch) ||
        user.connections.some(conn => 
          conn.username.toLowerCase().includes(lowercaseSearch)
        )
      ));
    }
  }, [searchTerm, users]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch profiles - explicitly select discord_id if needed, though '*' should get it.
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*, discord_id'); // Ensure discord_id is selected

      if (profilesError) {
        throw profilesError;
      }

      // Fetch roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) {
        throw rolesError;
      }

      // Fetch all connections (assuming discord_connections holds all types)
      const { data: allConnections, error: connectionsError } = await supabase
        .from('discord_connections') // Changed from fetching discord/youtube separately
        .select('*');

      if (connectionsError) {
        throw connectionsError; // Changed error variable
      }

      // Fetch guild counts using the RPC function
      const { data: guildCountsData, error: guildCountsError } = await supabase
        .rpc('get_user_guild_counts'); // Call the RPC function

      if (guildCountsError) {
        // Don't throw, maybe just log, as guilds might be optional
        console.error("Error fetching guild counts:", guildCountsError);
        // Potentially show a toast, but maybe not critical?
      }

      // Process guild counts from RPC into a map
      const guildCountMap = new Map<string, number>();
      if (Array.isArray(guildCountsData)) {
        guildCountsData.forEach((row: { user_id: string; guild_count: bigint | number | null }) => {
          // Ensure guild_count is treated as a number, handle potential nulls/undefined
          const count = typeof row.guild_count === 'bigint' 
                          ? Number(row.guild_count) 
                          : (typeof row.guild_count === 'number' ? row.guild_count : 0);
          guildCountMap.set(row.user_id, count);
        });
      } else {
        // Log if RPC data is unexpectedly null/undefined
        console.warn("Received null/undefined data from get_user_guild_counts RPC.");
      }

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
          avatar: avatarUrl, // Use the correctly constructed URL
          joined: new Date(profile.created_at).toLocaleDateString(),
          connections: [],
          roles: [],
          guild_count: guildCountMap.get(profile.id) || 0 // Get count from map
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

  const handleLoginAs = (user: UserData) => {
    toast({
      title: "Admin Action",
      description: `Logged in as ${user.username}`,
    });
  };

  const handleAddConnection = async () => {
    if (!currentUser || !newConnection.username.trim()) {
      toast({
        title: "Error",
        description: "User or connection details missing.",
        variant: "destructive"
      });
      return;
    }

    setIsAddingConnection(true);

    try {
      const connectionType = newConnection.platform.toLowerCase();
      const connectionName = newConnection.username.trim();

      // Use the same table 'discord_connections' used in fetchUsers
      const { error } = await supabase
        .from('discord_connections')
        .insert({
          user_id: currentUser.id,
          connection_type: connectionType,
          connection_name: connectionName,
          connection_id: connectionName, // Use username/channelId as connection_id for manual add
          connection_verified: true // Manually added connections are considered verified
          // Add other necessary fields if your table has them
        });

      if (error) {
        throw error;
      }

      // Optimistically update the local state
      const addedConnection = {
        platform: newConnection.platform,
        username: connectionName,
        connected: true,
        connection_id: connectionName // Include connection_id used in insert
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

  const handleRemoveConnection = async (connectionId: string) => {
    if (!currentUser) return;

    // Use the actual connection identifier from the database table
    // In fetchUsers, we stored the connection_id which should be unique per user+connection
    const connectionToRemove = currentUser.connections.find(c => c.connection_id === connectionId);

    if (!connectionToRemove) {
        toast({ title: "Error", description: "Connection details not found for removal.", variant: "destructive"});
        return;
    }

    // Display confirmation toast or dialog if preferred
    if (!window.confirm(`Are you sure you want to remove the ${connectionToRemove.platform} connection (${connectionToRemove.username})?`)) {
        return;
    }

    try {
        // Target the correct table and use the correct identifier (connection_id)
        const { error } = await supabase
            .from('discord_connections') // Using the table assumed to hold all connections
            .delete()
            .match({ user_id: currentUser.id, connection_id: connectionId }); // Match user and connection_id

        if (error) {
            throw error;
        }

        // Update local state optimistically
        const updatedConnections = currentUser.connections.filter(c => c.connection_id !== connectionId);
        setUsers(users.map(u => (u.id === currentUser.id ? { ...u, connections: updatedConnections } : u)));
        setCurrentUser({ ...currentUser, connections: updatedConnections });

        toast({
            title: "Connection Removed",
            description: `Removed ${connectionToRemove.platform} connection.`
        });

    } catch (error) {
        console.error("Error removing connection:", error);
        toast({
            title: "Error",
            description: `Failed to remove connection. ${error instanceof Error ? error.message : ''}`,
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
                <TableHead className="text-gray-300">User</TableHead>
                <TableHead className="text-gray-300">Connections</TableHead>
                <TableHead className="text-gray-300">Role</TableHead>
                <TableHead className="text-gray-300">Guilds</TableHead>
                <TableHead className="text-gray-300">Joined</TableHead>
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
                        src={user.avatar || "https://via.placeholder.com/40"} 
                        alt={user.username} 
                        className="w-10 h-10 rounded-full mr-3"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://via.placeholder.com/40";
                        }}
                      />
                      <div>
                        <div className="font-medium text-white">{user.username}</div>
                        <div className="text-sm text-gray-400">{user.id}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {user.connections.length > 0 ? (
                        user.connections.map((conn, index) => (
                          <div key={index} className="flex items-center">
                            <span className={`w-2 h-2 rounded-full mr-2 ${conn.connected ? 'bg-green-500' : 'bg-red-500'}`}></span>
                            <span className="text-white font-medium">{conn.platform}: </span>
                            <span className="ml-1 text-gray-400">
                              {conn.connected ? conn.username : "Not connected"}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="text-gray-400">No connections</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-x-1">
                      {user.roles.length > 0 ? (
                        user.roles.map((role, index) => {
                          let bg = "bg-gray-500";
                          if (role === "admin") bg = "bg-yellow-500";
                          else if (role === "user") bg = "bg-blue-500";
                          
                          return (
                            <span key={index} className={`px-2 py-1 rounded-full text-xs ${bg}`}>
                              {role}
                            </span>
                          );
                        })
                      ) : (
                        <span className="text-gray-400">No roles</span>
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
                  <TableCell className="text-gray-300">{user.joined}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
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
                        size="sm"
                        onClick={() => handleLoginAs(user)}
                        className="border-lolcow-green text-lolcow-green hover:bg-lolcow-green hover:text-white"
                      >
                        <User className="h-4 w-4 mr-1" />
                        Login As
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
                  <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                    {users.length === 0 ? "No users found" : "No users match your search"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

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
                    <span>{conn.platform}: {conn.connected ? conn.username : "Not connected"}</span>
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
                    onChange={(e) => setNewConnection({...newConnection, platform: e.target.value})}
                  >
                    <option value="YouTube">YouTube</option>
                    <option value="Discord">Discord</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-300 mb-1">
                    {newConnection.platform === 'YouTube' ? 'YouTube Channel ID' : 'Username'}
                  </label>
                  <input 
                    type="text" 
                    className="w-full py-2 px-3 rounded-md bg-lolcow-lightgray text-white border border-lolcow-lightgray"
                    value={newConnection.username}
                    onChange={(e) => setNewConnection({...newConnection, username: e.target.value})}
                    placeholder={newConnection.platform === 'YouTube' ? 'Enter Channel ID (e.g., UC...)' : 'Enter username'}
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end mt-6">
            <Button
              className="mr-2 bg-lolcow-blue hover:bg-lolcow-blue/80"
              onClick={handleAddConnection}
              disabled={isAddingConnection || !newConnection.username.trim()}
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
            {loadingGuilds ? (
              <div className="flex justify-center items-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-lolcow-blue" />
                <span className="ml-2 text-white">Loading guilds...</span>
              </div>
            ) : userGuilds.length > 0 ? (
              <ul className="space-y-2">
                {userGuilds.map((guild) => (
                  <li 
                    key={guild.guild_id} 
                    className="flex items-center bg-lolcow-lightgray/20 p-3 rounded text-sm"
                  >
                    <span className="truncate" title={guild.guild_name}>{guild.guild_name}</span>
                    <span className="ml-auto text-xs text-gray-500" title={guild.guild_id}>({guild.guild_id})</span>
                  </li>
                ))}
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete user <span className="font-semibold">{userToDelete?.username}</span>?
              This action cannot be undone. All associated data (profile, connections, etc.) will be removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </AdminLayout>
  );
};

export default AdminUsers;
