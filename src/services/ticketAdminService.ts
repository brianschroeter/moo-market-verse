
import { supabase } from "@/integrations/supabase/client";
import { Ticket } from "@/pages/admin/AdminTickets";

export interface FetchTicketsOptions {
  page: number;
  itemsPerPage: number;
  searchTerm?: string;
  statusFilter?: string;
}

export interface TicketsResponse {
  data: Ticket[];
  count: number;
}

export const fetchAdminTickets = async (options: FetchTicketsOptions): Promise<TicketsResponse> => {
  const { page, itemsPerPage, searchTerm, statusFilter } = options;
  
  // Calculate pagination range
  const from = (page - 1) * itemsPerPage;
  const to = from + itemsPerPage - 1;
  
  // Build query
  let query = supabase
    .from('support_tickets')
    .select(`
      *,
      profile:profiles(discord_username)
    `, { count: 'exact' });
  
  // Add search filter if provided
  if (searchTerm) {
    query = query.ilike('subject', `%${searchTerm}%`);
  }

  // Add status filter if not "all"
  if (statusFilter !== "all") {
    query = query.eq('status', statusFilter);
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
