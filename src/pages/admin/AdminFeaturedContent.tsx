import React, { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getFeaturedContent, createFeaturedContent, updateFeaturedContent, deleteFeaturedContent } from "@/services/featuredContentService";
import { FeaturedContent } from "@/services/types/featuredContent-types";
import { CreateFeaturedContentParams, UpdateFeaturedContentParams } from "@/services/featuredContentService";
import FeaturedContentTable from "@/components/admin/featured/FeaturedContentTable";
import FeaturedContentForm from "@/components/admin/featured/FeaturedContentForm";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { PlusCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog';

const AdminFeaturedContent: React.FC = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<FeaturedContent | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [productToDelete, setProductToDelete] = useState<FeaturedContent | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const queryKey = ["featuredContent"];

  const { data: products = [], isLoading } = useQuery<FeaturedContent[]>({
    queryKey: ["featuredContent"],
    queryFn: getFeaturedContent,
  });

  // --- Mutations ---
  const createMutation = useMutation({
    mutationFn: createFeaturedContent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['featuredContent'] });
      toast({ title: "Success", description: "Featured content added." });
      setIsDialogOpen(false);
      setEditingProduct(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to add content.", variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateFeaturedContent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['featuredContent'] });
      toast({ title: "Success", description: "Featured content updated." });
      setIsDialogOpen(false);
      setEditingProduct(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update content.", variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFeaturedContent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: "Success", description: "Featured content deleted." });
      setShowDeleteConfirm(false);
      setProductToDelete(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete content.", variant: 'destructive' });
    },
    onSettled: () => {
        setIsDeleting(false);
    }
  });

  // --- End Mutations ---

  const handleEdit = (product: FeaturedContent) => {
    setEditingProduct(product);
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingProduct(null);
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingProduct(null);
  };

  const handleFormSubmit = (formData: CreateFeaturedContentParams) => {
    if (editingProduct) {
      updateMutation.mutate({ ...formData, id: editingProduct.id });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDeleteRequest = (product: FeaturedContent) => {
      setProductToDelete(product);
      setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
      if (!productToDelete) return;
      setIsDeleting(true);
      deleteMutation.mutate(productToDelete.id);
  };

  const isMutating = createMutation.isPending || updateMutation.isPending;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-fredoka text-white">Featured Content</h1>
            <p className="text-gray-400 mt-1">Manage featured content displayed on the site.</p>
          </div>
          <Button onClick={handleAddNew} className="bg-lolcow-blue hover:bg-lolcow-blue/90">
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Content
          </Button>
        </div>

        <FeaturedContentTable
          products={products}
          isLoading={isLoading}
          onEdit={handleEdit}
          onDeleteRequest={handleDeleteRequest}
        />

        <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
          <DialogContent className="bg-lolcow-darkgray text-white border-lolcow-lightgray">
            <DialogHeader>
              <DialogTitle className="text-xl font-fredoka">
                {editingProduct ? 'Edit Featured Content' : 'Add New Featured Content'}
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                {editingProduct ? 'Update the details for this content.' : 'Fill in the details for the new content.'}
              </DialogDescription>
            </DialogHeader>

            <FeaturedContentForm
              initialData={editingProduct}
              onSubmit={handleFormSubmit}
              isSubmitting={isMutating}
              onCancel={handleDialogClose}
            />
          </DialogContent>
        </Dialog>

        <ConfirmationDialog
            open={showDeleteConfirm}
            onOpenChange={setShowDeleteConfirm}
            onConfirm={handleConfirmDelete}
            isConfirming={isDeleting}
            title="Confirm Content Deletion"
            description={
              <>
                Are you sure you want to delete the featured content:{' '}
                <span className="font-semibold text-white">{productToDelete?.name}</span>?
                This action cannot be undone.
              </>
            }
            confirmText="Delete Content"
            confirmVariant="destructive"
          />
      </div>
    </AdminLayout>
  );
};

export default AdminFeaturedContent;
