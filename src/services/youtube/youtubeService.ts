
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

    const { error } = await supabase.functions.invoke("verify-youtube", {
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
export const refreshYouTubeAvatar = async (connection: YouTubeConnection): Promise<boolean> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error("No active session");
      return false;
    }

    const { data, error } = await supabase.functions.invoke("verify-youtube", {
      body: { 
        youtubeChannelId: connection.youtube_channel_id,
        youtubeChannelName: connection.youtube_channel_name,
        refreshAvatar: true
      },
    });

    if (error) {
      console.error("Error refreshing YouTube avatar:", error);
      return false;
    }
    
    if (data?.success) {
      console.log("Avatar refreshed successfully:", data.avatar);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error("Error in refreshYouTubeAvatar:", error);
    return false;
  }
};
