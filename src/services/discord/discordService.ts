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
    
    // Filter for YouTube connections from the Discord API response
    const youtubeConnectionsFromDiscord = connections.filter(conn => conn.type === 'youtube');
    const youtubeConnectionIdsFromDiscord = new Set(youtubeConnectionsFromDiscord.map(conn => conn.id)); // Use a Set for efficient lookup

    // Get current YouTube connection IDs from the database for this user
    const { data: existingDbConnections, error: fetchDbError } = await supabase
      .from('youtube_connections')
      .select('youtube_channel_id')
      .eq('user_id', session.user.id);

    if (fetchDbError) {
      console.error("Error fetching existing YouTube connections from DB:", fetchDbError);
      // Decide how to handle this error - maybe return null or proceed cautiously?
      // For now, we'll log and continue, but this might leave stale data.
    }

    // Identify connections to delete (in DB but not in Discord response)
    const connectionsToDelete: string[] = [];
    if (existingDbConnections) {
      existingDbConnections.forEach(dbConn => {
        if (!youtubeConnectionIdsFromDiscord.has(dbConn.youtube_channel_id)) {
          connectionsToDelete.push(dbConn.youtube_channel_id);
        }
      });
    }

    // Perform deletions if necessary
    if (connectionsToDelete.length > 0) {
      console.log("Deleting stale YouTube connections:", connectionsToDelete);
      const { error: deleteError } = await supabase
        .from('youtube_connections')
        .delete()
        .eq('user_id', session.user.id)
        .in('youtube_channel_id', connectionsToDelete);

      if (deleteError) {
        console.error("Error deleting stale YouTube connections:", deleteError);
        // Handle deletion error if needed
      }
    }
    
    // Call Discord API to get guilds
    const guildsResponse = await fetch('https://discord.com/api/v10/users/@me/guilds', {
      headers: {
        Authorization: `Bearer ${session.provider_token}`
      }
    });

    if (!guildsResponse.ok) {
      const errorData = await guildsResponse.json();
      console.error("Failed to fetch Discord guilds:", errorData);
      // Decide if this error should prevent further processing or just be logged
      // For now, we'll log it and continue syncing connections if possible
    } else {
      const guilds: { id: string; name: string; }[] = await guildsResponse.json(); // Assuming basic guild structure
      console.log("Fetched Discord guilds:", guilds);
      const guildIdsFromApi = new Set(guilds.map(g => g.id));

      // Get current guilds from the database for this user
      const { data: existingDbGuilds, error: fetchDbGuildsError } = await supabase
        .from('discord_guilds')
        .select('guild_id')
        .eq('user_id', session.user.id);

      if (fetchDbGuildsError) {
        console.error("Error fetching existing Discord guilds from DB:", fetchDbGuildsError);
      } else if (existingDbGuilds) {
        // Identify guilds to delete (in DB but not in API response)
        const guildsToDelete = existingDbGuilds
          .filter(dbGuild => !guildIdsFromApi.has(dbGuild.guild_id))
          .map(dbGuild => dbGuild.guild_id);

        // Perform deletions if necessary
        if (guildsToDelete.length > 0) {
          console.log("Deleting stale Discord guilds:", guildsToDelete);
          const { error: deleteError } = await supabase
            .from('discord_guilds')
            .delete()
            .eq('user_id', session.user.id)
            .in('guild_id', guildsToDelete);

          if (deleteError) {
            console.error("Error deleting stale Discord guilds:", deleteError);
          }
        }
      }

      // Upsert the guilds fetched from Discord
      if (guilds.length > 0) {
        const upsertPayload = guilds.map(guild => ({
          user_id: session.user.id,
          guild_id: guild.id,
          guild_name: guild.name
          // Assuming joined_at is managed elsewhere or not strictly needed from this endpoint
        }));
        
        console.log("Upserting Discord guilds:", upsertPayload.map(g => g.guild_id));
        const { error: upsertError } = await supabase
          .from('discord_guilds')
          .upsert(upsertPayload, { onConflict: 'user_id, guild_id' });

        if (upsertError) {
          console.error("Error upserting Discord guilds:", upsertError);
        }
      }
    }
    
    // Upsert the YouTube connections fetched from Discord
    if (youtubeConnectionsFromDiscord.length === 0) {
      console.log("No YouTube connections found in Discord response to upsert.");
      // If no connections from Discord AND we deleted connections, the final result should be empty
      if (connectionsToDelete.length > 0 && !existingDbConnections?.some(dbConn => youtubeConnectionIdsFromDiscord.has(dbConn.youtube_channel_id))) {
         return [];
      }
    } else {
      console.log("Upserting YouTube connections from Discord:", youtubeConnectionsFromDiscord.map(c => c.id));
      for (const conn of youtubeConnectionsFromDiscord) {
        const { error: upsertError } = await supabase
          .from('youtube_connections')
          .upsert({
            user_id: session.user.id,
            youtube_channel_id: conn.id,
            youtube_channel_name: conn.name,
            is_verified: conn.verified
            // Note: youtube_avatar is handled separately by refreshYouTubeAvatar
          }, {
            onConflict: 'user_id, youtube_channel_id'
          });
          
        if (upsertError) {
          console.error(`Error upserting YouTube connection ${conn.id}:`, upsertError);
        }
      }
    }

    // After upserts and deletes, fetch the definitive list from the database
    const { data: finalConnections, error: fetchFinalError } = await supabase
      .from('youtube_connections')
      .select('*')
      .eq('user_id', session.user.id);

    if (fetchFinalError) {
      console.error("Error fetching updated YouTube connections after sync:", fetchFinalError);
      return null;
    }

    return finalConnections || [];

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
