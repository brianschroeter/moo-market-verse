
import { createClient } from '@supabase/supabase-js';

// Ensure environment variables are set
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
// IMPORTANT: Use the Service Role Key for admin operations!
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Supabase URL or Service Role Key is missing in environment variables for admin operations.');
}

// Initialize Supabase client WITH SERVICE ROLE for admin access
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

// Function to handle GET request to fetch all newsletter signups
export async function fetchNewsletterSignups() {
  try {
    const { data, error } = await supabaseAdmin
      .from('newsletter_signups')
      .select('id, email, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Ensure data is always an array, even if null from Supabase
    return data || [];
  } catch (error: any) {
    console.error('Error fetching newsletter signups:', error);
    // Return an empty array on error
    return [];
  }
}

// Function to handle DELETE request to delete a newsletter signup
export async function deleteNewsletterSignup(id: string) {
  if (!id) {
    throw new Error('Signup ID is required.');
  }

  try {
    const { error } = await supabaseAdmin
      .from('newsletter_signups')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return { message: 'Signup deleted successfully.' };
  } catch (error: any) {
    console.error('Error deleting newsletter signup:', error);
    throw new Error(error.message || 'Failed to delete signup');
  }
}
