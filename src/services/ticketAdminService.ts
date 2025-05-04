
import { supabase } from "@/integrations/supabase/client";
import { Ticket } from "@/pages/admin/AdminTickets";

export interface FetchTicketsOptions {
  page?: number;
  itemsPerPage?: number;
  searchTerm?: string;
  status?: string | null;
  priority?: string | null;
}

export interface TicketsResponse {
  data: Ticket[];
  count: number;
}

export const getTickets = async (options: FetchTicketsOptions = {}): Promise<Ticket[]> => {
  const { status, priority } = options;
  
  let query = supabase
    .from('support_tickets')
    .select(`
      *,
      profiles:profiles(discord_username)
    `);
  
  if (status) {
    query = query.eq('status', status);
  }
  
  // Add priority filter if implemented in your schema
  if (priority) {
    query = query.eq('priority', priority);
  }
  
  const { data, error } = await query
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error("Error fetching tickets:", error);
    throw error;
  }

  return data || [];
};

export const fetchAdminTickets = async (options: FetchTicketsOptions): Promise<TicketsResponse> => {
  const { page = 1, itemsPerPage = 10, searchTerm, status } = options;
  
  // Calculate pagination range
  const from = (page - 1) * itemsPerPage;
  const to = from + itemsPerPage - 1;
  
  // Build query
  let query = supabase
    .from('support_tickets')
    .select(`
      *,
      profiles:profiles(discord_username)
    `, { count: 'exact' });
  
  // Add search filter if provided
  if (searchTerm) {
    query = query.ilike('subject', `%${searchTerm}%`);
  }

  // Add status filter if not "all"
  if (status && status !== "all") {
    query = query.eq('status', status);
  }
  
  // Complete the query with ordering and pagination
  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(from, to);
  
  if (error) {
    console.error("Error fetching tickets:", error);
    throw error;
  }

  return {
    data: data || [],
    count: count || 0
  };
};

export const updateTicketStatus = async (ticketId: string, newStatus: string): Promise<void> => {
  const { error } = await supabase
    .from('support_tickets')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', ticketId);

  if (error) {
    console.error("Error updating status:", error);
    throw error;
  }
};
