
import React, { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import MakeAdminButton from "@/components/admin/MakeAdminButton";
import { User } from "@/services/types/user-types";
import { DataTable } from "@/components/ui/data-table";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const AdminUsers: React.FC = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);

  const { isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      try {
        // Use the get_all_users RPC function
        const { data, error } = await supabase.rpc('get_all_users');
        
        if (error) {
          throw error;
        }
        
        // Transform and set the users data
        const transformedData = data.map((user: any) => ({
          id: user.id,
          email: user.email,
          created_at: user.created_at,
          updated_at: user.updated_at,
          user_metadata: user.user_metadata
        }));
        
        setUsers(transformedData as User[]);
        return transformedData;
      } catch (err: any) {
        console.error("Error fetching users:", err);
        toast({
          title: "Error",
          description: "Failed to load users. " + (err as Error).message,
          variant: "destructive",
        });
        throw err;
      }
    }
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-fredoka text-white">Users</h1>
          <p className="text-gray-400 mt-1">Manage user accounts</p>
        </div>

        {isLoading ? (
          <div className="text-center py-10">
            <p className="text-gray-400">Loading users...</p>
          </div>
        ) : (
          <Table>
            <TableCaption>A list of all users.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>
                    {user.user_metadata?.discord_username || 
                      user.user_metadata?.name || 
                      user.user_metadata?.full_name || 
                      "Unknown"}
                  </TableCell>
                  <TableCell>
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <MakeAdminButton userId={user.id} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminUsers;
