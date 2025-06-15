import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  getAllCollectionOrders, 
  bulkUpdateCollectionOrder,
  updateCollectionOrder,
  initializeCollectionOrders,
  CollectionOrder 
} from "@/services/collectionOrderService";
import { getCollections } from "@/services/shopify/shopifyStorefrontService";
import { GripVertical, Eye, EyeOff, RefreshCw, Package, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";

const AdminCollectionOrder: React.FC = () => {
  const [draggedItem, setDraggedItem] = useState<CollectionOrder | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const queryClient = useQueryClient();

  // Fetch collections from Shopify
  const { data: collectionsResponse } = useQuery({
    queryKey: ["collections"],
    queryFn: () => getCollections({ limit: 50 }),
    staleTime: 5 * 60 * 1000,
  });

  // Fetch collection orders
  const { data: collectionOrders = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-collection-orders"],
    queryFn: getAllCollectionOrders,
    staleTime: 5 * 60 * 1000,
  });

  // Initialize orders mutation
  const initializeMutation = useMutation({
    mutationFn: () => {
      const collections = collectionsResponse?.data || [];
      return initializeCollectionOrders(
        collections.map(c => ({ handle: c.handle, title: c.title }))
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-collection-orders"] });
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      toast.success("Collection orders initialized!");
    },
    onError: (error) => {
      toast.error(`Error initializing orders: ${error.message}`);
    },
  });

  // Bulk update mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: bulkUpdateCollectionOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-collection-orders"] });
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      toast.success("Collection order updated!");
    },
    onError: (error) => {
      toast.error(`Error updating order: ${error.message}`);
    },
  });

  // Toggle visibility mutation
  const toggleVisibilityMutation = useMutation({
    mutationFn: ({ id, isVisible }: { id: number; isVisible: boolean }) =>
      updateCollectionOrder(id, { is_visible: isVisible }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-collection-orders"] });
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      toast.success("Collection visibility updated!");
    },
    onError: (error) => {
      toast.error(`Error updating visibility: ${error.message}`);
    },
  });

  const handleDragStart = (e: React.DragEvent, item: CollectionOrder) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);

    if (!draggedItem) return;

    const dragIndex = collectionOrders.findIndex(item => item.id === draggedItem.id);
    if (dragIndex === dropIndex) return;

    // Create new order
    const newOrders = [...collectionOrders];
    const [removed] = newOrders.splice(dragIndex, 1);
    newOrders.splice(dropIndex, 0, removed);

    // Update display_order for all affected items
    const updates = newOrders.map((order, index) => ({
      id: order.id,
      display_order: index
    }));

    bulkUpdateMutation.mutate(updates);
    setDraggedItem(null);
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= collectionOrders.length) return;

    const newOrders = [...collectionOrders];
    [newOrders[index], newOrders[newIndex]] = [newOrders[newIndex], newOrders[index]];

    const updates = newOrders.map((order, idx) => ({
      id: order.id,
      display_order: idx
    }));

    bulkUpdateMutation.mutate(updates);
  };

  const handleToggleVisibility = (id: number, currentVisibility: boolean) => {
    toggleVisibilityMutation.mutate({ id, isVisible: !currentVisibility });
  };

  const collections = collectionsResponse?.data || [];
  const hasUninitializedCollections = collections.length > collectionOrders.length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-fredoka text-white flex items-center gap-3">
              <Package className="h-8 w-8 text-lolcow-blue" />
              Collection Order Management
            </h1>
            <p className="text-gray-300 mt-2">
              Drag and drop to reorder collections, or use the arrow buttons. Toggle visibility to show/hide collections.
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => refetch()}
              variant="outline"
              className="border-lolcow-lightgray text-white hover:bg-lolcow-lightgray"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            
            {hasUninitializedCollections && (
              <Button
                onClick={() => initializeMutation.mutate()}
                disabled={initializeMutation.isPending}
                className="bg-lolcow-blue hover:bg-lolcow-blue/80"
              >
                Initialize Missing Collections
              </Button>
            )}
          </div>
        </div>

        {hasUninitializedCollections && (
          <Alert className="bg-yellow-500/10 border-yellow-500/20">
            <AlertDescription className="text-yellow-200">
              Found {collections.length - collectionOrders.length} collections that don't have order settings. 
              Click "Initialize Missing Collections" to add them.
            </AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lolcow-blue mx-auto"></div>
            <p className="text-gray-300 mt-4">Loading collection orders...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {collectionOrders.length === 0 ? (
              <Card className="bg-lolcow-darkgray border-lolcow-lightgray">
                <CardContent className="text-center py-12">
                  <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">No Collection Orders</h3>
                  <p className="text-gray-300">Initialize collection orders to get started.</p>
                </CardContent>
              </Card>
            ) : (
              collectionOrders.map((order, index) => (
                <Card 
                  key={order.id} 
                  className={`bg-lolcow-darkgray border-lolcow-lightgray transition-all duration-200 ${
                    dragOverIndex === index ? 'border-lolcow-blue bg-lolcow-blue/10' : ''
                  } ${draggedItem?.id === order.id ? 'opacity-50' : ''}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, order)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <GripVertical className="h-5 w-5 text-gray-400 cursor-grab" />
                        <div className="flex items-center gap-2">
                          <span className="text-lolcow-blue font-mono text-sm bg-lolcow-blue/10 px-2 py-1 rounded">
                            #{index + 1}
                          </span>
                          <CardTitle className="text-white">{order.collection_handle}</CardTitle>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => moveItem(index, 'up')}
                            disabled={index === 0 || bulkUpdateMutation.isPending}
                            className="border-lolcow-lightgray text-white hover:bg-lolcow-lightgray p-2"
                          >
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => moveItem(index, 'down')}
                            disabled={index === collectionOrders.length - 1 || bulkUpdateMutation.isPending}
                            className="border-lolcow-lightgray text-white hover:bg-lolcow-lightgray p-2"
                          >
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {order.is_visible ? (
                            <Eye className="h-4 w-4 text-green-400" />
                          ) : (
                            <EyeOff className="h-4 w-4 text-red-400" />
                          )}
                          <Switch
                            checked={order.is_visible}
                            onCheckedChange={() => handleToggleVisibility(order.id, order.is_visible)}
                            disabled={toggleVisibilityMutation.isPending}
                          />
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminCollectionOrder;