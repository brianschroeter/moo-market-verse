import { supabase } from "@/integrations/supabase/client"; // Assuming you have a supabase client instance
import { 
  AdminYouTubeChannel, 
  CreateAdminYouTubeChannelPayload, 
  UpdateAdminYouTubeChannelPayload,
  AdminScheduleSlot,
  CreateAdminScheduleSlotPayload,
  UpdateAdminScheduleSlotPayload
} from "./types/youtubeSchedule-types";

// --- YouTube Channels (for Schedule) ---

export const getAdminYouTubeChannels = async (): Promise<AdminYouTubeChannel[]> => {
  const { data, error } = await supabase.functions.invoke('admin-youtube-channels-list', {
    method: 'GET', // Specify GET method
  });
  if (error) throw new Error(error.message);
  // Ensure data is treated as an array, even if the function returns a single object or null unexpectedly
  return Array.isArray(data) ? data : [];
};

export const createAdminYouTubeChannel = async (
  payload: CreateAdminYouTubeChannelPayload
): Promise<AdminYouTubeChannel> => {
  const { data, error } = await supabase.functions.invoke('admin-youtube-channels-create', {
    body: payload,
  });
  if (error) throw new Error(error.message);
  return data as AdminYouTubeChannel;
};

export const updateAdminYouTubeChannel = async (
  payload: UpdateAdminYouTubeChannelPayload
): Promise<AdminYouTubeChannel> => {
  const { data, error } = await supabase.functions.invoke(`admin-youtube-channels-update`, { 
    body: payload,
  });
  if (error) throw new Error(error.message);
  return data as AdminYouTubeChannel;
};

export const deleteAdminYouTubeChannel = async (channelId: string): Promise<void> => {
  const { error } = await supabase.functions.invoke(`admin-youtube-channels-delete`, { 
    body: { id: channelId },
  });
  if (error) throw new Error(error.message);
};

export interface YouTubeChannelDetails {
  id: string;
  name: string | null;
  pfpUrl: string | null;
  memberships: Array<{ membership_level: string | null; channel_name: string | null }>;
}

export const getYouTubeChannelDetails = async (channelId: string): Promise<YouTubeChannelDetails> => {
  const { data, error } = await supabase.functions.invoke('get-youtube-channel-details', {
    body: { identifier: channelId }, // Use 'identifier' as the key
  });

  if (error) {
    console.error('Error fetching YouTube channel details:', error);
    // Try to parse the error response if it's a FunctionsHttpError
    if (error.context && error.context.status && typeof error.context.json === 'function') {
      try {
        const errorJson = await error.context.json();
        throw new Error(errorJson.error || `Failed to fetch YouTube channel details: ${error.context.status}`);
      } catch (parseError) {
        // Fallback if JSON parsing fails or if it's not a FunctionsHttpError
        throw new Error(error.message || 'Failed to fetch YouTube channel details');
      }
    }
    throw new Error(error.message || 'Failed to fetch YouTube channel details');
  }
  
  // It's good practice to validate or type-guard the response data
  // For now, we'll assume it matches YouTubeChannelDetails
  return data as YouTubeChannelDetails;
};

// --- Schedule Slots ---

export const getAdminScheduleSlots = async (filters?: { youtube_channel_id?: string }): Promise<AdminScheduleSlot[]> => {
  const { data, error } = await supabase.functions.invoke('admin-schedule-slots-list', {
    method: 'GET', // Specify GET method
    body: filters // GET requests can still have a body with Supabase invoke if the function expects it, though often filters are query params
  });
  if (error) throw new Error(error.message);
  // Ensure data is treated as an array
  return Array.isArray(data) ? data : [];
};

export const createAdminScheduleSlot = async (
  payload: CreateAdminScheduleSlotPayload
): Promise<AdminScheduleSlot> => {
  const { data, error } = await supabase.functions.invoke('admin-schedule-slots-create', {
    body: payload,
  });
  if (error) throw new Error(error.message);
  return data as AdminScheduleSlot;
};

export const updateAdminScheduleSlot = async (
  payload: UpdateAdminScheduleSlotPayload
): Promise<AdminScheduleSlot> => {
  const { data, error } = await supabase.functions.invoke(`admin-schedule-slots-update`, {
    method: 'PUT', // Specify PUT method
    body: payload,
  });
  if (error) throw new Error(error.message);
  return data as AdminScheduleSlot;
};

export const deleteAdminScheduleSlot = async (slotId: string): Promise<void> => {
  const { error } = await supabase.functions.invoke(`admin-schedule-slots-delete`, {
    body: { id: slotId },
  });
  if (error) throw new Error(error.message);
}; 