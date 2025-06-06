import React, { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAnnouncements, 
  createAnnouncement, 
  updateAnnouncement, 
  deleteAnnouncement, // Make sure delete is imported if table uses it directly (it does)
  UpdateAnnouncementParams
} from "@/services/featuredContentService"; // Adjust path if needed
import { Announcement } from "@/services/types/featuredContent-types"; // Adjust path if needed
import AnnouncementsTable from "@/components/admin/announcements/AnnouncementsTable";
import AnnouncementForm from "@/components/admin/announcements/AnnouncementForm";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PlusCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog';

const AdminAnnouncements: React.FC = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [announcementToDelete, setAnnouncementToDelete] = useState<Announcement | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query Key for announcements
  const queryKey = ["announcements"];

  const { data: announcements = [], isLoading } = useQuery<Announcement[]>({
    queryKey: queryKey,
    queryFn: getAnnouncements,
  });

  // --- Mutations ---
  const createMutation = useMutation({
    mutationFn: createAnnouncement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: "Success", description: "Announcement created." });
      setIsDialogOpen(false);
      setEditingAnnouncement(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create announcement.", variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateAnnouncement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: "Success", description: "Announcement updated." });
      setIsDialogOpen(false);
      setEditingAnnouncement(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update announcement.", variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAnnouncement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: "Success", description: "Announcement deleted." });
      setShowDeleteConfirm(false);
      setAnnouncementToDelete(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete announcement.", variant: 'destructive' });
    },
    onSettled: () => {
        setIsDeleting(false);
    }
  });

  // --- End Mutations ---

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingAnnouncement(null);
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingAnnouncement(null);
  };

  const handleFormSubmit = (formData: Omit<Announcement, 'id' | 'created_at' | 'updated_at'>) => {
    if (editingAnnouncement) {
      const updatePayload: UpdateAnnouncementParams = { ...formData, id: editingAnnouncement.id };
      updateMutation.mutate(updatePayload);
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDeleteRequest = (announcement: Announcement) => {
      setAnnouncementToDelete(announcement);
      setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
      if (!announcementToDelete) return;
      setIsDeleting(true);
      deleteMutation.mutate(announcementToDelete.id);
  };

  const isMutating = createMutation.isPending || updateMutation.isPending;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-fredoka text-white">Announcements</h1>
            <p className="text-gray-400 mt-1">Manage site-wide announcements.</p>
          </div>
          <Button onClick={handleAddNew} className="bg-lolcow-blue hover:bg-lolcow-blue/90">
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Announcement
          </Button>
        </div>

        {/* Table */}
        <AnnouncementsTable
          announcements={announcements}
          isLoading={isLoading}
          onEdit={handleEdit}
          onDeleteRequest={handleDeleteRequest}
        />

        {/* Add/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
          <DialogContent className="bg-lolcow-darkgray text-white border-lolcow-lightgray max-w-lg"> {/* Wider dialog maybe */}
            <DialogHeader>
              <DialogTitle className="text-xl font-fredoka">
                {editingAnnouncement ? 'Edit Announcement' : 'Add New Announcement'}
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                {editingAnnouncement ? 'Update the details for this announcement.' : 'Fill in the details for the new announcement.'}
              </DialogDescription>
            </DialogHeader>

            <AnnouncementForm 
              initialData={editingAnnouncement}
              onSubmit={handleFormSubmit} 
              isSubmitting={isMutating} 
              onCancel={handleDialogClose} 
            />
          </DialogContent>
        </Dialog>

        {/* Add Confirmation Dialog for Deletion */}
         <ConfirmationDialog
            open={showDeleteConfirm}
            onOpenChange={setShowDeleteConfirm}
            onConfirm={handleConfirmDelete}
            isConfirming={isDeleting}
            title="Confirm Announcement Deletion"
            description={
              <>
                Are you sure you want to delete the announcement:{' '}
                <span className="font-semibold text-white">{announcementToDelete?.title}</span>?
                This action cannot be undone.
              </>
            }
            confirmText="Delete Announcement"
            confirmVariant="destructive"
          />
      </div>
    </AdminLayout>
  );
};

export default AdminAnnouncements; 