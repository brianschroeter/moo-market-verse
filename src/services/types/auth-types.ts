import { User, Session } from "@supabase/supabase-js";

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
  channel_name: string;
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

export interface StoredDiscordConnection {
  id: string;
  user_id: string;
  connection_id: string;
  connection_type: string;
  connection_name: string;
  connection_verified: boolean | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}
