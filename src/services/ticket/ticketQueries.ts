
import { supabase } from "@/integrations/supabase/client";
import { Ticket, TicketMessage, TicketAttachment, Profile } from "./ticketTypes";

export async function fetchUserTickets(): Promise<Ticket[]> {
  try {
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching tickets:', error);
    throw error;
  }
}

export async function fetchTicketById(ticketId: string): Promise<{
  ticket: Ticket | null;
  messages: TicketMessage[];
  attachments: TicketAttachment[];
  userProfile: Profile | null;
}> {
  try {
    // Fetch the ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('id', ticketId)
      .single();

    if (ticketError) {
      throw ticketError;
    }

    // Fetch messages for the ticket
    const { data: messages, error: messagesError } = await supabase
      .from('ticket_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (messagesError) {
      throw messagesError;
    }

    // Fetch attachments for the ticket
    const { data: attachments, error: attachmentsError } = await supabase
      .from('ticket_attachments')
      .select('*')
      .eq('ticket_id', ticketId);

    if (attachmentsError) {
      throw attachmentsError;
    }

    // Fetch the user profile if ticket exists
    let userProfile: Profile | null = null;
    if (ticket?.user_id) {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', ticket.user_id)
        .single();

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        // Don't throw error, just proceed without profile
      } else {
        userProfile = profileData;
      }
    }

    return {
      ticket,
      messages: messages || [],
      attachments: attachments || [],
      userProfile
    };
  } catch (error) {
    console.error('Error fetching ticket details:', error);
    throw error;
  }
}
