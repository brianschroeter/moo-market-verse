
import { supabase } from "@/integrations/supabase/client";

export interface UserRole {
  id: string;
  user_id: string;
  role: 'admin' | 'user';
  created_at: string;
}

/**
 * Check if the current user has a specific role
 */
export const hasRole = async (role: 'admin' | 'user'): Promise<boolean> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return false;
    }
    
    // Call the has_role function we defined in the database
    const { data, error } = await supabase
      .rpc('has_role', { 
        _user_id: session.user.id,
        _role: role 
      });
    
    if (error) {
      console.error('Error checking role:', error);
      return false;
    }
    
    return !!data;
  } catch (error) {
    console.error('Error in hasRole:', error);
    return false;
  }
};

/**
 * Get all roles for the current user
 */
export const getUserRoles = async (): Promise<UserRole[]> => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.user) {
    return [];
  }
  
  const { data, error } = await supabase
    .from('user_roles')
    .select('*')
    .eq('user_id', session.user.id);
    
  if (error) {
    console.error('Error fetching user roles:', error);
    return [];
  }
  
  return data as UserRole[];
};

/**
 * Assign a role to a user by calling the secure RPC function
 */
export const assignRole = async (userId: string, role: 'admin' | 'user'): Promise<boolean> => {
  try {
    // Call the RPC function instead of direct insert
    const { error } = await supabase.rpc('assign_admin_role', {
      target_user_id: userId,
      target_role: role
    });

    if (error) {
      // Log the specific RPC error
      console.error(`Error calling assign_admin_role RPC for user ${userId}, role ${role}:`, error);
      return false;
    }

    console.log(`Successfully called assign_admin_role for user ${userId}, role ${role}`);
    return true;
  } catch (error) {
    console.error('Error in assignRole (RPC call):', error);
    return false;
  }
};

/**
 * Remove a role from a user
 */
export const removeRole = async (userId: string, role: 'admin' | 'user'): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role', role);
      
    if (error) {
      console.error('Error removing role:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in removeRole:', error);
    return false;
  }
};

/**
 * Get all users with their roles
 */
export const getUsersWithRoles = async (): Promise<{
  id: string;
  email: string;
  roles: string[];
}[]> => {
  try {
    // This requires admin role to work due to RLS policies
    const { data: usersData, error: usersError } = await supabase
      .from('user_roles')
      .select(`
        user_id,
        role
      `);
      
    if (usersError) {
      console.error('Error fetching users with roles:', usersError);
      return [];
    }
    
    // Group by user_id to get all roles per user
    const userRolesMap = usersData.reduce((acc, curr) => {
      if (!acc[curr.user_id]) {
        acc[curr.user_id] = [];
      }
      acc[curr.user_id].push(curr.role);
      return acc;
    }, {} as Record<string, string[]>);
    
    return Object.entries(userRolesMap).map(([userId, roles]) => ({
      id: userId,
      email: '', // We would need to query auth.users to get this, but can't due to RLS
      roles
    }));
  } catch (error) {
    console.error('Error in getUsersWithRoles:', error);
    return [];
  }
};
