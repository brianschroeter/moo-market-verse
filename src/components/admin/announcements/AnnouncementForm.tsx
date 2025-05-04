import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Announcement } from "@/services/types/featuredContent-types"; // Adjust path if needed
import { Loader2 } from "lucide-react";

// Type for form submission payload (matches createAnnouncement service function input)
type AnnouncementFormData = Omit<Announcement, 'id' | 'created_at' | 'updated_at'>;

interface AnnouncementFormProps {
  initialData?: Announcement | null; 
  onSubmit: (data: AnnouncementFormData) => void;
  isSubmitting: boolean;
  onCancel: () => void;
}

const AnnouncementForm: React.FC<AnnouncementFormProps> = ({ 
  initialData, 
  onSubmit, 
  isSubmitting, 
  onCancel 
}) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [active, setActive] = useState(true);
  const [isImportant, setIsImportant] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setContent(initialData.content);
      setActive(initialData.active);
      setIsImportant(initialData.is_important);
    } else {
      // Reset form for adding new
      setTitle("");
      setContent("");
      setActive(true); // Default to active
      setIsImportant(false);
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !content) {
      toast({
        title: "Error",
        description: "Please fill in Title and Content fields",
        variant: "destructive",
      });
      return;
    }

    onSubmit({
      title,
      content,
      active,
      is_important: isImportant,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-4">
      {/* Title */}
      <div className="grid w-full items-center gap-1.5">
        <Label htmlFor="title" className="text-gray-300">Title</Label>
        <Input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Announcement Title"
          className="bg-lolcow-lightgray/30 text-white border-lolcow-lightgray focus:ring-lolcow-blue"
          required
        />
      </div>
      
      {/* Content */}
      <div className="grid w-full items-center gap-1.5">
        <Label htmlFor="content" className="text-gray-300">Content</Label>
        <Textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Announcement Content (Markdown supported)"
          className="bg-lolcow-lightgray/30 text-white border-lolcow-lightgray focus:ring-lolcow-blue min-h-[150px]" // Give it more height
          required
        />
         <p className="text-xs text-gray-400 pt-1">Markdown is supported for formatting.</p>
      </div>

      {/* Checkboxes */}
      <div className="flex items-center space-x-6 pt-2">
         {/* Active Checkbox */}
         <div className="flex items-center space-x-2">
            <Checkbox 
              id="active"
              checked={active}
              onCheckedChange={(checked) => setActive(Boolean(checked))}
              className="border-gray-500 data-[state=checked]:bg-lolcow-blue data-[state=checked]:border-lolcow-blue"
            />
            <Label 
              htmlFor="active" 
              className="text-sm font-medium leading-none text-gray-300"
            >
              Active
            </Label>
          </div>
           {/* Important Checkbox */}
           <div className="flex items-center space-x-2">
            <Checkbox 
              id="isImportant"
              checked={isImportant}
              onCheckedChange={(checked) => setIsImportant(Boolean(checked))}
               className="border-gray-500 data-[state=checked]:bg-yellow-500 data-[state=checked]:border-yellow-500"
            />
            <Label 
              htmlFor="isImportant" 
              className="text-sm font-medium leading-none text-gray-300"
            >
              Important
            </Label>
          </div>
      </div>

      {/* Form Actions (Submit/Cancel) */}
      <div className="flex justify-end space-x-3 pt-4">
          <Button 
             type="button" 
             variant="outline" 
             onClick={onCancel}
             disabled={isSubmitting}
           > 
             Cancel
           </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="bg-lolcow-blue hover:bg-lolcow-blue/90"
          >
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isSubmitting ? (initialData ? 'Updating...' : 'Adding...') : (initialData ? 'Update Announcement' : 'Add Announcement')}
          </Button>
      </div>
    </form>
  );
};

export default AnnouncementForm; 