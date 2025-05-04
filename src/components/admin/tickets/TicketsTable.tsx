
import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Ticket } from "@/pages/admin/AdminTickets";

interface TicketsTableProps {
  tickets: Ticket[];
  loading: boolean;
  searchTerm: string;
  statusFilter: string;
  onStatusChange: (ticketId: string, newStatus: string) => Promise<void>;
}

const TicketsTable: React.FC<TicketsTableProps> = ({ 
  tickets, 
  loading, 
  searchTerm, 
  statusFilter,
  onStatusChange 
}) => {
  const navigate = useNavigate();

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

  if (loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-lolcow-blue" />
        <span className="ml-2 text-white">Loading tickets...</span>
      </div>
    );
  }

  return (
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
                {ticket.profiles?.discord_username || 'Unknown User'}
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
                      onClick={() => onStatusChange(ticket.id, 'closed')}
                    >
                      Close
                    </Button>
                  )}
                  
                  {ticket.status === 'closed' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-green-500 text-green-500 hover:bg-green-500 hover:text-white"
                      onClick={() => onStatusChange(ticket.id, 'open')}
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
  );
};

export default TicketsTable;
