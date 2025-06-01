
import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "react-router-dom";
import { FileText, UserCheck } from "lucide-react";
import { Ticket, TicketAttachment } from "@/services/ticket";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { useImpersonationAwareData } from "@/hooks/useImpersonationAwareData";
import { useAuth } from "@/context/AuthContext";

const TicketStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  let bgColor = "bg-gray-500"; // Default/Closed
  let statusText = status.replace('_', ' ').replace(/\\b\\w/g, l => l.toUpperCase());

  switch (status) {
    case "open":
      bgColor = "bg-blue-500";
      break;
    case "awaiting_support":
      bgColor = "bg-yellow-500"; // Yellow for awaiting support
      break;
    case "awaiting_user":
      bgColor = "bg-green-500"; // Green for awaiting user
      break;
    case "closed":
      bgColor = "bg-gray-500"; // Gray for closed
      break;
  }
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${bgColor}`}>
      {statusText}
    </span>
  );
};

const TicketList: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [attachments, setAttachments] = useState<{[key: string]: TicketAttachment[]}>({});
  const { toast } = useToast();
  const { isAdmin, startImpersonation, isImpersonating } = useAuth();
  const { getUserTickets } = useImpersonationAwareData();

  useEffect(() => {
    const loadTickets = async () => {
      try {
        setLoading(true);
        const userTickets = await getUserTickets();
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
  }, [getUserTickets, toast]);

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM d, yyyy");
    } catch (error) {
      return "Invalid date";
    }
  };

  const handleImpersonateTicketCreator = async (ticket: Ticket) => {
    if (!isAdmin) return;
    await startImpersonation(ticket.user_id);
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
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          {isAdmin && <Skeleton className="h-8 w-24 bg-lolcow-lightgray/30" />}
                          <Skeleton className="h-8 w-16 bg-lolcow-lightgray/30" />
                        </div>
                      </TableCell>
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
                            <div className="flex justify-end space-x-2">
                              {isAdmin && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-green-500 text-green-500 hover:bg-green-500 hover:text-white"
                                  onClick={() => handleImpersonateTicketCreator(ticket)}
                                  title="View as ticket creator"
                                >
                                  <UserCheck className="h-4 w-4 mr-1" />
                                  View as User
                                </Button>
                              )}
                              <Link to={`/tickets/${ticket.id}`}>
                                <Button variant="ghost" size="sm" className="text-lolcow-blue">
                                  View
                                </Button>
                              </Link>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-gray-400">
                          {isImpersonating ? "This user hasn't created any tickets yet." : "You haven't created any tickets yet."}
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
