import React, { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { getTickets } from "@/services/ticketAdminService";
import TicketsTable from "@/components/admin/tickets/TicketsTable";
import TicketFilters from "@/components/admin/tickets/TicketFilters";
import TicketPagination from "@/components/admin/tickets/TicketPagination";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";

// Define the Ticket type
export type Ticket = {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  subject: string;
  description: string;
  status: "open" | "pending" | "closed";
  priority: "low" | "medium" | "high";
};

const AdminTickets: React.FC = () => {
  const [sorting, setSorting] = useState([]);
  const [filtering, setFiltering] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [columnVisibility, setColumnVisibility] = useState({});
  const [rowSelection, setRowSelection] = useState({});

  const { data: tickets, isLoading, error } = useQuery<Ticket[]>("tickets", () =>
    getTickets({ status: statusFilter, priority: priorityFilter })
  );

  const columns: ColumnDef<Ticket>[] = [
    {
      accessorKey: "id",
      header: "ID",
    },
    {
      accessorKey: "created_at",
      header: "Created At",
    },
    {
      accessorKey: "updated_at",
      header: "Updated At",
    },
    {
      accessorKey: "user_id",
      header: "User ID",
    },
    {
      accessorKey: "subject",
      header: "Subject",
    },
    {
      accessorKey: "description",
      header: "Description",
    },
    {
      accessorKey: "status",
      header: "Status",
    },
    {
      accessorKey: "priority",
      header: "Priority",
    },
  ];

  const table = useReactTable({
    data: tickets || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
    },
  });

  const handleStatusFilterChange = (status: string | null) => {
    setStatusFilter(status);
  };

  const handlePriorityFilterChange = (priority: string | null) => {
    setPriorityFilter(priority);
  };

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
              onStatusChange={handleStatusFilterChange}
              onPriorityChange={handlePriorityFilterChange}
            />
            <TicketsTable table={table} />
            <TicketPagination table={table} />
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminTickets;
