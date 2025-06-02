
import { supabase } from "@/integrations/supabase/client";

export const signInWithDiscord = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "discord",
    options: {
      scopes: "identify email connections guilds",
      redirectTo: window.location.origin + "/profile",
    },
  });
  
  if (error) {
    console.error("Discord login error:", error);
    throw error;
  }
  
  return data;
};

export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      // If the error is about missing session, that's actually fine - user is already signed out
      if (error.message?.includes('Auth session missing') || error.message?.includes('session_not_found')) {
        console.log("User was already signed out");
        return; // Don't throw error for this case
      }
      console.error("Sign out error:", error);
      throw error;
    }
  } catch (error: any) {
    // Handle network errors or other issues gracefully
    if (error.message?.includes('Auth session missing') || error.message?.includes('session_not_found')) {
      console.log("User was already signed out");
      return; // Don't throw error for this case
    }
    console.error("Sign out error:", error);
    throw error;
  }
};
