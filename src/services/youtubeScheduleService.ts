import { supabase } from "@/integrations/supabase/client"; // Assuming you have a supabase client instance
import { 
  AdminYouTubeChannel, 
  CreateAdminYouTubeChannelPayload, 
  UpdateAdminYouTubeChannelPayload,
  AdminScheduleSlot,
  CreateAdminScheduleSlotPayload,
  UpdateAdminScheduleSlotPayload
} from "./types/youtubeSchedule-types";
import { invokeEdgeFunction } from "@/utils/edgeFunctionUtils";

// Helper function removed - now using invokeEdgeFunction utility which handles auth automatically

// --- YouTube Channels (for Schedule) ---

export const getAdminYouTubeChannels = async (): Promise<AdminYouTubeChannel[]> => {
  console.log('🔍 Calling admin-youtube-channels-list function...');
  
  try {
    const { data, error } = await invokeEdgeFunction<AdminYouTubeChannel[]>('admin-youtube-channels-list');
    
    if (error) {
      console.error('🚨 Function invoke error:', error);
      throw new Error(`Function error: ${error.message || 'Unknown error'}`);
    }
    
    console.log('✅ Function response:', data);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error in getAdminYouTubeChannels:', error);
    throw error;
  }
};

export const createAdminYouTubeChannel = async (
  payload: CreateAdminYouTubeChannelPayload
): Promise<AdminYouTubeChannel> => {
  const { data, error } = await invokeEdgeFunction<AdminYouTubeChannel>('admin-youtube-channels-create', {
    body: payload,
  });
  if (error) throw new Error(error.message);
  return data as AdminYouTubeChannel;
};

export const updateAdminYouTubeChannel = async (
  payload: UpdateAdminYouTubeChannelPayload
): Promise<AdminYouTubeChannel> => {
  const { data, error } = await invokeEdgeFunction<AdminYouTubeChannel>('admin-youtube-channels-update', { 
    body: payload,
  });
  if (error) throw new Error(error.message);
  return data as AdminYouTubeChannel;
};

export const deleteAdminYouTubeChannel = async (channelId: string): Promise<void> => {
  const { error } = await invokeEdgeFunction('admin-youtube-channels-delete', { 
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
  const { data, error } = await invokeEdgeFunction<YouTubeChannelDetails>('get-youtube-channel-details', {
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
  try {
    const { data, error } = await invokeEdgeFunction<AdminScheduleSlot[]>('admin-schedule-slots-list', {
      body: filters
    });
    
    if (error) throw new Error(error.message);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error in getAdminScheduleSlots:', error);
    throw error;
  }
};

export const createAdminScheduleSlot = async (
  payload: CreateAdminScheduleSlotPayload
): Promise<AdminScheduleSlot> => {
  const { data, error } = await invokeEdgeFunction<AdminScheduleSlot>('admin-schedule-slots-create', {
    body: payload,
  });
  if (error) throw new Error(error.message);
  return data as AdminScheduleSlot;
};

export const updateAdminScheduleSlot = async (
  payload: UpdateAdminScheduleSlotPayload
): Promise<AdminScheduleSlot> => {
  const { data, error } = await invokeEdgeFunction<AdminScheduleSlot>('admin-schedule-slots-update', {
    body: payload,
    method: 'PUT'
  });
  if (error) throw new Error(error.message);
  return data as AdminScheduleSlot;
};

export const deleteAdminScheduleSlot = async (slotId: string): Promise<void> => {
  const { error } = await invokeEdgeFunction('admin-schedule-slots-delete', {
    body: { id: slotId },
  });
  if (error) throw new Error(error.message);
};

// --- YouTube Streams Sync ---

export interface SyncYouTubeStreamsConfig {
  channelIds?: string[];
  lookAheadHours?: number;
  lookBackHours?: number;
  forceRefresh?: boolean;
  maxResults?: number;
}

export interface SyncYouTubeStreamsResponse {
  success: boolean;
  message: string;
  totalSynced?: number;
  channels?: Array<{
    channel: string;
    upcoming?: number;
    recent?: number;
    total?: number;
    error?: string;
  }>;
  config?: SyncYouTubeStreamsConfig;
  error?: string;
}

export const syncYouTubeStreams = async (config?: SyncYouTubeStreamsConfig): Promise<SyncYouTubeStreamsResponse> => {
  try {
    const { data, error } = await invokeEdgeFunction<SyncYouTubeStreamsResponse>('sync-youtube-streams', {
      body: config || {
        lookBackHours: 24,
        lookAheadHours: 48,
        maxResults: 10
      }
    });

    if (error) {
      throw new Error(error.message || 'Failed to sync YouTube streams');
    }

    return data || { success: false, message: 'No data returned' };
  } catch (error) {
    console.error('Error syncing YouTube streams:', error);
    return {
      success: false,
      message: 'Failed to sync YouTube streams',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}; 