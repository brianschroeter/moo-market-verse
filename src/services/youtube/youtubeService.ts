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

// Update an existing YouTube connection with new avatar information
export const updateYouTubeConnectionAvatar = async (
  connectionId: string,
  avatarUrl: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("youtube_connections")
      .update({ 
        youtube_avatar: avatarUrl,
        updated_at: new Date().toISOString()
      })
      .eq("id", connectionId);
    
    if (error) {
      console.error("Error updating YouTube connection avatar:", error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Error in updateYouTubeConnectionAvatar:", error);
    return false;
  }
};

// New function to refresh YouTube channel avatar
export const refreshYouTubeAvatar = async (connection: YouTubeConnection): Promise<boolean> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error("No active session");
      return false;
    }

    const { error } = await supabase.functions.invoke("verify-youtube", {
      body: { 
        youtubeChannelId: connection.youtube_channel_id,
        youtubeChannelName: connection.youtube_channel_name
      },
    });

    if (error) {
      console.error("Error refreshing YouTube avatar:", error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Error in refreshYouTubeAvatar:", error);
    return false;
  }
};
