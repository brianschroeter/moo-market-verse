import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Helper function to get user ID from JWT (can be shared or duplicated)
async function getUserIdFromAuth(req: Request, supabaseClient: SupabaseClient): Promise<string | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    console.warn('No Authorization header present for delete operation');
    return null;
  }
  try {
    const { data: { user }, error } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''));
    if (error) {
      console.error('Error getting user from JWT for delete:', error);
      return null;
    }
    return user?.id || null;
  } catch (e) {
    console.error('Exception in getUserIdFromAuth for delete:', e);
    return null;
  }
}

// Placeholder admin check (can be shared or duplicated)
async function checkIsAdmin(userIdForLogging: string, userAuthedSupaClient: SupabaseClient): Promise<boolean> {
  // userIdForLogging is just for console logging, as the RPC uses auth.uid()
  try {
    // IMPORTANT: Call using the client authenticated with the user's JWT
    const { data, error } = await userAuthedSupaClient.rpc('is_admin');

    if (error) {
      console.error(`Error calling is_admin RPC for user context (logged as ${userIdForLogging}) in delete-ticket-response:`, error);
      return false;
    }
    
    console.log(`is_admin check for user context (logged as ${userIdForLogging}) in delete-ticket-response:`, data);
    return data === true;

  } catch (rpcError) {
    console.error(`Exception calling is_admin RPC for user context (logged as ${userIdForLogging}) in delete-ticket-response:`, rpcError);
    return false;
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { response_id } = await req.json()

    if (!response_id) {
      return new Response(JSON.stringify({ error: 'response_id is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // First, get the token from the header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header is missing.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401,
      });
    }
    const jwt = authHeader.replace('Bearer ', '');

    // Initialize client with the user's auth header
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '', // Anon key is still needed for createClient
      { global: { headers: { Authorization: `Bearer ${jwt}` } } } // Set user's auth for this instance
    );

    // Now try to get the user to confirm the JWT is valid with this client setup
    const { data: { user: authUser }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !authUser) {
      console.error('Failed to get user with new client setup or user is null in delete-ticket-response:', authError);
      return new Response(JSON.stringify({ error: 'Authentication failed or user not found with provided token.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }
    const callingUserId = authUser.id;
    console.log("Successfully got user ID with new client setup in delete-ticket-response:", callingUserId);

    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: 'Service role key is not configured for delete.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
      });
    }
    const supabaseAdminClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', SERVICE_ROLE_KEY);

    // 1. Fetch the ticket message
    const { data: message, error: messageError } = await supabaseAdminClient
      .from('ticket_messages')
      .select('id, ticket_id, from_user') // Only need these for auth and to find attachments
      .eq('id', response_id)
      .single();

    if (messageError || !message) {
      console.error('Error fetching ticket message for delete:', messageError);
      return new Response(JSON.stringify({ error: 'Ticket message not found or error fetching it for delete.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    // 2. Fetch the parent ticket to get its author (user_id)
    const { data: ticket, error: ticketError } = await supabaseAdminClient
      .from('support_tickets')
      .select('id, user_id')
      .eq('id', message.ticket_id)
      .single();

    if (ticketError || !ticket) {
      console.error('Error fetching parent ticket for delete:', ticketError);
      return new Response(JSON.stringify({ error: 'Parent ticket not found or error fetching it for delete.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    // 3. Authorization Check
    let authorized = false;
    if (message.from_user) { // Message is from a regular user
      if (callingUserId === ticket.user_id) {
        authorized = true;
      }
    } else { // Message is from support/admin
      // Use supabaseClient (user-authed) for is_admin() because it relies on auth.uid()
      const isAdmin = await checkIsAdmin(callingUserId, supabaseClient);
      if (isAdmin) {
        authorized = true;
      }
    }

    if (!authorized) {
      return new Response(JSON.stringify({ error: 'You are not authorized to delete this response.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    // 4. Delete associated attachments first (if any)
    // Assuming 'ticket_attachments' table has 'message_id' column
    const { error: attachmentError } = await supabaseAdminClient
      .from('ticket_attachments')
      .delete()
      .eq('message_id', response_id);

    if (attachmentError) {
      console.error('Error deleting attachments for message:', attachmentError);
      // Decide if this is a critical error. For now, we'll log it and proceed with message deletion.
      // You might want to return 500 if attachments are critical.
    }

    // 5. Delete the message
    const { error: deleteError } = await supabaseAdminClient
      .from('ticket_messages')
      .delete()
      .eq('id', response_id);

    if (deleteError) {
      console.error('Error deleting ticket message:', deleteError);
      return new Response(JSON.stringify({ error: 'Failed to delete ticket message.', details: deleteError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    return new Response(JSON.stringify({ message: 'Response deleted successfully' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200, // Or 204 No Content if you prefer for DELETE operations
    });

  } catch (error) {
    console.error('General error in delete-ticket-response function:', error);
    return new Response(JSON.stringify({ error: error.message || 'An unexpected error occurred during delete.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
}) 