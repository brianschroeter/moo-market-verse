
import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import TicketsTable from "@/components/admin/tickets/TicketsTable";
import TicketFilters from "@/components/admin/tickets/TicketFilters";
import TicketPagination from "@/components/admin/tickets/TicketPagination";
import { fetchAdminTickets, updateTicketStatus } from "@/services/ticketAdminService";

export interface Ticket {
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
      const response = await fetchAdminTickets({
        page: currentPage,
        itemsPerPage,
        searchTerm,
        statusFilter
      });
      
      setTickets(response.data);
      setTotalTickets(response.count);
      setTotalPages(Math.ceil(response.count / itemsPerPage));
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

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    try {
      await updateTicketStatus(ticketId, newStatus);

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

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-fredoka text-white mb-2">Support Tickets</h1>
        <p className="text-gray-400">Manage user support tickets and inquiries</p>
      </div>

      <TicketFilters 
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        statusFilter={statusFilter}
        onStatusFilterChange={handleStatusFilterChange}
        totalTickets={totalTickets}
      />
      
      <div className="lolcow-card overflow-hidden mb-6">
        <TicketsTable
          tickets={tickets}
          loading={loading}
          searchTerm={searchTerm}
          statusFilter={statusFilter}
          onStatusChange={handleStatusChange}
        />
      </div>
      
      <TicketPagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
    </AdminLayout>
  );
};

export default AdminTickets;
