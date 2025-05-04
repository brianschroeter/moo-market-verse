
import { supabase } from "@/integrations/supabase/client";
import { YouTubeConnection, YouTubeMembership } from "../types/auth-types";

export const getYouTubeConnections = async (): Promise<YouTubeConnection[]> => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.user) {
    return [];
  }
  
  const { data, error } = await supabase
    .from("youtube_connections")
    .select("*")
    .eq("user_id", session.user.id);
  
  if (error) {
    console.error("Error fetching YouTube connections:", error);
    return [];
  }
  
  return data as YouTubeConnection[];
};

export const getYouTubeMemberships = async (): Promise<YouTubeMembership[]> => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.user) {
    return [];
  }
  
  // Get user's YouTube connections
  const { data: userConnections } = await supabase
    .from('youtube_connections')
    .select('id')
    .eq('user_id', session.user.id);
  
  if (!userConnections || userConnections.length === 0) {
    return [];
  }
  
  // Get all memberships for all of the user's YouTube connections
  const connectionIds = userConnections.map(conn => conn.id);
  
  const { data, error } = await supabase
    .from("youtube_memberships")
    .select("*")
    .in("youtube_connection_id", connectionIds);
  
  if (error) {
    console.error("Error fetching YouTube memberships:", error);
    return [];
  }
  
  return data as YouTubeMembership[];
};

export const verifyYouTubeConnection = async (
  youtubeChannelId: string, 
  youtubeChannelName: string, 
  youtubeAvatar: string | null
): Promise<boolean> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error("No active session");
      return false;
    }

    const { data, error } = await supabase.functions.invoke("verify-youtube", {
      body: { 
        youtubeChannelId,
        youtubeChannelName,
        youtubeAvatar
      },
    });

    if (error) {
      console.error("Error verifying YouTube connection:", error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Error in verifyYouTubeConnection:", error);
    return false;
  }
};

// Function to refresh YouTube channel avatar
export const refreshYouTubeAvatar = async (connection: YouTubeConnection): Promise<{
  success: boolean;
  avatarUrl?: string;
  error?: string;
}> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error("No active session");
      return { 
        success: false, 
        error: "No active session. Please log in again." 
      };
    }

    console.log("Calling verify-youtube edge function with parameters:", {
      youtubeChannelId: connection.youtube_channel_id,
      youtubeChannelName: connection.youtube_channel_name,
      refreshAvatar: true
    });

    const { data, error } = await supabase.functions.invoke("verify-youtube", {
      body: { 
        youtubeChannelId: connection.youtube_channel_id,
        youtubeChannelName: connection.youtube_channel_name,
        refreshAvatar: true
      },
    });

    if (error) {
      console.error("Edge function error:", error);
      return { 
        success: false, 
        error: `Edge function error: ${error.message || JSON.stringify(error)}` 
      };
    }
    
    // Log the entire response for debugging
    console.log("Edge function response:", data);
    
    if (data?.success) {
      console.log("Avatar refreshed successfully:", data.avatar);
      return {
        success: true,
        avatarUrl: data.avatar
      };
    }
    
    return {
      success: false,
      error: data?.message || "Unknown error from edge function"
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in refreshYouTubeAvatar:", error);
    return { 
      success: false, 
      error: `Client error: ${errorMessage}` 
    };
  }
};
