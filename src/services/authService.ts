
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
  const { data, error } = await supabase
    .from("youtube_connections")
    .select("*");
  
  if (error) {
    console.error("Error fetching YouTube connections:", error);
    return [];
  }
  
  return data as YouTubeConnection[];
};

export const getDiscordGuilds = async (): Promise<DiscordGuild[]> => {
  const { data, error } = await supabase
    .from("discord_guilds")
    .select("*");
  
  if (error) {
    console.error("Error fetching Discord guilds:", error);
    return [];
  }
  
  return data as DiscordGuild[];
};

export const getYouTubeMemberships = async (): Promise<YouTubeMembership[]> => {
  const { data, error } = await supabase
    .from("youtube_memberships")
    .select("*");
  
  if (error) {
    console.error("Error fetching YouTube memberships:", error);
    return [];
  }
  
  return data as YouTubeMembership[];
};
