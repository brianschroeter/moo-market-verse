
import React from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import MakeAdminButton from "@/components/admin/MakeAdminButton";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
  user_metadata: {
    full_name: string;
    avatar_url: string;
  };
}

const getAllUsers = async (): Promise<User[]> => {
  const { data, error } = await supabase.rpc('get_all_users');
  
  if (error) {
    console.error("Error fetching users:", error);
    throw error;
  }
  
  return data as User[] || [];
};

const AdminUsers: React.FC = () => {
  const { toast } = useToast();
  
  const { data: users = [], isLoading, isError, error } = useQuery({
    queryKey: ["users"],
    queryFn: getAllUsers,
    meta: {
      onSettled: (data: any, err: Error | null) => {
        if (err) {
          toast({
            title: "Error fetching users",
            description: `Failed to fetch users: ${err.message}`,
            variant: "destructive",
          });
        }
      }
    }
  });

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="lolcow-card p-8 text-center">
            <h2 className="text-2xl font-fredoka text-white mb-4">Loading...</h2>
            <p className="text-gray-300">Fetching user data...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (isError) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="lolcow-card p-8 text-center">
            <h2 className="text-2xl font-fredoka text-white mb-4">Error</h2>
            <p className="text-gray-300">Failed to load user data.</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-fredoka text-white">User Management</h1>
          <p className="text-gray-400 mt-1">View and manage all users in the system</p>
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
                <TableHead className="text-gray-300">Guilds</TableHead>
                <TableHead className="text-gray-300">Roles</TableHead>
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
                  <TableHead className="text-gray-300">Full Name</TableHead>
                  <TableHead className="text-gray-300">Email</TableHead>
                  <TableHead className="text-gray-300">Created At</TableHead>
                  <TableHead className="text-gray-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.user_metadata?.full_name || 'N/A'}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <MakeAdminButton userId={user.id} />
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6">
                      No users found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminUsers;
