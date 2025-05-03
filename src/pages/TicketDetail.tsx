
import React from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Link, useParams } from "react-router-dom";
import { FileUp, List } from "lucide-react";

// Mock ticket data
const mockTicketDetails = {
  id: "ticket-001",
  subject: "YouTube Connection Issue",
  status: "open",
  created: "May 2, 2025 09:15 AM",
  lastUpdated: "May 2, 2025 02:30 PM",
  messages: [
    {
      id: "msg1",
      from: "user",
      userName: "CowFan123",
      userAvatar: "https://cdn.discordapp.com/avatars/123456789/abcdef.png",
      content: "I'm having trouble connecting my YouTube account. I've tried multiple times but it keeps failing with an error message saying 'Connection failed'.",
      timestamp: "May 2, 2025 09:15 AM",
      attachments: [
        { name: "error_screenshot.png", size: 1456000, type: "image/png" }
      ]
    },
    {
      id: "msg2",
      from: "admin",
      userName: "Support Team",
      userAvatar: "https://via.placeholder.com/40",
      content: "Hi there, thanks for reaching out. Could you please let us know which browser you're using and if you've tried clearing your cache?",
      timestamp: "May 2, 2025 11:30 AM",
      attachments: []
    },
    {
      id: "msg3",
      from: "user",
      userName: "CowFan123",
      userAvatar: "https://cdn.discordapp.com/avatars/123456789/abcdef.png",
      content: "I'm using Chrome and yes, I've tried clearing my cache. I've also tried on Firefox with the same result.",
      timestamp: "May 2, 2025 02:30 PM",
      attachments: []
    }
  ]
};

const TicketDetail: React.FC = () => {
  const { ticketId } = useParams();
  const [reply, setReply] = React.useState("");
  const [files, setFiles] = React.useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // In a real app, we would fetch ticket details using the ticketId
  const ticketDetails = mockTicketDetails;
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      setReply("");
      setFiles([]);
      setIsSubmitting(false);
      // In a real app, we would update the ticket details here
    }, 1000);
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
                <h1 className="text-2xl font-fredoka text-white">{ticketDetails.subject}</h1>
              </div>
              <p className="text-gray-400 mt-1">ID: {ticketDetails.id}</p>
            </div>
            <div className="mt-2 sm:mt-0">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                ticketDetails.status === "open" ? "bg-blue-500" : 
                ticketDetails.status === "replied" ? "bg-green-500" : "bg-gray-500"
              }`}>
                {ticketDetails.status.charAt(0).toUpperCase() + ticketDetails.status.slice(1)}
              </span>
            </div>
          </div>

          {/* Ticket Messages */}
          <div className="space-y-6 mb-8">
            {ticketDetails.messages.map((message) => (
              <div 
                key={message.id} 
                className={`lolcow-card ${
                  message.from === "admin" ? "border-l-4 border-l-lolcow-blue" : ""
                }`}
              >
                <div className="flex items-start space-x-4">
                  <img 
                    src={message.userAvatar} 
                    alt={message.userName} 
                    className="w-10 h-10 rounded-full"
                  />
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <h3 className="font-medium text-white">
                        {message.userName}
                        {message.from === "admin" && (
                          <span className="ml-2 bg-lolcow-blue text-xs px-2 py-0.5 rounded text-white">
                            Staff
                          </span>
                        )}
                      </h3>
                      <span className="text-gray-400 text-sm">{message.timestamp}</span>
                    </div>
                    <div className="mt-2 text-gray-300 whitespace-pre-wrap">
                      {message.content}
                    </div>
                    
                    {/* Attachments */}
                    {message.attachments.length > 0 && (
                      <div className="mt-3">
                        <h4 className="text-sm font-medium text-gray-400">Attachments:</h4>
                        <ul className="mt-1 space-y-1">
                          {message.attachments.map((attachment, index) => (
                            <li key={index} className="flex items-center space-x-2">
                              <FileUp className="h-4 w-4 text-gray-400" />
                              <a 
                                href="#" 
                                className="text-lolcow-blue hover:underline text-sm"
                              >
                                {attachment.name} ({formatFileSize(attachment.size)})
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Reply Form */}
          {ticketDetails.status !== "closed" && (
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
                
                {/* File Upload */}
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
                
                {/* Selected Files */}
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
