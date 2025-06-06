import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { YouTubeConnection, YouTubeMembership, Profile, StoredDiscordConnection } from "@/services/types/auth-types";
import { Ticket } from "@/services/ticket/ticketTypes";
import { useCallback } from "react";

/**
 * Custom hook that provides data fetching functions that respect impersonation state.
 * When impersonating, these functions will fetch data for the impersonated user instead of the admin.
 */
export const useImpersonationAwareData = () => {
  const { user, session, isImpersonating } = useAuth();

  // Get the effective user ID (impersonated user if impersonating, otherwise current user)
  const getEffectiveUserId = useCallback((): string | null => {
    return user?.id || null;
  }, [user?.id]);

  const getEffectiveSession = useCallback(() => {
    return session;
  }, [session]);

  const getProfile = useCallback(async (): Promise<Profile | null> => {
    const userId = user?.id;
    
    if (!userId) {
      return null;
    }
    
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    
    if (error) {
      console.error("Error fetching profile:", error);
      return null;
    }
    
    return data as Profile;
  }, [user?.id]);

  const updateProfile = useCallback(async (profileData: Partial<Profile>): Promise<Profile | null> => {
    const userId = user?.id;
    
    if (!userId) {
      return null;
    }
    
    const { data, error } = await supabase
      .from("profiles")
      .update(profileData)
      .eq("id", userId)
      .select()
      .single();
    
    if (error) {
      console.error("Error updating profile:", error);
      return null;
    }
    
    return data as Profile;
  }, [user?.id]);

  const getYouTubeConnections = useCallback(async (): Promise<YouTubeConnection[]> => {
    const userId = user?.id;
    
    if (!userId) {
      return [];
    }
    
    const { data, error } = await supabase
      .from("youtube_connections")
      .select("*")
      .eq("user_id", userId);
    
    if (error) {
      console.error("Error fetching YouTube connections:", error);
      return [];
    }
    
    return data as YouTubeConnection[];
  }, [user?.id]);

  const getYouTubeMemberships = useCallback(async (): Promise<YouTubeMembership[]> => {
    const userId = user?.id;
    
    if (!userId) {
      console.log("[getYouTubeMemberships] No user ID available.");
      return [];
    }
    
    // Get user's YouTube connections
    console.log("[getYouTubeMemberships] Fetching connections for user:", userId);
    const { data: userConnections, error: connectionsError } = await supabase
      .from('youtube_connections')
      .select('youtube_channel_id')
      .eq('user_id', userId);
    
    if (connectionsError) {
      console.error("[getYouTubeMemberships] Error fetching user connections:", connectionsError);
      return [];
    }
    
    console.log("[getYouTubeMemberships] Fetched user connections (channel IDs):", userConnections);

    if (!userConnections || userConnections.length === 0) {
      console.log("[getYouTubeMemberships] No connections found for this user.");
      return [];
    }

    // Extract the youtube_channel_ids
    const channelIds = userConnections
      .map(conn => conn.youtube_channel_id)
      .filter((id): id is string => !!id);

    if (channelIds.length === 0) {
      console.log("[getYouTubeMemberships] No valid channel IDs found.");
      return [];
    }

    // Fetch memberships for these channel IDs
    console.log("[getYouTubeMemberships] Fetching memberships for channel IDs:", channelIds);
    const { data: memberships, error: membershipsError } = await supabase
      .from('youtube_memberships')
      .select('*')
      .in('youtube_connection_id', channelIds);

    if (membershipsError) {
      console.error("[getYouTubeMemberships] Error fetching memberships:", membershipsError);
      return [];
    }

    console.log("[getYouTubeMemberships] Fetched memberships:", memberships);
    return memberships as YouTubeMembership[];
  }, [user?.id]);

  const getDiscordConnections = useCallback(async (): Promise<StoredDiscordConnection[]> => {
    const userId = user?.id;
    
    if (!userId) {
      return [];
    }
    
    const { data, error } = await supabase
      .from("discord_connections")
      .select("*")
      .eq("user_id", userId);
    
    if (error) {
      console.error("Error fetching Discord connections:", error);
      return [];
    }
    
    return data as StoredDiscordConnection[];
  }, [user?.id]);

  const getUserTickets = useCallback(async (): Promise<Ticket[]> => {
    const userId = user?.id;
    
    if (!userId) {
      return [];
    }
    
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("Error fetching user tickets:", error);
      return [];
    }
    
    return data as Ticket[];
  }, [user?.id]);

  return {
    getEffectiveUserId,
    getEffectiveSession,
    getProfile,
    updateProfile,
    getYouTubeConnections,
    getYouTubeMemberships,
    getDiscordConnections,
    getUserTickets,
    isImpersonating
  };
};