
import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "react-router-dom";
import { FileText } from "lucide-react";
import { fetchUserTickets, Ticket, TicketAttachment } from "@/services/ticketService";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

const TicketStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  let bgColor = "bg-gray-500";
  
  if (status === "open") bgColor = "bg-blue-500";
  else if (status === "replied") bgColor = "bg-green-500";
  else if (status === "closed") bgColor = "bg-gray-500";
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${bgColor}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

const TicketList: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [attachments, setAttachments] = useState<{[key: string]: TicketAttachment[]}>({});
  const { toast } = useToast();

  useEffect(() => {
    const loadTickets = async () => {
      try {
        setLoading(true);
        const userTickets = await fetchUserTickets();
        setTickets(userTickets);
      } catch (error) {
        console.error("Error fetching tickets:", error);
        toast({
          title: "Error",
          description: "Failed to load your support tickets. Please try again.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadTickets();
  }, [toast]);

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM d, yyyy");
    } catch (error) {
      return "Invalid date";
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow py-12 px-4 sm:px-6 lg:px-8 bg-lolcow-black">
        <div className="max-w-5xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-fredoka text-white">My Support Tickets</h1>
            <Link to="/support">
              <Button className="btn-primary">
                Create New Ticket
              </Button>
            </Link>
          </div>
          
          {/* Tickets Table */}
          <div className="lolcow-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-lolcow-lightgray">
                  <TableHead className="text-gray-300">Ticket</TableHead>
                  <TableHead className="text-gray-300">Status</TableHead>
                  <TableHead className="text-gray-300">Last Update</TableHead>
                  <TableHead className="text-gray-300 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array(3).fill(0).map((_, index) => (
                    <TableRow key={`loading-${index}`} className="border-b border-lolcow-lightgray">
                      <TableCell className="py-4">
                        <div className="flex items-start">
                          <div className="ml-3 w-full">
                            <Skeleton className="h-5 w-3/4 bg-lolcow-lightgray/50 mb-2" />
                            <Skeleton className="h-4 w-1/2 bg-lolcow-lightgray/30" />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><Skeleton className="h-5 w-16 rounded-full bg-lolcow-lightgray/50" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24 bg-lolcow-lightgray/30" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto bg-lolcow-lightgray/30" /></TableCell>
                    </TableRow>
                  ))
                ) : (
                  <>
                    {tickets.length > 0 ? (
                      tickets.map((ticket) => (
                        <TableRow 
                          key={ticket.id}
                          className="border-b border-lolcow-lightgray hover:bg-lolcow-lightgray/10"
                        >
                          <TableCell className="py-4">
                            <div className="flex items-start">
                              <div className="ml-3">
                                <div className="font-medium text-white">{ticket.subject}</div>
                                <div className="text-sm text-gray-400">
                                  ID: {ticket.id.substring(0, 8)}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <TicketStatusBadge status={ticket.status} />
                          </TableCell>
                          <TableCell className="text-gray-300">
                            {formatDate(ticket.updated_at)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Link to={`/tickets/${ticket.id}`}>
                              <Button variant="ghost" size="sm" className="text-lolcow-blue">
                                View
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-gray-400">
                          You haven't created any tickets yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TicketList;
