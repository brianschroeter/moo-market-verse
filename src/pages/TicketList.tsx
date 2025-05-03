
import React from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "react-router-dom";
import { FileText, List } from "lucide-react";

// Mock ticket data
const mockTickets = [
  {
    id: "ticket-001",
    subject: "YouTube Connection Issue",
    status: "open",
    lastUpdated: "May 2, 2025",
    hasAttachments: true,
    unreadMessages: 2
  },
  {
    id: "ticket-002",
    subject: "Discord Access Problem",
    status: "replied",
    lastUpdated: "May 1, 2025",
    hasAttachments: false,
    unreadMessages: 1
  },
  {
    id: "ticket-003",
    subject: "How do I connect my YouTube account?",
    status: "closed",
    lastUpdated: "Apr 28, 2025",
    hasAttachments: false,
    unreadMessages: 0
  }
];

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
                {mockTickets.map((ticket) => (
                  <TableRow 
                    key={ticket.id}
                    className="border-b border-lolcow-lightgray hover:bg-lolcow-lightgray/10"
                  >
                    <TableCell className="py-4">
                      <div className="flex items-start">
                        <div className="ml-3">
                          <div className="font-medium text-white">{ticket.subject}</div>
                          <div className="text-sm text-gray-400">
                            ID: {ticket.id}
                            {ticket.hasAttachments && (
                              <span className="ml-2 inline-flex">
                                <FileText className="h-4 w-4 text-gray-400" />
                              </span>
                            )}
                            {ticket.unreadMessages > 0 && (
                              <span className="ml-2 bg-lolcow-red text-white text-xs px-2 py-0.5 rounded-full">
                                {ticket.unreadMessages} new
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <TicketStatusBadge status={ticket.status} />
                    </TableCell>
                    <TableCell className="text-gray-300">{ticket.lastUpdated}</TableCell>
                    <TableCell className="text-right">
                      <Link to={`/tickets/${ticket.id}`}>
                        <Button variant="ghost" size="sm" className="text-lolcow-blue">
                          View
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
                {mockTickets.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-gray-400">
                      You haven't created any tickets yet.
                    </TableCell>
                  </TableRow>
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
