
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface MakeAdminButtonProps {
  userId: string;
}

const MakeAdminButton: React.FC<MakeAdminButtonProps> = ({ userId }) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const makeUserAdmin = async (userId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('assign_admin_role', {
        target_user_id: userId,
        target_role: 'admin'
      });
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "User has been made an admin",
      });
      
      return data;
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to assign admin role: ${error.message}`,
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  const makeAdminMutation = useMutation({
    mutationFn: makeUserAdmin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    }
  });

  return (
    <Button 
      variant="default" 
      size="sm" 
      onClick={() => makeAdminMutation.mutate(userId)}
      disabled={isLoading || makeAdminMutation.isPending}
    >
      {isLoading || makeAdminMutation.isPending ? "Assigning..." : "Make Admin"}
    </Button>
  );
};

export default MakeAdminButton;
