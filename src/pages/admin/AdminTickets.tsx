
import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";

interface Ticket {
  id: string;
  subject: string;
  status: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  profile?: {
    discord_username: string;
  };
}

interface ApiResponse {
  data: Ticket[] | null;
  count: number | null;
  error: any;
}

const AdminTickets: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTickets, setTotalTickets] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const itemsPerPage = 10;
  const { toast } = useToast();
  const navigate = useNavigate();
  
  useEffect(() => {
    fetchTickets();
  }, [currentPage, searchTerm, statusFilter]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      // Calculate pagination range
      const from = (currentPage - 1) * itemsPerPage;
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
      const { data, count, error }: ApiResponse = await query
        .order('created_at', { ascending: false })
        .range(from, to);
      
      if (error) {
        throw error;
      }

      setTickets(data || []);
      
      // Update pagination state
      if (count !== null) {
        setTotalTickets(count);
        setTotalPages(Math.ceil(count / itemsPerPage));
      }
    } catch (error) {
      console.error("Error fetching tickets:", error);
      toast({
        title: "Error",
        description: "Failed to load tickets.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open':
        return <Badge className="bg-green-500">Open</Badge>;
      case 'awaiting_support':
        return <Badge className="bg-blue-500">Awaiting Support</Badge>;
      case 'awaiting_user':
        return <Badge className="bg-yellow-500">Awaiting User</Badge>;
      case 'in_progress':
        return <Badge className="bg-yellow-500">In Progress</Badge>;
      case 'closed':
        return <Badge className="bg-gray-500">Closed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', ticketId);

      if (error) {
        throw error;
      }

      // Update the local state
      setTickets(tickets.map(ticket => {
        if (ticket.id === ticketId) {
          return { ...ticket, status: newStatus };
        }
        return ticket;
      }));

      toast({
        title: "Status Updated",
        description: `Ticket status changed to ${newStatus}.`,
      });
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: "Failed to update ticket status.",
        variant: "destructive"
      });
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const renderPagination = () => {
    const pages = [];
    const maxPagesToShow = 5;
    
    // Calculate start and end page numbers for pagination
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = startPage + maxPagesToShow - 1;
    
    if (endPage > totalPages) {
      endPage = totalPages;
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <PaginationItem key={i}>
          <PaginationLink 
            isActive={currentPage === i} 
            onClick={() => handlePageChange(i)}
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }
    
    return (
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious 
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
            />
          </PaginationItem>
          
          {startPage > 1 && (
            <>
              <PaginationItem>
                <PaginationLink onClick={() => handlePageChange(1)}>1</PaginationLink>
              </PaginationItem>
              {startPage > 2 && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}
            </>
          )}
          
          {pages}
          
          {endPage < totalPages && (
            <>
              {endPage < totalPages - 1 && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}
              <PaginationItem>
                <PaginationLink onClick={() => handlePageChange(totalPages)}>
                  {totalPages}
                </PaginationLink>
              </PaginationItem>
            </>
          )}
          
          <PaginationItem>
            <PaginationNext 
              onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
              className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-fredoka text-white mb-2">Support Tickets</h1>
        <p className="text-gray-400">Manage user support tickets and inquiries</p>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search tickets..."
            className="pl-9 bg-lolcow-lightgray text-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="text-gray-400 mr-2">Filter:</div>
          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("all")}
            className={statusFilter === "all" ? "bg-lolcow-blue" : ""}
          >
            All
          </Button>
          <Button
            variant={statusFilter === "open" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("open")}
            className={statusFilter === "open" ? "bg-green-500" : ""}
          >
            Open
          </Button>
          <Button
            variant={statusFilter === "awaiting_support" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("awaiting_support")}
            className={statusFilter === "awaiting_support" ? "bg-blue-500" : ""}
          >
            Awaiting Support
          </Button>
          <Button
            variant={statusFilter === "awaiting_user" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("awaiting_user")}
            className={statusFilter === "awaiting_user" ? "bg-yellow-500" : ""}
          >
            Awaiting User
          </Button>
          <Button
            variant={statusFilter === "closed" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("closed")}
            className={statusFilter === "closed" ? "bg-gray-500 text-white" : ""}
          >
            Closed
          </Button>
        </div>
        
        <div className="text-white whitespace-nowrap">
          Total: {totalTickets}
        </div>
      </div>

      <div className="lolcow-card overflow-hidden mb-6">
        {loading ? (
          <div className="flex justify-center items-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-lolcow-blue" />
            <span className="ml-2 text-white">Loading tickets...</span>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-b border-lolcow-lightgray">
                <TableHead className="text-gray-300">ID</TableHead>
                <TableHead className="text-gray-300">Subject</TableHead>
                <TableHead className="text-gray-300">User</TableHead>
                <TableHead className="text-gray-300">Status</TableHead>
                <TableHead className="text-gray-300">Created</TableHead>
                <TableHead className="text-gray-300">Last Updated</TableHead>
                <TableHead className="text-gray-300 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.length > 0 ? (
                tickets.map((ticket) => (
                  <TableRow
                    key={ticket.id}
                    className="border-b border-lolcow-lightgray hover:bg-lolcow-lightgray/10"
                  >
                    <TableCell className="font-mono text-sm text-gray-400">
                      {ticket.id.split('-')[0]}...
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-white">
                      {ticket.subject}
                    </TableCell>
                    <TableCell className="text-gray-300">
                      {ticket.profile?.discord_username || 'Unknown User'}
                    </TableCell>
                    <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                    <TableCell className="text-gray-300">
                      {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="text-gray-300">
                      {formatDistanceToNow(new Date(ticket.updated_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-lolcow-blue text-lolcow-blue hover:bg-lolcow-blue hover:text-white"
                          onClick={() => navigate(`/tickets/${ticket.id}`)}
                        >
                          View
                        </Button>
                        
                        {ticket.status !== 'closed' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-gray-500 text-gray-300 hover:bg-gray-500 hover:text-white"
                            onClick={() => handleStatusChange(ticket.id, 'closed')}
                          >
                            Close
                          </Button>
                        )}
                        
                        {ticket.status === 'closed' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-green-500 text-green-500 hover:bg-green-500 hover:text-white"
                            onClick={() => handleStatusChange(ticket.id, 'open')}
                          >
                            Reopen
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-gray-400">
                    {searchTerm || statusFilter !== "all"
                      ? "No tickets found matching your criteria."
                      : "No tickets available."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>
      
      {!loading && totalPages > 1 && (
        <div className="flex justify-center mt-6">
          {renderPagination()}
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminTickets;
