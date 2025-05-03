
import React, { useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { User } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

// Mock user data
const mockUsers = [
  {
    id: "123456789",
    username: "CowFan123",
    email: "cowfan@example.com",
    avatar: "https://cdn.discordapp.com/avatars/123456789/abcdef.png",
    joined: "Jan 15, 2023",
    connections: [
      { platform: "YouTube", username: "CowFan Gaming", connected: true },
      { platform: "Discord", username: "CowFan#1234", connected: true }
    ],
    roles: ["crown"]
  },
  {
    id: "987654321",
    username: "LolCowLover",
    email: "lolcowlover@example.com",
    avatar: "https://via.placeholder.com/40",
    joined: "Feb 23, 2023",
    connections: [
      { platform: "YouTube", username: "", connected: false },
      { platform: "Discord", username: "LolCowLover#5678", connected: true }
    ],
    roles: ["pay pig"]
  },
  {
    id: "456789123",
    username: "BanWorldUser",
    email: "banned@example.com",
    avatar: "https://via.placeholder.com/40",
    joined: "Mar 10, 2023",
    connections: [
      { platform: "YouTube", username: "BanWorld", connected: true },
      { platform: "Discord", username: "BanWorldUser#9012", connected: true }
    ],
    roles: ["ban world"]
  }
];

const AdminUsers: React.FC = () => {
  const [showConnectionDialog, setShowConnectionDialog] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [newConnection, setNewConnection] = useState({ platform: "YouTube", username: "" });
  const { toast } = useToast();

  const handleEditConnections = (user: any) => {
    setCurrentUser(user);
    setShowConnectionDialog(true);
  };

  const handleLoginAs = (user: any) => {
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

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-fredoka text-white mb-2">User Management</h1>
        <p className="text-gray-400">Manage user accounts and their connections</p>
      </div>

      <div className="lolcow-card overflow-hidden">
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
            {mockUsers.map((user) => (
              <TableRow 
                key={user.id}
                className="border-b border-lolcow-lightgray hover:bg-lolcow-lightgray/10"
              >
                <TableCell className="py-4">
                  <div className="flex items-center">
                    <img 
                      src={user.avatar} 
                      alt={user.username} 
                      className="w-10 h-10 rounded-full mr-3"
                    />
                    <div>
                      <div className="font-medium text-white">{user.username}</div>
                      <div className="text-sm text-gray-400">{user.email}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    {user.connections.map((conn, index) => (
                      <div key={index} className="flex items-center">
                        <span className={`w-2 h-2 rounded-full mr-2 ${conn.connected ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        <span className="text-gray-300">{conn.platform}: </span>
                        <span className="ml-1 text-gray-400">
                          {conn.connected ? conn.username : "Not connected"}
                        </span>
                      </div>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-x-1">
                    {user.roles.map((role, index) => {
                      let bg = "bg-gray-500";
                      if (role === "crown") bg = "bg-yellow-500";
                      else if (role === "pay pig") bg = "bg-purple-500";
                      else if (role === "ban world") bg = "bg-red-500";
                      
                      return (
                        <span key={index} className={`px-2 py-1 rounded-full text-xs ${bg}`}>
                          {role}
                        </span>
                      );
                    })}
                  </div>
                </TableCell>
                <TableCell className="text-gray-300">{user.joined}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-2">
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
          </TableBody>
        </Table>
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
              {currentUser?.connections.map((conn: any, index: number) => (
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
