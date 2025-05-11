// Corresponds to the public.youtube_channels table
export interface AdminYouTubeChannel {
  id: string; // UUID, primary key
  youtube_channel_id: string; // YouTube's unique channel ID (e.g., UCxxxxxxxxxxxxxxx)
  channel_name: string | null; // Official channel name from YouTube (can be auto-fetched or manual)
  custom_display_name?: string | null; // Optional admin-set display name
  avatar_url: string | null; // URL for high-resolution channel avatar (can be auto-fetched or manual)
  created_at: string;
  updated_at: string;
}

// For creating a new channel (id, created_at, updated_at are auto-generated)
export type CreateAdminYouTubeChannelPayload = Omit<AdminYouTubeChannel, 'id' | 'created_at' | 'updated_at'>;

// For updating an existing channel
export type UpdateAdminYouTubeChannelPayload = Partial<Omit<AdminYouTubeChannel, 'created_at' | 'updated_at'>> & {
  id: string; // id is required for update
};

// Corresponds to the public.schedule_slots table
export interface AdminScheduleSlot {
  id: string; // UUID, primary key
  youtube_channel_id: string; // UUID, references public.youtube_channels(id)
  day_of_week: number[] | null; // 0 for Sunday, ..., 6 for Saturday. Null if specific_date is set.
  default_start_time_utc: string | null; // TIME string (HH:MM or HH:MM:SS)
  specific_date: string | null; // DATE string (YYYY-MM-DD)
  is_recurring: boolean;
  fallback_title: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;

  // Optional: For display purposes, might join youtube_channels table
  youtube_channel_name?: string | null; // e.g., custom_display_name or channel_name from youtube_channels
}

export type CreateAdminScheduleSlotPayload = Omit<AdminScheduleSlot, 'id' | 'created_at' | 'updated_at' | 'youtube_channel_name'>;

export type UpdateAdminScheduleSlotPayload = Partial<Omit<AdminScheduleSlot, 'created_at' | 'updated_at' | 'youtube_channel_name'>> & {
  id: string;
}; 