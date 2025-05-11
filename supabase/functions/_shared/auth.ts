import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@^2"; // Changed from esm.sh
import { corsHeaders } from './cors.ts'; // Assuming cors.ts is in the same _shared directory
import type { Database } from '../../../src/integrations/supabase/database.types.ts'; // Adjust path as needed

export interface AuthResult {
  userClient: SupabaseClient<Database> | null;
  adminClient: SupabaseClient<Database> | null;
  user: any | null; // Replace 'any' with a more specific User type if available
  errorResponse: Response | null;
  isAdmin: boolean;
}

/**
 * Initializes Supabase clients (user-context and admin-service-role)
 * and checks if the authenticated user is an admin.
 *
 * @param req The incoming Deno.Request object.
 * @returns Promise<AuthResult>
 */
export async function ensureAdmin(req: Request): Promise<AuthResult> {
  const result: AuthResult = {
    userClient: null,
    adminClient: null,
    user: null,
    errorResponse: null,
    isAdmin: false,
  };

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    console.error('Missing Supabase environment variables.');
    result.errorResponse = new Response(
      JSON.stringify({ error: 'Server configuration error: Missing Supabase environment variables.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    return result;
  }

  // Create Supabase client with the service role key for admin actions
  result.adminClient = createClient<Database>(supabaseUrl, supabaseServiceRoleKey);

  // Ensure Authorization header is present for user context
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    console.warn('Authorization header missing');
    result.errorResponse = new Response(
      JSON.stringify({ error: 'Authorization header missing' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    return result;
  }

  // Create a regular Supabase client to verify the caller's role using the request's Authorization header
  result.userClient = createClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    { global: { headers: { Authorization: authHeader } } }
  );

  // Get the calling user
  const { data: { user }, error: userError } = await result.userClient.auth.getUser();

  if (userError || !user) {
    console.error('Auth error:', userError?.message || 'User not found');
    result.errorResponse = new Response(
      JSON.stringify({ error: 'Authentication failed' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    return result;
  }
  result.user = user;
  console.log(`Request received from user: ${user.id}`);

  // Check if the calling user has the 'admin' role using the 'is_admin' RPC
  // This RPC is assumed to exist in your database and relies on auth.uid() implicitly.
  console.log(`Checking admin role for user: ${user.id} using is_admin RPC.`);
  const { data: isAdmin, error: roleError } = await result.userClient.rpc('is_admin');

  if (roleError) {
    console.error(`Role check error for user ${user.id}:`, roleError.message);
    result.errorResponse = new Response(
      JSON.stringify({ error: 'Failed to verify user role', details: roleError.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    return result;
  }

  if (isAdmin !== true) { // Explicitly check for true
    console.warn(`Forbidden: User ${user.id} is not an admin.`);
    result.errorResponse = new Response(
      JSON.stringify({ error: 'Forbidden: User is not an admin' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    return result;
  }

  console.log(`Admin role confirmed for user: ${user.id}`);
  result.isAdmin = true;
  return result;
} 