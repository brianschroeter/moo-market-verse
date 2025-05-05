
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Supabase URL or Service Role Key is missing in environment variables.');
}

// Use the server client with service role for insertion
const supabaseServerClient = createClient(supabaseUrl, supabaseServiceRoleKey);

// Basic email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Function to subscribe email to newsletter
export async function subscribeToNewsletter(email: string) {
  if (!email || typeof email !== 'string' || !emailRegex.test(email)) {
    throw new Error('Invalid email address provided.');
  }

  try {
    const { data, error } = await supabaseServerClient
      .from('newsletter_signups')
      .insert([{ email }])
      .select();

    if (error) {
      // Handle potential errors, e.g., duplicate email violation (error code 23505)
      if (error.code === '23505') {
        throw new Error('This email is already subscribed.');
      }
      console.error('Supabase error:', error);
      throw new Error('Failed to subscribe email.');
    }

    // Successfully inserted
    return { message: 'Successfully subscribed!' };
  } catch (error: any) {
    console.error('Subscription error:', error);
    throw error;
  }
}
