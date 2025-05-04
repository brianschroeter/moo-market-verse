
import React, { useState, useEffect } from "react";
import AdminLayout from "../../components/AdminLayout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { User, Shield, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { assignRole, removeRole } from "@/services/roleService";

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
  }[];
  roles: string[];
}

const AdminUsers: React.FC = () => {
  const [showConnectionDialog, setShowConnectionDialog] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [newConnection, setNewConnection] = useState({ platform: "YouTube", username: "" });
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

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

      // Fetch discord connections
      const { data: discordConnections, error: discordError } = await supabase
        .from('discord_connections')
        .select('*');

      if (discordError) {
        throw discordError;
      }

      // Fetch YouTube connections
      const { data: youtubeConnections, error: youtubeError } = await supabase
        .from('youtube_connections')
        .select('*');

      if (youtubeError) {
        throw youtubeError;
      }

      // Process and combine the data
      const userMap = new Map<string, UserData>();

      profiles.forEach(profile => {
        userMap.set(profile.id, {
          id: profile.id,
          email: "", // We don't have direct access to this
          username: profile.discord_username || "Unknown",
          avatar: profile.discord_avatar,
          joined: new Date(profile.created_at).toLocaleDateString(),
          connections: [],
          roles: []
        });
      });

      // Add roles
      roles.forEach(role => {
        const user = userMap.get(role.user_id);
        if (user) {
          user.roles.push(role.role);
        }
      });

      // Add Discord connections
      discordConnections.forEach(conn => {
        const user = userMap.get(conn.user_id);
        if (user) {
          user.connections.push({
            platform: "Discord",
            username: conn.connection_name,
            connected: true
          });
        }
      });

      // Add YouTube connections
      youtubeConnections.forEach(conn => {
        const user = userMap.get(conn.user_id);
        if (user) {
          user.connections.push({
            platform: "YouTube",
            username: conn.youtube_channel_name,
            connected: true
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

  const handleAddConnection = () => {
    // In a real app, we would send this to the API
    toast({
      title: "Connection Added",
      description: `Added ${newConnection.platform} connection for ${currentUser?.username}`,
    });
    setShowConnectionDialog(false);
  };

  const handleToggleAdminRole = async (user: UserData) => {
    try {
      const isAdmin = user.roles.includes('admin');
      
      if (isAdmin) {
        const success = await removeRole(user.id, 'admin');
        if (success) {
          // Update local state
          setUsers(users.map(u => {
            if (u.id === user.id) {
              return {
                ...u,
                roles: u.roles.filter(role => role !== 'admin')
              };
            }
            return u;
          }));
          
          toast({
            title: "Role Updated",
            description: `Admin role removed from ${user.username}`
          });
        } else {
          throw new Error("Failed to remove admin role");
        }
      } else {
        const success = await assignRole(user.id, 'admin');
        if (success) {
          // Update local state
          setUsers(users.map(u => {
            if (u.id === user.id) {
              return {
                ...u,
                roles: [...u.roles, 'admin']
              };
            }
            return u;
          }));
          
          toast({
            title: "Role Updated",
            description: `Admin role granted to ${user.username}`
          });
        } else {
          throw new Error("Failed to assign admin role");
        }
      }
    } catch (error) {
      console.error("Error updating role:", error);
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive"
      });
    }
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-fredoka text-white mb-2">User Management</h1>
        <p className="text-gray-400">Manage user accounts and their connections</p>
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
                <TableHead className="text-gray-300">Joined</TableHead>
                <TableHead className="text-gray-300 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
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
                            <span className="text-gray-300">{conn.platform}: </span>
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
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-400">
                    No users found
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
                  <label className="block text-gray-300 mb-1">Username</label>
                  <input 
                    type="text" 
                    className="w-full py-2 px-3 rounded-md bg-lolcow-lightgray text-white border border-lolcow-lightgray"
                    value={newConnection.username}
                    onChange={(e) => setNewConnection({...newConnection, username: e.target.value})}
                    placeholder="Enter username"
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end mt-6">
            <Button
              className="mr-2 bg-lolcow-blue hover:bg-lolcow-blue/80"
              onClick={handleAddConnection}
            >
              Add Connection
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowConnectionDialog(false)}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminUsers;
