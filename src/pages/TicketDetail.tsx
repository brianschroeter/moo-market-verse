import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Link, useParams } from "react-router-dom";
import { FileUp, List } from "lucide-react";
import { Ticket, TicketMessage, TicketAttachment, fetchTicketById, addReplyToTicket } from "@/services/ticketService";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Profile } from "@/services/types/auth-types";
import { useAuth } from "@/context/AuthContext";

const TicketDetail: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const { toast } = useToast();
  const { user } = useAuth();
  const [ticketData, setTicketData] = useState<{
    ticket: Ticket;
    messages: TicketMessage[];
    attachments: TicketAttachment[];
    userProfile: Profile | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = React.useState("");
  const [files, setFiles] = React.useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadTicket = async () => {
      if (!ticketId) {
        setError("Ticket ID is missing.");
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        const fetchedData = await fetchTicketById(ticketId);
        if (!fetchedData || !fetchedData.ticket) {
            throw new Error("Ticket not found.");
        }
        setTicketData(fetchedData);
      } catch (err) {
        console.error("Error fetching ticket details:", err);
        const errorMessage = err instanceof Error ? err.message : "Failed to load ticket details.";
        setError(errorMessage);
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadTicket();
  }, [ticketId, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketId || !reply.trim()) return;
    if (!user) {
      toast({ title: "Error", description: "You must be logged in to reply.", variant: "destructive" });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await addReplyToTicket(ticketId, reply, files);
      
      const newMessage: TicketMessage = {
          id: `temp-${Date.now()}`,
          ticket_id: ticketId,
          content: reply,
          from_user: true,
          created_at: new Date().toISOString(),
      };

      setTicketData(prevData => {
        if (!prevData) return null;
        const updatedMessages = [...prevData.messages, newMessage];
        return { 
          ...prevData, 
          messages: updatedMessages,
          ticket: { ...prevData.ticket, status: 'replied', updated_at: new Date().toISOString() } 
        };
      });

      setReply("");
      setFiles([]);
      
      toast({
        title: "Success",
        description: "Your reply has been sent.",
        variant: "default",
      });
      
    } catch (err) {
      console.error("Error submitting reply:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to send reply.";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };
  
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  const removeFile = (index: number) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    setFiles(newFiles);
  };
  
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow py-12 px-4 sm:px-6 lg:px-8 bg-lolcow-black">
          <div className="max-w-4xl mx-auto">
            <Skeleton className="h-8 w-3/4 mb-6 bg-lolcow-lightgray/50" />
            <Skeleton className="h-6 w-1/4 mb-8 bg-lolcow-lightgray/30" />
            <div className="space-y-6">
              <Skeleton className="h-32 w-full lolcow-card bg-lolcow-lightgray/30" />
              <Skeleton className="h-32 w-full lolcow-card bg-lolcow-lightgray/30" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow py-12 px-4 sm:px-6 lg:px-8 bg-lolcow-black flex items-center justify-center">
          <div className="text-center lolcow-card">
            <h2 className="text-xl font-semibold text-red-500 mb-4">Error Loading Ticket</h2>
            <p className="text-gray-400 mb-6">{error}</p>
            <Link to="/tickets">
              <Button variant="outline">Back to Tickets</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
  
  if (!ticketData || !ticketData.ticket) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow py-12 px-4 sm:px-6 lg:px-8 bg-lolcow-black flex items-center justify-center">
          <div className="text-center lolcow-card">
            <h2 className="text-xl font-semibold text-white mb-4">Ticket Not Found</h2>
            <p className="text-gray-400 mb-6">The requested ticket could not be found.</p>
            <Link to="/tickets">
              <Button variant="outline">Back to Tickets</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const { ticket, messages, userProfile } = ticketData;
  const userAvatar = userProfile?.discord_id && userProfile?.discord_avatar 
    ? `https://cdn.discordapp.com/avatars/${userProfile.discord_id}/${userProfile.discord_avatar}.png`
    : "https://via.placeholder.com/40";

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow py-12 px-4 sm:px-6 lg:px-8 bg-lolcow-black">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
            <div>
              <div className="flex items-center space-x-2">
                <Link to="/tickets" className="text-lolcow-blue hover:underline">
                  <List className="h-4 w-4 inline mr-1" />
                  All Tickets
                </Link>
                <span className="text-gray-500">/</span>
                <h1 className="text-2xl font-fredoka text-white">{ticket.subject}</h1>
              </div>
              <p className="text-gray-400 mt-1">ID: {ticket.id}</p>
            </div>
            <div className="mt-2 sm:mt-0">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                ticket.status === "open" ? "bg-blue-500" : 
                ticket.status === "replied" ? "bg-green-500" : "bg-gray-500"
              }`}>
                {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
              </span>
            </div>
          </div>

          <div className="space-y-6 mb-8">
            {messages.map((message) => (
              <div 
                key={message.id} 
                className={`lolcow-card ${
                  !message.from_user ? "border-l-4 border-l-lolcow-blue" : ""
                }`}
              >
                <div className="flex items-start space-x-4">
                  <img 
                    src={message.from_user ? userAvatar : "https://via.placeholder.com/40"} 
                    alt={message.from_user ? (userProfile?.discord_username || "User") : "Support Team"} 
                    className="w-10 h-10 rounded-full"
                  />
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <h3 className="font-medium text-white">
                        {message.from_user ? (userProfile?.discord_username || "User") : "Support Team"}
                        {!message.from_user && (
                          <span className="ml-2 bg-lolcow-blue text-xs px-2 py-0.5 rounded text-white">
                            Staff
                          </span>
                        )}
                      </h3>
                      <span className="text-gray-400 text-sm">{format(new Date(message.created_at), "PPpp")}</span>
                    </div>
                    <div className="mt-2 text-gray-300 whitespace-pre-wrap">
                      {message.content}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {ticket.status !== "closed" && (
            <div className="lolcow-card">
              <h3 className="text-xl font-fredoka text-white mb-4">Add Reply</h3>
              <form onSubmit={handleSubmit}>
                <div>
                  <Textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Type your reply here..."
                    className="min-h-[120px] bg-lolcow-lightgray text-white border-lolcow-lightgray focus:ring-lolcow-blue resize-none"
                    required
                  />
                </div>
                
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    multiple
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border border-lolcow-blue text-lolcow-blue hover:bg-lolcow-blue hover:text-white"
                    onClick={triggerFileInput}
                  >
                    <FileUp className="w-4 h-4 mr-2" />
                    Attach Files
                  </Button>
                  <span className="text-gray-400 text-sm">
                    {files.length > 0 ? `${files.length} file(s) selected` : 'No files selected'}
                  </span>
                </div>
                
                {files.length > 0 && (
                  <div className="mt-3">
                    <ul className="space-y-2">
                      {files.map((file, index) => (
                        <li key={index} className="flex items-center justify-between bg-lolcow-darkgray p-2 rounded-md">
                          <div className="flex items-center space-x-2 truncate">
                            <span className="text-gray-300 truncate">{file.name}</span>
                            <span className="text-gray-400 text-xs">({formatFileSize(file.size)})</span>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => removeFile(index)}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <i className="fa-solid fa-times"></i>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div className="mt-6 flex justify-end">
                  <Button
                    type="submit"
                    className="bg-lolcow-blue hover:bg-lolcow-blue/80"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Sending..." : "Send Reply"}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TicketDetail;
