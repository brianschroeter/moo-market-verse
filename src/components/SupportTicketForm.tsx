
import React, { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUp } from "lucide-react";
import { createTicket } from "@/services/ticket";
import { useNavigate } from "react-router-dom";

interface FileInfo {
  name: string;
  size: number;
  type: string;
  data?: File;
}

const SupportTicketForm: React.FC = () => {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!subject.trim() || !message.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide both a subject and message for your ticket.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Submit the ticket using the ticketService
      const ticketId = await createTicket(subject, message, files);
      
      toast({
        title: "Ticket Submitted",
        description: `We'll get back to you as soon as possible. ${files.length ? `${files.length} file(s) attached.` : ''}`,
      });
      
      // Clear the form
      setSubject("");
      setMessage("");
      setFiles([]);
      
      // Navigate to the ticket detail page
      navigate(`/tickets/${ticketId}`);
    } catch (error) {
      console.error("Error submitting ticket:", error);
      toast({
        title: "Error Submitting Ticket",
        description: "There was an error submitting your ticket. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles([...files, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    setFiles(newFiles);
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  return (
    <Card className="lolcow-card w-full">
      <CardHeader>
        <CardTitle className="text-xl font-fredoka text-white">Submit a Support Ticket</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="subject" className="block text-gray-300 mb-1">Subject</label>
              <input
                id="subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-lolcow-lightgray text-white border border-lolcow-lightgray focus:outline-none focus:ring-2 focus:ring-lolcow-blue"
                placeholder="Brief description of your issue"
                required
              />
            </div>
            
            <div>
              <label htmlFor="message" className="block text-gray-300 mb-1">Message</label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full min-h-[150px] px-4 py-2 rounded-lg bg-lolcow-lightgray text-white border border-lolcow-lightgray focus:outline-none focus:ring-2 focus:ring-lolcow-blue"
                placeholder="Describe your issue in detail. Please include any relevant information that might help us assist you."
                required
              />
            </div>
            
            {/* File Upload Section */}
            <div>
              <label className="block text-gray-300 mb-1">Attachments</label>
              <div className="flex items-center">
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
                  className="border border-lolcow-blue text-lolcow-blue hover:bg-lolcow-blue hover:text-white"
                  onClick={triggerFileInput}
                >
                  <FileUp className="w-4 h-4 mr-2" />
                  Upload Files
                </Button>
                <span className="ml-3 text-gray-400 text-sm">
                  {files.length > 0 ? `${files.length} file(s) selected` : 'No files selected'}
                </span>
              </div>
              
              {/* File List */}
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
            </div>
          </div>
          
          <Button 
            type="submit" 
            className="mt-6 bg-lolcow-blue hover:bg-lolcow-blue/80 text-white font-medium w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Submitting..." : "Submit Ticket"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default SupportTicketForm;
