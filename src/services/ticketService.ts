import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Profile } from "@/services/types/auth-types"; // Corrected import path using alias

export interface Ticket {
  id: string;
  subject: string;
  status: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  content: string;
  from_user: boolean;
  created_at: string;
}

export interface TicketAttachment {
  id: string;
  ticket_id: string;
  message_id?: string | null;
  file_name: string;
  file_type: string;
  file_size: number;
  file_path: string;
  created_at: string;
}

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

export async function createTicket(subject: string, message: string, attachments: File[] = []): Promise<string> {
  try {
    // Get the current user
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      throw new Error('User not authenticated');
    }
    
    const userId = session.user.id;

    // Create the ticket
    const { data: ticketData, error: ticketError } = await supabase
      .from('support_tickets')
      .insert({
        subject,
        user_id: userId,
        status: 'open'
      })
      .select()
      .single();

    if (ticketError) {
      throw ticketError;
    }

    // Create the initial message
    const { error: messageError } = await supabase
      .from('ticket_messages')
      .insert({
        ticket_id: ticketData.id,
        content: message,
        from_user: true
      });

    if (messageError) {
      throw messageError;
    }

    // Upload attachments if any
    if (attachments.length > 0) {
      await uploadAttachments(ticketData.id, null, attachments);
    }

    return ticketData.id;
  } catch (error) {
    console.error('Error creating ticket:', error);
    throw error;
  }
}

export async function addReplyToTicket(ticketId: string, message: string, isSupportReply: boolean, attachments: File[] = []): Promise<void> {
  try {
    // Create the reply message
    const { data: messageData, error: messageError } = await supabase
      .from('ticket_messages')
      .insert({
        ticket_id: ticketId,
        content: message,
        from_user: !isSupportReply
      })
      .select()
      .single();

    if (messageError) {
      throw messageError;
    }

    // Determine the correct next status based on who replied
    const nextStatus = isSupportReply ? 'awaiting_user' : 'awaiting_support';

    // Update the ticket status, but only if it's not already closed
    const { error: ticketError } = await supabase
      .from('support_tickets')
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq('id', ticketId)
      .neq('status', 'closed'); // Add condition to not update if closed

    if (ticketError) {
      // It's possible the ticket was closed between loading and replying,
      // but the message insert succeeded. Log this but don't necessarily throw.
      console.warn('Failed to update ticket status (maybe already closed?):', ticketError);
      // Depending on requirements, you might want to throw here or handle differently
    }

    // Upload attachments if any
    if (attachments.length > 0) {
      await uploadAttachments(ticketId, messageData.id, attachments);
    }
  } catch (error) {
    console.error('Error adding reply:', error);
    throw error;
  }
}

// New function to close a ticket
export async function closeTicket(ticketId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('support_tickets')
      .update({ status: 'closed', updated_at: new Date().toISOString() })
      .eq('id', ticketId);

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error closing ticket:', error);
    throw error;
  }
}

async function uploadAttachments(ticketId: string, messageId: string | null, files: File[]): Promise<void> {
  try {
    // Create a unique folder path for this ticket
    const folderPath = `tickets/${ticketId}`;

    for (const file of files) {
      // Upload file to storage
      const fileName = `${Date.now()}-${file.name}`;
      const filePath = `${folderPath}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Create attachment record in the database
      const { error: dbError } = await supabase
        .from('ticket_attachments')
        .insert({
          ticket_id: ticketId,
          message_id: messageId,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          file_path: filePath
        });

      if (dbError) {
        throw dbError;
      }
    }
  } catch (error) {
    console.error('Error uploading attachments:', error);
    throw error;
  }
}
