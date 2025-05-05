import { supabase } from "@/integrations/supabase/client";

// Base URL for Supabase functions
const functionsUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export interface NewsletterSignup {
  id: string;
  email: string;
  created_at: string;
}

// Fetch all newsletter signups using the Edge Function
export const getNewsletterSignups = async (): Promise<NewsletterSignup[]> => {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    if (!session) throw new Error("User not authenticated");
    if (!anonKey) throw new Error("Supabase anon key is missing");

    const response = await fetch(`${functionsUrl}/get-newsletter-signups`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': anonKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    // Ensure the function returns an array, matching the expected Promise type
    return Array.isArray(data) ? data : []; 
  } catch (error: any) {
    console.error('Error in getNewsletterSignups:', error);
    throw new Error(error.message || 'Failed to fetch signups');
  }
};

// Delete a newsletter signup by ID using the Edge Function
export const deleteNewsletterSignup = async (id: string): Promise<{ message: string }> => {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    if (!session) throw new Error("User not authenticated");
    if (!anonKey) throw new Error("Supabase anon key is missing");

    const response = await fetch(`${functionsUrl}/delete-newsletter-signup`, {
      method: 'POST', // Assuming DELETE is done via POST, adjust if needed
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': anonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error('Error in deleteNewsletterSignup:', error);
    throw new Error(error.message || 'Failed to delete signup');
  }
}; 
