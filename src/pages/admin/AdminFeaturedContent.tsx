import React, { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getFeaturedContent, createFeaturedContent, updateFeaturedContent } from "@/services/featuredContentService";
import { FeaturedContent } from "@/services/types/featuredContent-types";
import { CreateFeaturedContentParams, UpdateFeaturedContentParams } from "@/services/featuredContentService";
import FeaturedContentTable from "@/components/admin/featured/FeaturedContentTable";
import FeaturedContentForm from "@/components/admin/featured/FeaturedContentForm";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { PlusCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AdminFeaturedContent: React.FC = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<FeaturedContent | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
      </div>
    </AdminLayout>
  );
};

export default AdminFeaturedContent;
