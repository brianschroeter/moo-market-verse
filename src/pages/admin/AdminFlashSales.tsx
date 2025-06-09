import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  getAllFlashSales, 
  createFlashSale, 
  updateFlashSale, 
  deleteFlashSale, 
  toggleFlashSaleStatus,
  FlashSale,
  CreateFlashSaleParams 
} from "@/services/flashSalesService";
import { Zap, Plus, Edit, Trash2, Calendar, Clock, Palette } from "lucide-react";
import { toast } from "sonner";

const AdminFlashSales: React.FC = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFlashSale, setEditingFlashSale] = useState<FlashSale | null>(null);
  const [formData, setFormData] = useState<CreateFlashSaleParams>({
    title: "",
    description: "",
    discount_text: "",
    priority: 1,
    banner_color: "#ef4444",
    text_color: "#ffffff",
    action_url: "",
    action_text: "Shop Now"
  });

  const queryClient = useQueryClient();

  const { data: flashSales = [], isLoading } = useQuery({
    queryKey: ["admin-flash-sales"],
    queryFn: getAllFlashSales,
    staleTime: 5 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: createFlashSale,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-flash-sales"] });
      queryClient.invalidateQueries({ queryKey: ["flash-sales"] });
      toast.success("Flash sale created successfully!");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Error creating flash sale: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateFlashSaleParams> }) =>
      updateFlashSale(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-flash-sales"] });
      queryClient.invalidateQueries({ queryKey: ["flash-sales"] });
      toast.success("Flash sale updated successfully!");
      setIsDialogOpen(false);
      setEditingFlashSale(null);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Error updating flash sale: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFlashSale,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-flash-sales"] });
      queryClient.invalidateQueries({ queryKey: ["flash-sales"] });
      toast.success("Flash sale deleted successfully!");
    },
    onError: (error) => {
      toast.error(`Error deleting flash sale: ${error.message}`);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      toggleFlashSaleStatus(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-flash-sales"] });
      queryClient.invalidateQueries({ queryKey: ["flash-sales"] });
      toast.success("Flash sale status updated!");
    },
    onError: (error) => {
      toast.error(`Error updating status: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      discount_text: "",
      priority: 1,
      banner_color: "#ef4444",
      text_color: "#ffffff",
      action_url: "",
      action_text: "Shop Now"
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingFlashSale) {
      updateMutation.mutate({ id: editingFlashSale.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (flashSale: FlashSale) => {
    setEditingFlashSale(flashSale);
    setFormData({
      title: flashSale.title,
      description: flashSale.description || "",
      discount_text: flashSale.discount_text || "",
      priority: flashSale.priority,
      banner_color: flashSale.banner_color,
      text_color: flashSale.text_color,
      action_url: flashSale.action_url || "",
      action_text: flashSale.action_text
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this flash sale?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleToggleStatus = (id: number, currentStatus: boolean) => {
    toggleMutation.mutate({ id, isActive: !currentStatus });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const isActive = (flashSale: FlashSale) => {
    return flashSale.is_active;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-fredoka text-white flex items-center gap-3">
              <Zap className="h-8 w-8 text-lolcow-red" />
              Flash Sales Management
            </h1>
            <p className="text-gray-300 mt-2">
              Create and manage special announcements and flash sales for the shop
            </p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  setEditingFlashSale(null);
                  resetForm();
                }}
                className="bg-lolcow-blue hover:bg-lolcow-blue/80"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Flash Sale
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-lolcow-darkgray border-lolcow-lightgray">
              <DialogHeader>
                <DialogTitle className="text-white">
                  {editingFlashSale ? "Edit Flash Sale" : "Create Flash Sale"}
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="title" className="text-white">Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      className="bg-lolcow-lightgray border-lolcow-lightgray text-white"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="discount_text" className="text-white">Discount Text</Label>
                    <Input
                      id="discount_text"
                      value={formData.discount_text}
                      onChange={(e) => setFormData(prev => ({ ...prev, discount_text: e.target.value }))}
                      className="bg-lolcow-lightgray border-lolcow-lightgray text-white"
                      placeholder="50% OFF, BOGO, etc."
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description" className="text-white">Description (HTML supported)</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="bg-lolcow-lightgray border-lolcow-lightgray text-white h-24"
                    placeholder="You can use HTML tags like <strong>, <em>, <a href=''>, etc."
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="priority" className="text-white">Priority</Label>
                    <Input
                      id="priority"
                      type="number"
                      value={formData.priority}
                      onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
                      className="bg-lolcow-lightgray border-lolcow-lightgray text-white"
                      min="1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="banner_color" className="text-white">Banner Color</Label>
                    <Input
                      id="banner_color"
                      type="color"
                      value={formData.banner_color}
                      onChange={(e) => setFormData(prev => ({ ...prev, banner_color: e.target.value }))}
                      className="bg-lolcow-lightgray border-lolcow-lightgray h-10"
                    />
                  </div>
                  <div>
                    <Label htmlFor="text_color" className="text-white">Text Color</Label>
                    <Input
                      id="text_color"
                      type="color"
                      value={formData.text_color}
                      onChange={(e) => setFormData(prev => ({ ...prev, text_color: e.target.value }))}
                      className="bg-lolcow-lightgray border-lolcow-lightgray h-10"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="action_url" className="text-white">Action URL</Label>
                    <Input
                      id="action_url"
                      value={formData.action_url}
                      onChange={(e) => setFormData(prev => ({ ...prev, action_url: e.target.value }))}
                      className="bg-lolcow-lightgray border-lolcow-lightgray text-white"
                      placeholder="https://lolcow.co/collections/sale"
                    />
                  </div>
                  <div>
                    <Label htmlFor="action_text" className="text-white">Button Text</Label>
                    <Input
                      id="action_text"
                      value={formData.action_text}
                      onChange={(e) => setFormData(prev => ({ ...prev, action_text: e.target.value }))}
                      className="bg-lolcow-lightgray border-lolcow-lightgray text-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    className="border-lolcow-lightgray text-white hover:bg-lolcow-lightgray"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="bg-lolcow-blue hover:bg-lolcow-blue/80"
                  >
                    {editingFlashSale ? "Update" : "Create"} Flash Sale
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lolcow-blue mx-auto"></div>
            <p className="text-gray-300 mt-4">Loading flash sales...</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {flashSales.length === 0 ? (
              <Card className="bg-lolcow-darkgray border-lolcow-lightgray">
                <CardContent className="text-center py-12">
                  <Zap className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">No Flash Sales</h3>
                  <p className="text-gray-300">Create your first flash sale to get started.</p>
                </CardContent>
              </Card>
            ) : (
              flashSales.map((flashSale) => (
                <Card key={flashSale.id} className="bg-lolcow-darkgray border-lolcow-lightgray">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: flashSale.banner_color }}
                        />
                        <CardTitle className="text-white">{flashSale.title}</CardTitle>
                        {flashSale.discount_text && (
                          <Badge className="bg-lolcow-red text-white">
                            {flashSale.discount_text}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={isActive(flashSale) ? "default" : "secondary"}>
                          {isActive(flashSale) ? "Active" : "Inactive"}
                        </Badge>
                        <Switch
                          checked={flashSale.is_active}
                          onCheckedChange={(checked) => handleToggleStatus(flashSale.id, flashSale.is_active)}
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {flashSale.description && (
                        <div 
                          className="text-gray-300"
                          dangerouslySetInnerHTML={{ __html: flashSale.description }}
                        />
                      )}

                      <div className="flex items-center justify-between pt-4">
                        <div className="flex items-center gap-4 text-sm text-gray-300">
                          <span>Priority: {flashSale.priority}</span>
                          {flashSale.action_url && (
                            <span>Action: {flashSale.action_text}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(flashSale)}
                            className="border-lolcow-lightgray text-white hover:bg-lolcow-lightgray"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(flashSale.id)}
                            className="border-red-500 text-red-500 hover:bg-red-500/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminFlashSales;