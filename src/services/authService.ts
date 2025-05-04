import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";

export interface Profile {
  id: string;
  discord_id: string;
  discord_username: string;
  discord_avatar: string;
  created_at: string;
  updated_at: string;
}

export interface YouTubeConnection {
  id: string;
  user_id: string;
  youtube_channel_id: string;
  youtube_channel_name: string;
  youtube_avatar: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface YouTubeMembership {
  id: string;
  youtube_connection_id: string;
  creator_channel_id: string;
  creator_channel_name: string;
  membership_level: string;
  status: string;
  joined_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DiscordGuild {
  id: string;
  user_id: string;
  guild_id: string;
  guild_name: string;
  joined_at: string;
}

export interface DiscordConnection {
  id: string;
  type: string;
  name: string;
  visibility: number;
  friend_sync: boolean;
  show_activity: boolean;
  verified: boolean;
  access_token?: string;
}

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

export const fetchAndSyncDiscordConnections = async () => {
  try {
    // First, get the Discord access token from the session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.provider_token) {
      console.error("No provider token available");
      return null;
    }

    // Call Discord API to get connections
    const response = await fetch('https://discord.com/api/v10/users/@me/connections', {
      headers: {
        Authorization: `Bearer ${session.provider_token}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Failed to fetch Discord connections:", errorData);
      return null;
    }

    const connections: DiscordConnection[] = await response.json();
    console.log("Fetched Discord connections:", connections);
    
    // Filter for YouTube connections
    const youtubeConnections = connections.filter(conn => conn.type === 'youtube');
    
    if (youtubeConnections.length === 0) {
      console.log("No YouTube connections found");
      return [];
    }
    
    // For each YouTube connection, store in database
    const storedConnections: YouTubeConnection[] = []; // Initialize an empty array, but we won't use it directly from upsert results
    
    for (const conn of youtubeConnections) {
      // Upsert the connection data. We don't need the return value here.
      const { error: upsertError } = await supabase
        .from('youtube_connections')
        .upsert({
          user_id: session.user.id,
          youtube_channel_id: conn.id,
          youtube_channel_name: conn.name,
          is_verified: conn.verified
          // youtube_avatar can potentially be fetched here if Discord provides it
        }, {
          onConflict: 'user_id, youtube_channel_id',
          // returning: 'minimal' // Ensures data is null, reducing payload
        });
        
      if (upsertError) {
        // Log the error but continue trying to upsert others
        console.error("Error upserting YouTube connection:", upsertError);
      }
    }

    // After attempting to upsert all connections, fetch the definitive list from the database
    const { data: updatedConnections, error: fetchError } = await supabase
      .from('youtube_connections')
      .select('*')
      .eq('user_id', session.user.id);

    if (fetchError) {
      console.error("Error fetching updated YouTube connections after sync:", fetchError);
      return null; // Return null if fetching fails after sync
    }

    console.log("Returning updated connections from DB:", updatedConnections);
    return updatedConnections || []; // Return the fetched connections or an empty array

  } catch (error) {
    console.error("Error syncing Discord connections:", error);
    return null;
  }
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("Sign out error:", error);
    throw error;
  }
};

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

export const getDiscordGuilds = async (): Promise<DiscordGuild[]> => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.user) {
    return [];
  }
  
  const { data, error } = await supabase
    .from("discord_guilds")
    .select("*")
    .eq("user_id", session.user.id);
  
  if (error) {
    console.error("Error fetching Discord guilds:", error);
    return [];
  }
  
  return data as DiscordGuild[];
};

export const getYouTubeMemberships = async (): Promise<YouTubeMembership[]> => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.user) {
    return [];
  }
  
  // Fix: Fix the RPC call by using it correctly
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
