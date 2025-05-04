import axios from 'axios';

export interface NewsletterSignup {
  id: string;
  email: string;
  created_at: string;
}

// NEW: Supabase Edge Function URL
// IMPORTANT: Replace <your-project-ref> with your actual Supabase project reference ID
const FUNCTION_URL = `https://dlmbqojnhjsecajxltzj.supabase.co/functions/v1/get-newsletter-signups`;

// Fetch all newsletter signups using the Edge Function
export const getNewsletterSignups = async (): Promise<NewsletterSignup[]> => {
  try {
    // Use fetch to call the Edge Function.
    // You might need to include the Anon key if your function requires it
    // or if you have Row Level Security based on user authentication.
    // For now, assuming the function uses Service Role Key internally and doesn't need auth from caller.
    const response = await fetch(FUNCTION_URL, {
        method: 'GET', // or 'POST' depending on your function setup
        headers: {
            'Content-Type': 'application/json',
            // Add Supabase Anon Key if function requires it for RLS or auth context
            // 'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            // Add Authorization header if the user needs to be authenticated
            // 'Authorization': `Bearer ${supabaseClient.auth.session()?.access_token}`
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to parse error response' }));
        console.error('Error fetching newsletter signups from Edge Function:', response.status, errorData);
        throw new Error(errorData?.error || errorData?.message || `Failed to fetch signups (status ${response.status})`);
    }

    const data: NewsletterSignup[] = await response.json();
    return data || []; // Ensure it returns an array

  } catch (error: any) {
    console.error('Error calling getNewsletterSignups Edge Function:', error);
    // Rethrow or handle error as appropriate for your frontend
    throw new Error(error.message || 'Failed to fetch signups via Edge Function');
  }
};

// Delete a newsletter signup by ID using the Edge Function
export const deleteNewsletterSignup = async (id: string): Promise<{ message: string }> => {
  // Construct the URL for the delete function with the ID as a query parameter
  const DELETE_FUNCTION_URL = `https://dlmbqojnhjsecajxltzj.supabase.co/functions/v1/delete-newsletter-signup?id=${encodeURIComponent(id)}`;

  try {
    const response = await fetch(DELETE_FUNCTION_URL, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            // Add Supabase Anon Key if function requires it for RLS or auth context
            // 'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            // Add Authorization header if the user needs to be authenticated
            // 'Authorization': `Bearer ${supabaseClient.auth.session()?.access_token}`
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to parse error response' }));
        console.error('Error deleting newsletter signup via Edge Function:', response.status, errorData);
        throw new Error(errorData?.error || errorData?.message || `Failed to delete signup (status ${response.status})`);
    }

    const data = await response.json();
    return data;

  } catch (error: any) {
    console.error('Error calling deleteNewsletterSignup Edge Function:', error);
    // Rethrow or handle error as appropriate for your frontend
    throw new Error(error.message || 'Failed to delete signup via Edge Function');
  }
}; 