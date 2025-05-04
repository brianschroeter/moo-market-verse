
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
  priority?: string;
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
    return data.map(ticket => ({
      id: ticket.id,
      subject: ticket.subject,
      status: ticket.status as "open" | "awaiting_support" | "awaiting_user" | "closed",
      created_at: ticket.created_at,
      updated_at: ticket.updated_at,
      user_id: ticket.user_id,
      profile: {
        discord_username: ticket.profiles.discord_username
      },
      description: "",  // Default value
      priority: "medium"  // Default value
    })) || [];
    
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
    return data.map(ticket => ({
      id: ticket.id,
      subject: ticket.subject,
      status: ticket.status as "open" | "awaiting_support" | "awaiting_user" | "closed",
      created_at: ticket.created_at,
      updated_at: ticket.updated_at,
      user_id: ticket.user_id,
      profile: {
        discord_username: ticket.profiles.discord_username
      },
      description: "",  // Default value
      priority: "medium"  // Default value
    })) || [];
    
  } catch (error) {
    console.error("Error in getTickets:", error);
    throw error;
  }
};
