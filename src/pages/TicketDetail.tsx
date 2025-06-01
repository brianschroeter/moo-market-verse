import React, { useEffect, useState, useMemo, useRef } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Link, useParams, useNavigate } from "react-router-dom";
import { FileUp, List, User, Edit3, Trash2, MessageSquare, Loader2, UserCheck } from "lucide-react";
import { 
  Ticket, 
  TicketMessage, 
  TicketAttachment, 
  fetchTicketById, 
  addReplyToTicket, 
  closeTicket 
} from "@/services/ticket";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Profile } from "@/services/ticket";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ConfirmationDialog } from "@/components/common/ConfirmationDialog";

// Helper to get public URL for Supabase Storage
const getAttachmentUrl = (filePath: string): string => {
  const { data } = supabase.storage.from('attachments').getPublicUrl(filePath);
  return data?.publicUrl || '#'; // Return '#' as fallback
};

const TicketDetail: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const { toast } = useToast();
  const { user, isAdmin, profile: currentUserProfile, startImpersonation } = useAuth();
  const navigate = useNavigate();
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
  const [isClosing, setIsClosing] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Added State for Edit/Delete
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMessage, setEditingMessage] = useState<TicketMessage | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [isUpdatingResponse, setIsUpdatingResponse] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [isDeletingResponse, setIsDeletingResponse] = useState(false);

  // Pre-process attachments to map them to message IDs
  const attachmentsByMessageId = useMemo(() => {
    const map = new Map<string | null, TicketAttachment[]>();

    // Guard against null/undefined ticketData or missing messages/attachments
    if (!ticketData || !ticketData.messages || ticketData.messages.length === 0 || !ticketData.attachments) {
      // Handle cases where data isn't fully loaded yet
      // We can still process attachments that might belong to the initial ticket (message_id: null)
      (ticketData?.attachments || []).forEach(att => {
        if (att.message_id === null) {
            if (!map.has(null)) map.set(null, []);
             // Temporarily map null-message_id attachments to null key if initial message isn't loaded yet
            map.get(null)?.push(att); 
        }
      });
      return map; // Return map (might be empty or contain only initial attachments)
    }

    // Data is loaded, proceed with full mapping
    const messages = ticketData.messages;
    const attachments = ticketData.attachments;
    
    // Assuming the first message in the sorted list is the initial one
    const initialMessageId = messages[0].id; 

    // Add attachments associated with the initial message (previously mapped to null)
    const initialAttachments = map.get(null) || [];
    if (initialAttachments.length > 0) {
        map.set(initialMessageId, initialAttachments);
        map.delete(null); // Clear the temporary null entry
    }

    attachments.forEach(att => {
      const key = att.message_id === null ? initialMessageId : att.message_id;
      
      // Skip attachments already processed (initial ones)
      if (att.message_id === null && map.has(initialMessageId)) {
        // Already handled above
      } else {
          if (!map.has(key)) {
            map.set(key, []);
          }
          map.get(key)?.push(att);
      }
    });

    console.log('Processed Attachments Map:', map); // Log the created map
    return map;
  // Depend on the entire ticketData object
  }, [ticketData]);

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
        console.log('Fetched Ticket Data:', fetchedData);
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
    
    // Determine if this is a support reply (admin sending)
    const isSupportReply = isAdmin === true;

    try {
      // This still handles the actual backend operations
      await addReplyToTicket(ticketId, reply, isSupportReply, files);
      
      // --- Optimistic UI Update --- 
      const tempMessageId = `temp-message-${Date.now()}`;
      const newMessage: TicketMessage = {
          id: tempMessageId, // Use temporary ID
          ticket_id: ticketId,
          content: reply,
          from_user: !isSupportReply, 
          created_at: new Date().toISOString(), // Use current time
          user_id: user.id,
          author_profile: currentUserProfile,
      };
      
      let newAttachments: TicketAttachment[] = [];
      if (files.length > 0) {
          newAttachments = files.map((file, index) => ({
              id: `temp-attach-${Date.now()}-${index}`, // Temporary attachment ID
              ticket_id: ticketId,
              message_id: tempMessageId, // Link to temporary message ID
              file_name: file.name,
              file_type: file.type,
              file_size: file.size,
              file_path: '', // Placeholder - real path comes on refresh
              created_at: new Date().toISOString(), // Placeholder
          }));
      }
      
      setTicketData(prevData => {
        if (!prevData) return null;
        const nextStatus = isSupportReply ? 'awaiting_user' : 'awaiting_support';
        const updatedMessages = [...prevData.messages, newMessage];
        // Add new temporary attachments to the existing attachments array
        const updatedAttachments = [...prevData.attachments, ...newAttachments]; 
        
        return { 
          ...prevData, 
          messages: updatedMessages,
          attachments: updatedAttachments, // Update attachments state
          ticket: { 
            ...prevData.ticket, 
            status: prevData.ticket.status === 'closed' ? 'closed' : nextStatus, 
            updated_at: new Date().toISOString() 
          } 
        };
      });
      // --- End Optimistic UI Update ---

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
  
  const handleCloseTicket = async () => {
    if (!ticketId) return;
    setIsClosing(true);
    try {
      await closeTicket(ticketId);
      setTicketData(prevData => {
        if (!prevData) return null;
        return { ...prevData, ticket: { ...prevData.ticket, status: 'closed', updated_at: new Date().toISOString() } };
      });
      toast({ title: "Success", description: "Ticket closed." });
    } catch (err) {
      console.error("Error closing ticket:", err);
      toast({ title: "Error", description: "Failed to close ticket.", variant: "destructive" });
    } finally {
      setIsClosing(false);
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
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatStatusText = (status: string): string => {
    switch (status) {
      case 'open': return 'Open';
      case 'awaiting_support': return 'Awaiting Support Reply';
      case 'awaiting_user': return 'Awaiting Your Reply';
      case 'in_progress': return 'In Progress';
      case 'closed': return 'Closed';
      default: return status;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'open':
        // Use default variant with custom green background/text for success
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30">Open</Badge>;
      case 'awaiting_support':
        // Use secondary variant for info-like status
        return <Badge variant="secondary">Awaiting Support</Badge>;
      case 'awaiting_user':
        // Use default variant with custom yellow background/text for warning
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/30">Awaiting User</Badge>;
      case 'in_progress':
        return <Badge variant="secondary">In Progress</Badge>;
      case 'closed':
        return <Badge variant="destructive">Closed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Added Edit/Delete Handlers
  const handleOpenEditModal = (message: TicketMessage) => {
    setEditingMessage(message);
    setEditedContent(message.content);
    setShowEditModal(true);
  };

  const handleUpdateResponse = async () => {
    if (!editingMessage || !editedContent.trim()) return;
    setIsUpdatingResponse(true);
    try {
      const { data, error: functionError } = await supabase.functions.invoke(
        'update-ticket-response',
        { body: { response_id: editingMessage.id, content: editedContent.trim() } }
      );

      if (functionError) throw new Error(functionError.message || "Failed to invoke update function.");
      if (data && data.error) throw new Error(data.error.details || data.error.message || "Update function returned an error.");

      // Optimistic update
      setTicketData(prev => {
        if (!prev) return null;
        return {
          ...prev,
          messages: prev.messages.map(msg => 
            msg.id === editingMessage.id ? { ...msg, content: editedContent.trim(), updated_at: new Date().toISOString() } : msg
          ),
          ticket: { ...prev.ticket, updated_at: new Date().toISOString() } // Also update ticket's updated_at
        };
      });
      toast({ title: "Success", description: "Response updated." });
      setShowEditModal(false);
      setEditingMessage(null);
    } catch (err) {
      console.error("Error updating response:", err);
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to update response.", variant: "destructive" });
    } finally {
      setIsUpdatingResponse(false);
    }
  };

  const handleOpenDeleteConfirm = (messageId: string) => {
    setDeletingMessageId(messageId);
    setShowDeleteConfirm(true);
  };

  const handleDeleteResponse = async () => {
    if (!deletingMessageId) return;
    setIsDeletingResponse(true);
    try {
      const { data, error: functionError } = await supabase.functions.invoke(
        'delete-ticket-response',
        { body: { response_id: deletingMessageId } }
      );
      if (functionError) throw new Error(functionError.message || "Failed to invoke delete function.");
      if (data && data.error) throw new Error(data.error.details || data.error.message || "Delete function returned an error.");

      // Optimistic update
      setTicketData(prev => {
        if (!prev) return null;
        return {
          ...prev,
          messages: prev.messages.filter(msg => msg.id !== deletingMessageId),
          // Optionally remove associated attachments from local state if you manage them separately and want immediate UI update
          // attachments: prev.attachments.filter(att => att.message_id !== deletingMessageId),
          ticket: { ...prev.ticket, updated_at: new Date().toISOString() }
        };
      });
      toast({ title: "Success", description: "Response deleted." });
      setShowDeleteConfirm(false);
      setDeletingMessageId(null);
    } catch (err) {
      console.error("Error deleting response:", err);
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to delete response.", variant: "destructive" });
    } finally {
      setIsDeletingResponse(false);
    }
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

  // Destructure after the checks and hook calls
  const { ticket, messages, userProfile } = ticketData; 

  // Avatar URL for the ticket creator
  const ticketCreatorAvatar = userProfile?.discord_id && userProfile?.discord_avatar 
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
                <Link to={isAdmin ? "/admin/tickets" : "/tickets"} className="text-lolcow-blue hover:underline">
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
                ticket.status === 'open' ? 'bg-blue-500' : 
                ticket.status === 'awaiting_support' ? 'bg-yellow-500' :
                ticket.status === 'awaiting_user' ? 'bg-green-500' :
                ticket.status === 'closed' ? 'bg-gray-500' : 'bg-gray-500'
              }`}>
                {formatStatusText(ticket.status)}
              </span>
            </div>
          </div>

          {/* Ticket Header */}
          <div className="mb-6 p-6 lolcow-card rounded-lg">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
              <h1 className="text-2xl sm:text-3xl font-fredoka text-white mb-2 sm:mb-0 truncate mr-4">
                {ticket.subject}
              </h1>
              {getStatusBadge(ticket.status)}
            </div>
            <div className="flex flex-wrap text-sm text-gray-400 gap-x-4 gap-y-1">
              <span>Ticket ID: <span className="font-mono">{ticket.id}</span></span>
              <span>Created: {format(new Date(ticket.created_at), 'PPP p')}</span>
              <span>Last Update: {format(new Date(ticket.updated_at), 'PPP p')}</span>
              {userProfile && (
                 <span>
                   User: {userProfile.discord_username || userProfile.id}
                   {isAdmin && <span className="font-mono text-xs ml-1">({userProfile.id})</span>}
                 </span>
              )}
            </div>
          </div>

          {/* Admin User Info Box */}
          {isAdmin && userProfile && (
            <div className="mb-6 p-4 lolcow-card rounded-lg border border-lolcow-blue/30">
               <h2 className="text-lg font-semibold text-lolcow-yellow mb-3 flex items-center">
                 <User className="w-5 h-5 mr-2"/> User Information
               </h2>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                 <div>
                   <span className="text-gray-400">Discord Name: </span>
                   <span className="text-white">{userProfile.discord_username || 'N/A'}</span>
                 </div>
                 <div>
                   <span className="text-gray-400">Discord ID: </span>
                   <span className="text-white font-mono">{userProfile.discord_id || 'N/A'}</span>
                 </div>
                 <div>
                   <span className="text-gray-400">User Profile ID: </span>
                   <span className="text-white font-mono">{userProfile.id}</span>
                 </div>
                 <div className="md:col-span-2 mt-2 flex flex-wrap gap-4">
                   <Button
                     variant="link"
                     className="p-0 h-auto text-lolcow-blue hover:text-lolcow-yellow"
                     onClick={() => navigate(`/admin/users?userId=${userProfile?.id}`)}
                   >
                     View Full Profile (Connections, Guilds, etc.)
                   </Button>
                   <Button
                     variant="outline"
                     size="sm"
                     className="border-green-500 text-green-500 hover:bg-green-500 hover:text-white"
                     onClick={() => startImpersonation(userProfile.id)}
                   >
                     <UserCheck className="h-4 w-4 mr-1" />
                     View as this User
                   </Button>
                 </div>
               </div>
            </div>
          )}

          <div className="space-y-6 mb-8">
            {messages.map((message, index) => {
              // Handle different cases for avatar and name
              let displayAvatar: string;
              let displayName: string;
              const isFromTicketCreator = message.from_user;
              
              if (isFromTicketCreator) {
                // This is a user message - use the ticket creator's profile
                if (userProfile) {
                  displayAvatar = userProfile.discord_id && userProfile.discord_avatar 
                    ? `https://cdn.discordapp.com/avatars/${userProfile.discord_id}/${userProfile.discord_avatar}.png`
                    : "http://localhost:8080/lovable-uploads/logo.png";
                  displayName = userProfile.discord_username || "User";
                } else {
                  // Fallback if no user profile
                  displayAvatar = "http://localhost:8080/lovable-uploads/logo.png";
                  displayName = "User";
                }
              } else {
                // This is a support message - use the message author's profile
                const supportProfile = message.author_profile;
                if (message.user_id && supportProfile) {
                  // Support staff with profile
                  displayAvatar = supportProfile.discord_id && supportProfile.discord_avatar 
                    ? `https://cdn.discordapp.com/avatars/${supportProfile.discord_id}/${supportProfile.discord_avatar}.png`
                    : "http://localhost:8080/lovable-uploads/logo.png";
                  displayName = supportProfile.discord_username || `Support ${message.user_id.slice(0, 8)}`;
                } else if (message.user_id && !supportProfile) {
                  // Support staff with ID but no profile
                  displayAvatar = "http://localhost:8080/lovable-uploads/logo.png";
                  displayName = `Support ${message.user_id.slice(0, 8)}`;
                } else {
                  // Legacy support message without user_id
                  displayAvatar = "http://localhost:8080/lovable-uploads/logo.png";
                  displayName = "Support Team";
                }
              }
              
              // Get attachments for this message from the pre-processed map
              const messageAttachments = attachmentsByMessageId.get(message.id) || [];

              return (
                <div 
                  key={message.id} 
                  className={`lolcow-card group ${!isFromTicketCreator ? "border-l-4 border-l-lolcow-blue" : ""}`}
                >
                  <div className="flex items-start space-x-4">
                    <img 
                      src={displayAvatar}
                      alt={displayName} 
                      className={
                        displayAvatar === "http://localhost:8080/lovable-uploads/logo.png" 
                          ? "h-[60px] w-auto rounded-lg" 
                          : "w-10 h-10 rounded-full"
                      }
                    />
                    <div className="flex-1 relative">
                      <div className="flex justify-between items-center">
                        <h3 className="font-medium text-white">
                          {displayName}
                          {!isFromTicketCreator && (
                            <span className="ml-2 bg-lolcow-blue text-xs px-2 py-0.5 rounded text-white">
                              Staff
                            </span>
                          )}
                        </h3>
                        <div className="flex items-center space-x-2">
                          {user && ticketData && (
                            (() => {
                              const isUserMessage = message.from_user;
                              const isTicketOwner = user.id === ticketData.ticket.user_id;
                              let canEditOrDelete = false;

                              if (isUserMessage && isTicketOwner) {
                                canEditOrDelete = true;
                              } else if (!isUserMessage && isAdmin) {
                                canEditOrDelete = true;
                              }

                              if (canEditOrDelete) {
                                return (
                                  <>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-6 w-6 text-blue-400 hover:text-blue-500 hover:bg-lolcow-lightgray/20 focus-visible:ring-0 focus-visible:ring-offset-0" 
                                      onClick={() => handleOpenEditModal(message)} 
                                      title="Edit Response"
                                    >
                                      <Edit3 size={14} />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-6 w-6 text-red-400 hover:text-red-500 hover:bg-lolcow-lightgray/20 focus-visible:ring-0 focus-visible:ring-offset-0" 
                                      onClick={() => handleOpenDeleteConfirm(message.id)} 
                                      title="Delete Response"
                                    >
                                      <Trash2 size={14} />
                                    </Button>
                                  </>
                                );
                              }
                              return null;
                            })()
                          )}
                          <span className="text-gray-400 text-sm">{format(new Date(message.created_at), "PPpp")}</span>
                        </div>
                      </div>
                      <div className="mt-2 text-gray-300 whitespace-pre-wrap">
                        {message.content}
                      </div>
                      
                      {/* Render attachments for this message */}
                      {messageAttachments.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-lolcow-lightgray/30">
                          <h4 className="text-sm font-medium text-gray-400 mb-2">Attachments:</h4>
                          <ul className="space-y-2">
                            {messageAttachments.map(att => (
                              <li key={att.id} className="flex items-center space-x-2">
                                <i className="fa-solid fa-paperclip text-gray-400"></i>
                                <a 
                                  href={getAttachmentUrl(att.file_path)} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-lolcow-blue hover:underline text-sm truncate"
                                  download={att.file_name} // Suggest original filename for download
                                >
                                  {att.file_name}
                                </a>
                                <span className="text-gray-500 text-xs">({formatFileSize(att.file_size)})</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {ticket.status !== 'closed' && (
            <div className="lolcow-card mt-8">
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
                    disabled={isSubmitting || !reply.trim()}
                  >
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquare className="mr-2 h-4 w-4" />} Submit Reply
                  </Button>
                </div>
              </form>
            </div>
          )}

          {ticket.status !== 'closed' && (
            <div className="mt-6 flex justify-end">
              <Button
                variant="destructive"
                onClick={handleCloseTicket}
                disabled={isClosing}
              >
                {isClosing ? "Closing..." : "Close Ticket"}
              </Button>
            </div>
          )}
        </div>
      </main>
      <Footer />

      {/* Added Modals/Dialogs */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-[425px] bg-lolcow-darkgray text-white border-lolcow-lightgray">
          <DialogHeader>
            <DialogTitle>Edit Response</DialogTitle>
            <DialogDescription>
              Make changes to your response. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 items-center gap-4">
              <Label htmlFor="edit-content" className="sr-only">
                Response
              </Label>
              <Textarea
                id="edit-content"
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="min-h-[100px] bg-lolcow-lightgray text-white border-lolcow-lightgray focus:ring-lolcow-blue"
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)} disabled={isUpdatingResponse}>Cancel</Button>
            <Button onClick={handleUpdateResponse} disabled={isUpdatingResponse || !editedContent.trim() || editedContent.trim() === editingMessage?.content.trim() } className="bg-lolcow-blue hover:bg-lolcow-blue/90">
              {isUpdatingResponse && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={handleDeleteResponse}
        isConfirming={isDeletingResponse}
        title="Confirm Delete Response"
        description="Are you sure you want to delete this response? This action cannot be undone."
        confirmText="Delete"
        confirmVariant="destructive"
      />
    </div>
  );
};

export default TicketDetail;
