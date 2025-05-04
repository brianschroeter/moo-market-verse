
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface MenuItem {
  item_key: string;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface NavigationItem {
  key: string;
  label: string;
  isEnabled: boolean;
}

const fetchNavigationItems = async (): Promise<MenuItem[]> => {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*');

  if (error) {
    console.error("Error fetching menu items:", error);
    throw error;
  }

  return data || [];
};

const updateNavigationItem = async ({ key, enabled }: { key: string; enabled: boolean }): Promise<void> => {
  const { error } = await supabase
    .from('menu_items')
    .update({ is_enabled: enabled })
    .eq('item_key', key);

  if (error) {
    console.error("Error updating menu item:", error);
    throw error;
  }
};

const NavigationManager: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [navigationItems, setNavigationItems] = useState<NavigationItem[]>([]);

  const { data: menuItems, isLoading } = useQuery({
    queryKey: ["menuItems"],
    queryFn: fetchNavigationItems
  });

  const updateMutation = useMutation({
    mutationFn: updateNavigationItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menuItems"] });
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
    },
  });

  useEffect(() => {
    if (menuItems) {
      // Map database items to our view model with display labels
      const defaultItems = [
        { key: "home", label: "Home", isEnabled: true },
        { key: "schedule", label: "Schedule", isEnabled: true },
        { key: "leaderboard", label: "Leaderboard", isEnabled: true },
        { key: "profile", label: "Profile", isEnabled: true },
        { key: "support", label: "Support", isEnabled: true },
      ];

      const mappedItems = defaultItems.map(defaultItem => {
        const dbItem = menuItems.find(item => item.item_key === defaultItem.key);
        return dbItem 
          ? { key: dbItem.item_key, label: defaultItem.label, isEnabled: dbItem.is_enabled }
          : defaultItem;
      });

      setNavigationItems(mappedItems);
    }
  }, [menuItems]);

  const handleToggleChange = (key: string, enabled: boolean) => {
    updateMutation.mutate({ key, enabled });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-gray-300">Loading navigation settings...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="py-6">
        <div className="space-y-6">
          <p className="text-gray-300 mb-4">
            Enable or disable navigation items in the main menu. Disabled items will not be visible to regular users, but will still be accessible to administrators.
          </p>
          
          {navigationItems.map((item) => (
            <div key={item.key} className="flex items-center justify-between border-b border-lolcow-lightgray pb-4">
              <Label htmlFor={`toggle-${item.key}`} className="text-white font-medium">
                {item.label}
              </Label>
              <div className="flex items-center space-x-2">
                <span className={`text-sm ${item.isEnabled ? 'text-green-500' : 'text-gray-400'}`}>
                  {item.isEnabled ? 'Enabled' : 'Disabled'}
                </span>
                <Switch
                  id={`toggle-${item.key}`}
                  checked={item.isEnabled}
                  onCheckedChange={(checked) => handleToggleChange(item.key, checked)}
                  disabled={updateMutation.isPending && updateMutation.variables?.key === item.key}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default NavigationManager;
