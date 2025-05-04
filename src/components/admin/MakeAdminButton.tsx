
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Shield, Loader2 } from "lucide-react";
import { assignRole } from "@/services/roleService";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";

/**
 * This component provides a way for the first user to make themselves an admin
 * Only meant to be used temporarily when setting up the application
 */
const MakeAdminButton: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();

  const handleMakeAdmin = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to perform this action",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const success = await assignRole(user.id, 'admin');
      if (success) {
        toast({
          title: "Success",
          description: "You are now an admin! Please refresh the page to see admin features.",
        });
      } else {
        throw new Error("Failed to assign admin role");
      }
    } catch (error) {
      console.error("Error making admin:", error);
      toast({
        title: "Error",
        description: "Failed to assign admin role",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (isAdmin) {
    return null; // Don't show this button if already an admin
  }

  return (
    <Button
      onClick={handleMakeAdmin}
      disabled={loading || !user}
      className="bg-yellow-500 hover:bg-yellow-600 text-white"
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Processing...
        </>
      ) : (
        <>
          <Shield className="h-4 w-4 mr-2" />
          Make Myself Admin
        </>
      )}
    </Button>
  );
};

export default MakeAdminButton;
