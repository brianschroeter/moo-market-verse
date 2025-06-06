import React, { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTickets, updateTicketStatus, Ticket } from "@/services/ticketAdminService";
import TicketsTable from "@/components/admin/tickets/TicketsTable";
import TicketFilters from "@/components/admin/tickets/TicketFilters";
import TicketPagination from "@/components/admin/tickets/TicketPagination";

const AdminTickets: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalTickets, setTotalTickets] = useState(0);
  const itemsPerPage = 10;
  const queryClient = useQueryClient();

  // Fetch tickets with updated query structure
  const { data: tickets, isLoading, error } = useQuery({
    queryKey: ["tickets", statusFilter, currentPage, searchTerm],
    queryFn: () => getTickets({ status: statusFilter !== "all" ? statusFilter : null }),
    refetchInterval: 15000, // Add this line to refetch every 15 seconds
    refetchIntervalInBackground: true, // Add this line to refetch even when tab is in background
  });

  // Mutation for updating ticket status
  const mutation = useMutation({ 
    mutationFn: updateTicketStatus,
    onSuccess: () => {
      // Invalidate and refetch tickets query after successful update
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
    onError: (error) => {
      // TODO: Add proper error handling (e.g., show toast notification)
      console.error("Failed to update ticket status:", error);
    }
  });

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page when search changes
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    mutation.mutate({ ticketId, newStatus });
  };

  // Calculate total pages
  const totalPages = Math.ceil(totalTickets / itemsPerPage);

  // Update total tickets count when tickets data changes
  useEffect(() => {
    if (tickets) {
      setTotalTickets(tickets.length);
    }
  }, [tickets]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-fredoka text-white">Support Tickets</h1>
          <p className="text-gray-400 mt-1">View and manage support tickets from users</p>
        </div>

        <Card className="lolcow-card">
          <CardHeader>
            <CardTitle>All Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <TicketFilters
              searchTerm={searchTerm}
              onSearchChange={handleSearchChange}
              statusFilter={statusFilter}
              onStatusFilterChange={handleStatusFilterChange}
              totalTickets={totalTickets}
            />
            
            {tickets && <TicketsTable 
              tickets={tickets} 
              loading={isLoading} 
              searchTerm={searchTerm}
              statusFilter={statusFilter}
              onStatusChange={handleStatusChange}
            />}
            
            <TicketPagination 
              currentPage={currentPage} 
              totalPages={totalPages} 
              onPageChange={handlePageChange} 
            />
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminTickets;
