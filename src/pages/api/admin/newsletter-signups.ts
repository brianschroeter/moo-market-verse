import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Ensure environment variables are set
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// IMPORTANT: Use the Service Role Key for admin operations!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Supabase URL or Service Role Key is missing in environment variables for admin operations.');
}

// Initialize Supabase client WITH SERVICE ROLE for admin access
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

// TODO: Add proper authentication and authorization checks here!
// Ensure only authorized admins can access this endpoint.
// Example: Check user session, role, etc.
const checkAdminAuth = async (req: NextApiRequest): Promise<boolean> => {
  // Replace with your actual admin authentication logic
  console.warn('Warning: Admin authentication check is not implemented!');
  // const { data: { user }, error } = await supabaseAdmin.auth.getUser(req.cookies['supabase-auth-token']);
  // if (error || !user) return false;
  // const { data: profile } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', user.id).single();
  // return !!profile?.is_admin;
  return true; // Placeholder: Allows access for now
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // TODO: Implement robust admin authentication/authorization
  // const isAdmin = await checkAdminAuth(req);
  // if (!isAdmin) {
  //   return res.status(403).json({ message: 'Forbidden: Admin access required.' });
  // }

  if (req.method === 'GET') {
    // Fetch all newsletter signups
    try {
      const { data, error } = await supabaseAdmin
        .from('newsletter_signups')
        .select('id, email, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Ensure data is always an array, even if null from Supabase
      const responseData = data || []; 
      return res.status(200).json(responseData); // Ensure this returns [] if data is null

    } catch (error: any) {
      console.error('Error fetching newsletter signups:', error);
      // Return an empty array on error too, so the frontend doesn't break
      return res.status(500).json([]); // Return empty array on error
    }
  } else if (req.method === 'DELETE') {
    // Delete a newsletter signup
    const { id } = req.query; // Get ID from query parameter

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: 'Signup ID is required.' });
    }

    try {
      const { error } = await supabaseAdmin
        .from('newsletter_signups')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return res.status(200).json({ message: 'Signup deleted successfully.' });
    } catch (error: any) {
      console.error('Error deleting newsletter signup:', error);
      return res.status(500).json({ message: 'Failed to delete signup', error: error.message });
    }
  } else {
    res.setHeader('Allow', ['GET', 'DELETE']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }
} 