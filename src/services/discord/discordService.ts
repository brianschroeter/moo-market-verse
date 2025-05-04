
import { supabase } from "@/integrations/supabase/client";
import { DiscordConnection, DiscordGuild, StoredDiscordConnection, YouTubeConnection } from "../types/auth-types";

export const fetchAndSyncDiscordConnections = async (): Promise<YouTubeConnection[] | null> => {
  try {
    // First, get the Discord access token from the session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.provider_token) {
      console.error("No provider token available");
      return null;
    }

    // Call Discord API to get user profile information (for avatar)
    const userResponse = await fetch('https://discord.com/api/v10/users/@me', {
      headers: {
        Authorization: `Bearer ${session.provider_token}`
      }
    });

    if (userResponse.ok) {
      const userData = await userResponse.json();
      console.log("Discord user data:", userData);
      
      // Update the user's profile with the latest Discord avatar
      if (userData.id && userData.avatar) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ 
            discord_avatar: userData.avatar,
            discord_username: userData.username
          })
          .eq('id', session.user.id);
          
        if (updateError) {
          console.error("Error updating user profile with Discord avatar:", updateError);
        }
      }
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
    
    // Store all connections in the discord_connections table
    for (const conn of connections) {
      // Upsert the connection data
      const { error: upsertError } = await supabase
        .from('discord_connections')
        .upsert({
          user_id: session.user.id,
          connection_id: conn.id,
          connection_type: conn.type,
          connection_name: conn.name,
          connection_verified: conn.verified,
          avatar_url: null // Discord API doesn't provide avatars for connections directly
        }, {
          onConflict: 'user_id, connection_id, connection_type'
        });
        
      if (upsertError) {
        console.error(`Error upserting ${conn.type} connection:`, upsertError);
      }
    }
    
    // Filter for YouTube connections and store them in the youtube_connections table
    const youtubeConnections = connections.filter(conn => conn.type === 'youtube');
    
    if (youtubeConnections.length === 0) {
      console.log("No YouTube connections found");
      return [];
    }
    
    // For each YouTube connection, store in database
    for (const conn of youtubeConnections) {
      // Upsert the connection data
      const { error: upsertError } = await supabase
        .from('youtube_connections')
        .upsert({
          user_id: session.user.id,
          youtube_channel_id: conn.id,
          youtube_channel_name: conn.name,
          is_verified: conn.verified
        }, {
          onConflict: 'user_id, youtube_channel_id'
        });
        
      if (upsertError) {
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
      return null;
    }

    return updatedConnections || [];

  } catch (error) {
    console.error("Error syncing Discord connections:", error);
    return null;
  }
};

export const getDiscordConnections = async (): Promise<StoredDiscordConnection[]> => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.user) {
    return [];
  }
  
  const { data, error } = await supabase
    .from("discord_connections")
    .select("*")
    .eq("user_id", session.user.id);
  
  if (error) {
    console.error("Error fetching Discord connections:", error);
    return [];
  }
  
  return data as StoredDiscordConnection[];
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
