-- Table to store configured YouTube channels
CREATE TABLE public.youtube_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    youtube_channel_id TEXT NOT NULL UNIQUE, -- YouTube's unique channel ID
    channel_name TEXT, -- Official channel name from YouTube
    custom_display_name TEXT, -- Optional admin-set display name
    avatar_url TEXT, -- URL for high-resolution channel avatar
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.youtube_channels IS 'Stores configured YouTube channels for the schedule.';
COMMENT ON COLUMN public.youtube_channels.youtube_channel_id IS 'YouTube''s unique channel ID (e.g., UCxxxxxxxxxxxxxxx)';
COMMENT ON COLUMN public.youtube_channels.avatar_url IS 'High-resolution avatar image URL from YouTube.';

-- Table to define schedule slots (recurring, overrides, specific day programming)
CREATE TABLE public.schedule_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    youtube_channel_id UUID NOT NULL REFERENCES public.youtube_channels(id) ON DELETE CASCADE,
    day_of_week SMALLINT, -- 0 for Sunday, 1 for Monday, ..., 6 for Saturday. Null if specific_date is set.
    default_start_time_utc TIME, -- The scheduled start time for this slot in UTC.
    specific_date DATE, -- For overrides or specific one-time events.
    is_recurring BOOLEAN DEFAULT FALSE NOT NULL,
    fallback_title TEXT, -- Title to display if no live stream info is available (e.g., "Channel X Live", "To Be Announced")
    notes TEXT, -- Admin notes for this slot
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.schedule_slots IS 'Defines the structure of the daily/weekly schedule.';
COMMENT ON COLUMN public.schedule_slots.day_of_week IS '0 = Sunday, 1 = Monday, ..., 6 = Saturday. Used for recurring weekly slots.';
COMMENT ON COLUMN public.schedule_slots.default_start_time_utc IS 'Recurring or specified start time of the show in UTC.';
COMMENT ON COLUMN public.schedule_slots.specific_date IS 'If set, this slot is for a specific date, overriding recurring slots.';
COMMENT ON COLUMN public.schedule_slots.is_recurring IS 'True if this is a recurring weekly slot (e.g., M-F).';
COMMENT ON COLUMN public.schedule_slots.fallback_title IS 'Default text/title if no live YouTube stream is found for this slot.';

-- Table to cache data about YouTube live streams (upcoming, live, completed)
CREATE TABLE public.live_streams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id TEXT NOT NULL UNIQUE, -- YouTube's unique video ID
    youtube_channel_id UUID NOT NULL REFERENCES public.youtube_channels(id) ON DELETE CASCADE,
    title TEXT,
    thumbnail_url TEXT,
    stream_url TEXT, -- Direct link to the YouTube stream/video
    scheduled_start_time_utc TIMESTAMPTZ,
    actual_start_time_utc TIMESTAMPTZ,
    actual_end_time_utc TIMESTAMPTZ,
    status TEXT, -- e.g., 'upcoming', 'live', 'completed'
    last_checked_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.live_streams IS 'Caches data about YouTube live streams pulled via API.';
COMMENT ON COLUMN public.live_streams.video_id IS 'Unique YouTube video ID.';
COMMENT ON COLUMN public.live_streams.status IS 'Status of the stream: upcoming, live, completed.';

-- Indexes for performance
CREATE INDEX idx_schedule_slots_channel_id ON public.schedule_slots(youtube_channel_id);
CREATE INDEX idx_schedule_slots_day_of_week ON public.schedule_slots(day_of_week);
CREATE INDEX idx_schedule_slots_specific_date ON public.schedule_slots(specific_date);
CREATE INDEX idx_schedule_slots_start_time ON public.schedule_slots(default_start_time_utc);


CREATE INDEX idx_live_streams_channel_id ON public.live_streams(youtube_channel_id);
CREATE INDEX idx_live_streams_scheduled_start ON public.live_streams(scheduled_start_time_utc);
CREATE INDEX idx_live_streams_status ON public.live_streams(status);

-- Function to automatically update 'updated_at' timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for 'updated_at'
CREATE TRIGGER handle_youtube_channels_updated_at BEFORE UPDATE ON public.youtube_channels FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER handle_schedule_slots_updated_at BEFORE UPDATE ON public.schedule_slots FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER handle_live_streams_updated_at BEFORE UPDATE ON public.live_streams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
