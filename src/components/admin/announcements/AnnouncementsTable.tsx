import React from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteAnnouncement } from "@/services/featuredContentService"; // Adjust path if needed
import { Announcement } from "@/services/types/featuredContent-types"; // Adjust path if needed
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash, Edit, Megaphone, AlertTriangle } from "lucide-react"; // Added icons
import { Badge } from "@/components/ui/badge"; // Import Badge

interface AnnouncementsTableProps {
  announcements: Announcement[];
  isLoading: boolean;
  onEdit: (announcement: Announcement) => void;
  onDeleteRequest: (announcement: Announcement) => void;
}

const AnnouncementsTable: React.FC<AnnouncementsTableProps> = ({ announcements, isLoading, onEdit, onDeleteRequest }) => {
  const { toast } = useToast();

  const handleDelete = (announcement: Announcement) => {
    onDeleteRequest(announcement);
  };

  return (
    <div className="lolcow-card overflow-hidden">
      {isLoading ? (
        <div className="flex justify-center items-center p-12">
          <p className="text-gray-300">Loading announcements...</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="border-b border-lolcow-lightgray">
              <TableHead className="text-gray-300">Title</TableHead>
              <TableHead className="text-gray-300">Status</TableHead>
              <TableHead className="text-gray-300">Created</TableHead>
              <TableHead className="text-right text-gray-300">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {announcements.length > 0 ? (
              announcements.map((announcement: Announcement) => (
                <TableRow key={announcement.id} className="border-b border-lolcow-lightgray hover:bg-lolcow-lightgray/10">
                  {/* Title */}
                  <TableCell className="font-medium text-white">
                      {announcement.title}
                      {/* Maybe show excerpt of content on hover or below? For now, just title */} 
                  </TableCell>
                  
                  {/* Status Badges */}
                  <TableCell>
                     <div className="flex items-center space-x-2">
                         {announcement.active ? (
                            <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-white"> 
                               <Megaphone className="h-3 w-3 mr-1"/> Active
                            </Badge>
                         ) : (
                            <Badge variant="secondary">Inactive</Badge>
                         )}
                         {announcement.is_important && (
                            <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600 text-black"> 
                              <AlertTriangle className="h-3 w-3 mr-1"/> Important
                            </Badge>
                         )}
                     </div>
                  </TableCell>

                  {/* Created At */}
                   <TableCell className="text-gray-400 text-sm">
                      {new Date(announcement.created_at).toLocaleDateString()}
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      {/* Edit Button */}
                      <Button
                         variant="outline" 
                         size="sm"
                         className="border-lolcow-blue text-lolcow-blue hover:bg-lolcow-blue hover:text-white"
                         onClick={() => onEdit(announcement)}
                       >
                         <Edit className="h-4 w-4" />
                       </Button>
                      {/* Delete Button */}
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(announcement)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
                 <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-gray-400">
                      No announcements found.
                    </TableCell>
                  </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default AnnouncementsTable; 