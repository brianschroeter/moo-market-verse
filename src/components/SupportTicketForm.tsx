
import React, { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const SupportTicketForm: React.FC = () => {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // This would be replaced with actual API call to submit ticket
    setTimeout(() => {
      toast({
        title: "Ticket Submitted",
        description: "We'll get back to you as soon as possible.",
      });
      setSubject("");
      setMessage("");
      setIsSubmitting(false);
    }, 1000);
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
          </div>
          
          <Button 
            type="submit" 
            className="mt-4 bg-lolcow-blue hover:bg-lolcow-blue/80 text-white font-medium w-full"
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
