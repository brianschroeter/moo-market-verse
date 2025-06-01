
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
    
    console.log('Raw messages from database:', messages);
    console.log('Messages error:', messagesError);
    
    // Debug: Check the actual schema of ticket_messages table
    const { data: schemaInfo } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'ticket_messages')
      .eq('table_schema', 'public');
    console.log('ticket_messages table schema:', schemaInfo);

    if (messagesError) {
      throw messagesError;
    }

    // Fetch profiles for all message authors (excluding null user_ids)
    const authorUserIds = [...new Set((messages || []).map(msg => msg.user_id).filter(id => id !== null))];
    console.log('Author user IDs to fetch:', authorUserIds);
    let authorProfiles: Profile[] = [];
    if (authorUserIds.length > 0) {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', authorUserIds);
      
      console.log('Fetched profiles:', profilesData);
      console.log('Profiles error:', profilesError);
      
      if (profilesError) {
        console.error('Error fetching author profiles:', profilesError);
      } else {
        authorProfiles = profilesData || [];
      }
    }

    // Map profiles to messages
    const messagesWithProfiles = (messages || []).map(message => ({
      ...message,
      profiles: authorProfiles.find(profile => profile.id === message.user_id) || null
    }));
    
    console.log('Final messages with profiles:', messagesWithProfiles);

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
      messages: messagesWithProfiles,
      attachments: attachments || [],
      userProfile
    };
  } catch (error) {
    console.error('Error fetching ticket details:', error);
    throw error;
  }
}
