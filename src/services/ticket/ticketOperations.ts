
import { supabase } from "@/integrations/supabase/client";
import { uploadAttachments } from "./ticketAttachments";

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

// Function to close a ticket
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
