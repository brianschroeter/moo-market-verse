
import React, { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMenuItems, updateMenuItemStatus, MenuItem } from "@/services/menu/menu.service";

const NavigationManager: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch menu items
  const { data: menuItems, isLoading, error } = useQuery({
    queryKey: ["menuItems"],
    queryFn: getMenuItems
  });

  // Update menu item status
  const updateMenuItemMutation = useMutation({
    mutationFn: ({itemKey, isEnabled}: {itemKey: string, isEnabled: boolean}) => 
      updateMenuItemStatus(itemKey, isEnabled),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ["menuItems"]});
      toast({
        title: "Success",
        description: "Navigation item updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update navigation item",
        variant: "destructive",
      });
    }
  });

  // Handle toggle change
  const handleToggle = (itemKey: string, currentValue: boolean) => {
    updateMenuItemMutation.mutate({
      itemKey,
      isEnabled: !currentValue
    });
  };

  if (isLoading) return <div className="text-white">Loading navigation items...</div>;
  
  if (error) return <div className="text-red-500">Error loading navigation items</div>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        {menuItems && menuItems.map((item: MenuItem) => (
          <div key={item.item_key} className="flex items-center justify-between px-4 py-3 rounded-md bg-lolcow-lightgray/20">
            <div>
              <h3 className="text-lg font-medium text-white capitalize">{item.item_key}</h3>
              <p className="text-sm text-gray-400">
                {item.is_enabled ? "Enabled" : "Disabled"} in navigation
              </p>
            </div>
            <Switch 
              checked={item.is_enabled}
              onCheckedChange={() => handleToggle(item.item_key, item.is_enabled)}
              className="data-[state=checked]:bg-lolcow-blue"
            />
          </div>
        ))}
        
        {menuItems && menuItems.length === 0 && (
          <div className="text-center text-gray-400">
            No navigation items found.
          </div>
        )}
      </div>
    </div>
  );
};

export default NavigationManager;
