import { createClient } from '@supabase/supabase-js';
import { NextApiRequest, NextApiResponse } from 'next';

// Initialize Supabase client - Replace with your actual client initialization
// It's recommended to use environment variables for URL and anon key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL or Anon Key is missing in environment variables.');
}

// IMPORTANT: Use the Service Role Key for server-side operations like inserts
// if your RLS policies don't allow anonymous inserts.
// Ensure this key is stored securely and NOT exposed client-side.
const supabaseServerClient = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey);

// Basic email validation regex (adjust as needed for stricter validation)
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  const { email } = req.body;

  if (!email || typeof email !== 'string' || !emailRegex.test(email)) {
    return res.status(400).json({ message: 'Invalid email address provided.' });
  }

  try {
    // Use the server client (potentially with service role) for insertion
    const { data, error } = await supabaseServerClient
      .from('newsletter_signups')
      .insert([{ email }])
      .select(); // Use select() if you want the inserted data back

    if (error) {
      // Handle potential errors, e.g., duplicate email violation (error code 23505)
      if (error.code === '23505') {
        return res.status(409).json({ message: 'This email is already subscribed.' });
      }
      console.error('Supabase error:', error);
      throw new Error('Failed to subscribe email.');
    }

    // Successfully inserted
    return res.status(201).json({ message: 'Successfully subscribed!' }); // 201 Created

  } catch (error: any) {
    console.error('Subscription error:', error);
    return res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
} 