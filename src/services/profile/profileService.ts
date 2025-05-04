
import { supabase } from "@/integrations/supabase/client";
import { Profile } from "../types/auth-types";

export const getProfile = async (): Promise<Profile | null> => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.user) {
    return null;
  }
  
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .single();
  
  if (error) {
    console.error("Error fetching profile:", error);
    return null;
  }
  
  return data as Profile;
};
