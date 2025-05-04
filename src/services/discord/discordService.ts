import { supabase } from "@/integrations/supabase/client";
import { DiscordConnection, DiscordGuild, StoredDiscordConnection, YouTubeConnection } from "../types/auth-types";

const DISCORD_SYNC_COOLDOWN = 10 * 60 * 1000; // 10 minutes in milliseconds
const getDiscordSyncTimestampKey = (userId: string) => `discord_sync_ts_${userId}`;

const setDiscordSyncTimestamp = (userId: string) => {
  try {
    localStorage.setItem(getDiscordSyncTimestampKey(userId), Date.now().toString());
  } catch (error) {
    console.error("Error setting Discord sync timestamp in localStorage:", error);
  }
};

const shouldSyncDiscordData = (userId: string): boolean => {
  try {
    const timestampStr = localStorage.getItem(getDiscordSyncTimestampKey(userId));
    if (!timestampStr) {
      return true; // No timestamp, sync needed
    }
    const lastSyncTime = parseInt(timestampStr, 10);
    return Date.now() - lastSyncTime > DISCORD_SYNC_COOLDOWN;
  } catch (error) {
    console.error("Error reading Discord sync timestamp from localStorage:", error);
    return true; // Error reading, default to syncing
  }
};

let discordSyncInProgress = false;

interface FetchSyncOptions {
  userId: string;
  providerToken: string;
  force?: boolean;
}

export const fetchAndSyncDiscordConnections = async (options: FetchSyncOptions): Promise<YouTubeConnection[] | null> => {
  const { userId, providerToken, force = false } = options;

  if (!userId || !providerToken) {
    console.error("fetchAndSyncDiscordConnections called without userId or providerToken");
    return null;
  }
  
  if (!force && !shouldSyncDiscordData(userId)) {
    console.log("Discord sync cooldown active, skipping sync. Fetching existing connections from DB.");
    const { data: existingConnections, error: fetchError } = await supabase
      .from('youtube_connections')
      .select('*')
      .eq('user_id', userId);

    if (fetchError) {
      console.error("Error fetching existing YouTube connections during cooldown:", fetchError);
      return null;
    }
    return existingConnections || [];
  }

  if (discordSyncInProgress) {
    console.log("Discord sync operation already in progress, skipping duplicate call");
    return null;
  }

  discordSyncInProgress = true;
  console.log(`Starting Discord data sync for user ${userId}${force ? ' (forced)' : ''}...`);

  try {
    const userResponse = await fetch('https://discord.com/api/v10/users/@me', {
      headers: {
        Authorization: `Bearer ${providerToken}`
      }
    });

    if (userResponse.ok) {
      const userData = await userResponse.json();
      console.log("Discord user data:", userData);
      
      if (userData.id && userData.avatar) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ 
            discord_avatar: userData.avatar,
            discord_username: userData.username
          })
          .eq('id', userId);
          
        if (updateError) {
          console.error("Error updating user profile with Discord avatar:", updateError);
        }
      }
    }

    const response = await fetch('https://discord.com/api/v10/users/@me/connections', {
      headers: {
        Authorization: `Bearer ${providerToken}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Failed to fetch Discord connections:", errorData);
      discordSyncInProgress = false;
      return null;
    }

    const connections: DiscordConnection[] = await response.json();
    console.log("Fetched Discord connections:", connections);
    
    for (const conn of connections) {
      const { error: upsertError } = await supabase
        .from('discord_connections')
        .upsert({
          user_id: userId,
          connection_id: conn.id,
          connection_type: conn.type,
          connection_name: conn.name,
          connection_verified: conn.verified,
          avatar_url: null
        }, {
          onConflict: 'user_id, connection_id, connection_type'
        });
        
      if (upsertError) {
        console.error(`Error upserting ${conn.type} connection:`, upsertError);
      }
    }
    
    const youtubeConnectionsFromDiscord = connections.filter(conn => conn.type === 'youtube');
    const youtubeConnectionIdsFromDiscord = new Set(youtubeConnectionsFromDiscord.map(conn => conn.id));

    const { data: existingDbConnections, error: fetchDbError } = await supabase
      .from('youtube_connections')
      .select('youtube_channel_id')
      .eq('user_id', userId);

    if (fetchDbError) {
      console.error("Error fetching existing YouTube connections from DB:", fetchDbError);
    }

    const connectionsToDelete: string[] = [];
    if (existingDbConnections) {
      existingDbConnections.forEach(dbConn => {
        if (!youtubeConnectionIdsFromDiscord.has(dbConn.youtube_channel_id)) {
          connectionsToDelete.push(dbConn.youtube_channel_id);
        }
      });
    }

    if (connectionsToDelete.length > 0) {
      console.log("Deleting stale YouTube connections:", connectionsToDelete);
      const { error: deleteError } = await supabase
        .from('youtube_connections')
        .delete()
        .eq('user_id', userId)
        .in('youtube_channel_id', connectionsToDelete);

      if (deleteError) {
        console.error("Error deleting stale YouTube connections:", deleteError);
      }
    }
    
    const fetchGuildsWithRetry = async (retryCount = 0, maxRetries = 3): Promise<any[] | null> => {
      try {
        const guildsResponse = await fetch('https://discord.com/api/v10/users/@me/guilds', {
          headers: {
            Authorization: `Bearer ${providerToken}`
          }
        });

        if (guildsResponse.status === 429) {
          const rateLimitData = await guildsResponse.json();
          const retryAfter = rateLimitData.retry_after || 1;
          
          if (retryCount < maxRetries) {
            console.log(`Rate limited, waiting ${retryAfter}s before retry ${retryCount + 1}/${maxRetries}`);
            await new Promise(resolve => setTimeout(resolve, retryAfter * 1000 + 100));
            return fetchGuildsWithRetry(retryCount + 1, maxRetries);
          } else {
            console.error("Failed to fetch guilds after max retries due to rate limits");
            return null;
          }
        }

        if (!guildsResponse.ok) {
          const errorData = await guildsResponse.json();
          console.error("Failed to fetch Discord guilds:", errorData);
          return null;
        }

        return await guildsResponse.json();
      } catch (error) {
        console.error("Error fetching guilds:", error);
        return null;
      }
    };

    const guilds = await fetchGuildsWithRetry();
    
    if (guilds && guilds.length > 0) {
      console.log("Fetched Discord guilds:", guilds);
      const guildIdsFromApi = new Set(guilds.map((g: any) => g.id));

      const { data: existingDbGuilds, error: fetchDbGuildsError } = await supabase
        .from('discord_guilds')
        .select('guild_id')
        .eq('user_id', userId);

      if (fetchDbGuildsError) {
        console.error("Error fetching existing Discord guilds from DB:", fetchDbGuildsError);
      } else if (existingDbGuilds) {
        const guildsToDelete = existingDbGuilds
          .filter(dbGuild => !guildIdsFromApi.has(dbGuild.guild_id))
          .map(dbGuild => dbGuild.guild_id);

        if (guildsToDelete.length > 0) {
          console.log("Deleting stale Discord guilds:", guildsToDelete);
          const { error: deleteError } = await supabase
            .from('discord_guilds')
            .delete()
            .eq('user_id', userId)
            .in('guild_id', guildsToDelete);

          if (deleteError) {
            console.error("Error deleting stale Discord guilds:", deleteError);
          }
        }
      }

      if (guilds.length > 0) {
        const upsertPayload = guilds.map((guild: any) => ({
          user_id: userId,
          guild_id: guild.id,
          guild_name: guild.name
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
    
    if (youtubeConnectionsFromDiscord.length === 0) {
      console.log("No YouTube connections found in Discord response to upsert.");
      if (connectionsToDelete.length > 0 && !existingDbConnections?.some(dbConn => youtubeConnectionIdsFromDiscord.has(dbConn.youtube_channel_id))) {
         return [];
      }
    } else {
      console.log("Upserting YouTube connections from Discord:", youtubeConnectionsFromDiscord.map(c => c.id));
      for (const conn of youtubeConnectionsFromDiscord) {
        const { error: upsertError } = await supabase
          .from('youtube_connections')
          .upsert({
            user_id: userId,
            youtube_channel_id: conn.id,
            youtube_channel_name: conn.name,
            is_verified: conn.verified
          }, {
            onConflict: 'user_id, youtube_channel_id'
          });
          
        if (upsertError) {
          console.error(`Error upserting YouTube connection ${conn.id}:`, upsertError);
        }
      }
    }

    const { data: finalConnections, error: fetchFinalError } = await supabase
      .from('youtube_connections')
      .select('*')
      .eq('user_id', userId);

    if (fetchFinalError) {
      console.error("Error fetching updated YouTube connections after sync:", fetchFinalError);
      discordSyncInProgress = false;
      return null;
    }

    setDiscordSyncTimestamp(userId);
    console.log("Successfully completed Discord data sync.");

    return finalConnections || [];

  } catch (error) {
    console.error("Error syncing Discord connections:", error);
    return null;
  } finally {
    discordSyncInProgress = false;
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
