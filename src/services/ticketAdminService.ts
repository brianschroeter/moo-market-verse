import { supabase } from "@/integrations/supabase/client";

export interface Ticket {
  id: string;
  subject: string;
  status: "open" | "awaiting_support" | "awaiting_user" | "closed";
  created_at: string;
  updated_at: string;
  user_id: string;
  profile?: {
    discord_username: string;
  };
  description?: string;
  priority?: "low" | "medium" | "high";
}

export interface TicketFilter {
  status?: string;
  priority?: string;
}

export const getTicketsWithProfile = async (filter?: TicketFilter): Promise<Ticket[]> => {
  try {
    let query = supabase
      .from('support_tickets')
      .select(`
        *,
        profiles:profiles!inner(discord_username)
      `)
      .order('created_at', { ascending: false });
    
    if (filter?.status) {
      query = query.eq('status', filter.status);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error("Error fetching tickets with profile:", error);
      throw error;
    }
    
    // Transform the data to match the expected Ticket interface
    return data.map(ticket => {
      // Using type assertion to handle ticket properties
      const ticketData = ticket as any;
      
      return {
        id: ticketData.id,
        subject: ticketData.subject,
        status: ticketData.status as "open" | "awaiting_support" | "awaiting_user" | "closed",
        created_at: ticketData.created_at,
        updated_at: ticketData.updated_at,
        user_id: ticketData.user_id,
        profile: {
          discord_username: ticketData.profiles.discord_username
        },
        description: ticketData.description || "",
        priority: (ticketData.priority as "low" | "medium" | "high") || "medium"
      };
    }) || [];
    
  } catch (error) {
    console.error("Error in getTicketsWithProfile:", error);
    throw error;
  }
};

export const getTickets = async (filter?: TicketFilter): Promise<Ticket[]> => {
  try {
    let query = supabase
      .from('support_tickets')
      .select(`
        *,
        profiles:profiles!inner(discord_username)
      `)
      .order('created_at', { ascending: false });
    
    if (filter?.status) {
      query = query.eq('status', filter.status);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error("Error fetching tickets:", error);
      throw error;
    }
    
    // Transform the data to match the expected Ticket interface
    return data.map(ticket => {
      // Using type assertion to handle ticket properties
      const ticketData = ticket as any;
      
      return {
        id: ticketData.id,
        subject: ticketData.subject,
        status: ticketData.status as "open" | "awaiting_support" | "awaiting_user" | "closed",
        created_at: ticketData.created_at,
        updated_at: ticketData.updated_at,
        user_id: ticketData.user_id,
        profile: {
          discord_username: ticketData.profiles.discord_username
        },
        description: ticketData.description || "",
        priority: (ticketData.priority as "low" | "medium" | "high") || "medium"
      };
    }) || [];
    
  } catch (error) {
    console.error("Error in getTickets:", error);
    throw error;
  }
};

export const updateTicketStatus = async ({ ticketId, newStatus }: { ticketId: string, newStatus: string }): Promise<void> => {
  try {
    const { error } = await supabase
      .from('support_tickets')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', ticketId);

    if (error) {
      console.error("Error updating ticket status:", error);
      throw error;
    }
  } catch (error) {
    console.error("Error in updateTicketStatus:", error);
    throw error;
  }
};
