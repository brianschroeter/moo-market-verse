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
    console.log("[getYouTubeMemberships] No user session found.");
    return [];
  }
  
  // Get user's YouTube connections
  console.log("[getYouTubeMemberships] Fetching connections for user:", session.user.id);
  const { data: userConnections, error: connectionsError } = await supabase
    .from('youtube_connections')
    .select('youtube_channel_id') // Select the correct ID for joining
    .eq('user_id', session.user.id);
  
  if (connectionsError) {
    // Log the error if fetching connections fails
    console.error("[getYouTubeMemberships] Error fetching user connections:", connectionsError);
    return [];
  }
  
  console.log("[getYouTubeMemberships] Fetched user connections (channel IDs):", userConnections);

  if (!userConnections || userConnections.length === 0) {
    console.log("[getYouTubeMemberships] No connections found for this user.");
    return [];
  }
  
  // Get all memberships using the youtube_channel_id from connections
  const channelIds = userConnections.map(conn => conn.youtube_channel_id).filter(id => id); // Filter out any null/undefined IDs
  
  if (channelIds.length === 0) {
    console.log("[getYouTubeMemberships] No valid YouTube channel IDs found in user connections.");
    return [];
  }
  
  console.log("[getYouTubeMemberships] Extracted YouTube Channel IDs:", channelIds);
  
  // Build the query using the correct column name in youtube_memberships
  const query = supabase
    .from("youtube_memberships")
    .select("*") // Select all columns from memberships
    .in("youtube_connection_id", channelIds); // Match against the youtube_connection_id column

  console.log("[getYouTubeMemberships] Built memberships query object:", query);

  // Execute the query
  const { data, error } = await query;
  
  if (error) {
    console.error("[getYouTubeMemberships] Error fetching YouTube memberships:", error);
    return [];
  }
  
  console.log("[getYouTubeMemberships] Fetched memberships data:", data);
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

    // Log before calling edge function
    console.log("[verifyYouTubeConnection] About to invoke verify-youtube edge function with:", {
      youtubeChannelId,
      youtubeChannelName,
      youtubeAvatar,
    });

    const { data, error } = await supabase.functions.invoke("verify-youtube", {
      body: { 
        youtubeChannelId,
        youtubeChannelName,
        youtubeAvatar
      },
    });

    console.log("[verifyYouTubeConnection] Edge function response:", data);

    if (error) {
      console.error("[verifyYouTubeConnection] Error from edge function:", error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("[verifyYouTubeConnection] Exception in function:", error);
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
      console.error("[refreshYouTubeAvatar] No active session");
      return { 
        success: false, 
        error: "No active session. Please log in again." 
      };
    }

    console.log("[refreshYouTubeAvatar] About to invoke verify-youtube with:", {
      youtubeChannelId: connection.youtube_channel_id,
      youtubeChannelName: connection.youtube_channel_name,
      refreshAvatar: true
    });

    const functionResponse = await supabase.functions.invoke("verify-youtube", {
      body: { 
        youtubeChannelId: connection.youtube_channel_id,
        youtubeChannelName: connection.youtube_channel_name,
        refreshAvatar: true
      },
    });

    // Log entire response object for debugging
    console.log("[refreshYouTubeAvatar] Complete edge function response object:", functionResponse);
    
    const { data, error } = functionResponse;

    if (error) {
      console.error("[refreshYouTubeAvatar] Edge function error:", error);
      return { 
        success: false, 
        error: `Edge function error: ${error.message || JSON.stringify(error)}` 
      };
    }
    
    console.log("[refreshYouTubeAvatar] Edge function data:", data);
    
    if (data?.success) {
      console.log("[refreshYouTubeAvatar] Avatar refreshed successfully:", data.avatar);
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
    console.error("[refreshYouTubeAvatar] Exception in function:", error);
    return { 
      success: false, 
      error: `Client error: ${errorMessage}` 
    };
  }
};
