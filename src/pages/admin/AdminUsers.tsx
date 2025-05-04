
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

        {/* User table */}
        <Card className="lolcow-card">
          <CardHeader>
            <CardTitle>All Users</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
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
