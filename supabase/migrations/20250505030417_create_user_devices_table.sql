-- Create the user_devices table
CREATE TABLE public.user_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    fingerprint TEXT NOT NULL,
    user_agent TEXT,
    ip_address INET,
    last_seen_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add indexes for frequent lookups
CREATE INDEX idx_user_devices_user_id ON public.user_devices(user_id);
CREATE UNIQUE INDEX idx_user_devices_user_fingerprint ON public.user_devices(user_id, fingerprint); -- Ensure a user doesn't have duplicate fingerprints

-- Add comments to columns
COMMENT ON COLUMN public.user_devices.fingerprint IS 'Unique identifier generated for the user''s device/browser.';
COMMENT ON COLUMN public.user_devices.user_agent IS 'User-Agent string from the device.';
COMMENT ON COLUMN public.user_devices.ip_address IS 'IP address associated with the device during the session.';
COMMENT ON COLUMN public.user_devices.last_seen_at IS 'Timestamp of the last activity recorded from this device.';

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_user_device_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at on row update
CREATE TRIGGER handle_updated_at
BEFORE UPDATE ON public.user_devices
FOR EACH ROW
EXECUTE FUNCTION public.update_user_device_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own devices
CREATE POLICY "Allow users to view their own devices"
ON public.user_devices
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can insert their own devices (backend function will handle this)
CREATE POLICY "Allow users to insert their own devices"
ON public.user_devices
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update the last_seen_at for their own devices (backend function will handle this)
CREATE POLICY "Allow users to update their own devices"
ON public.user_devices
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users cannot delete devices (perhaps allow via a specific function later)
CREATE POLICY "Disallow users from deleting devices"
ON public.user_devices
FOR DELETE
USING (false);

-- Assuming `public.is_admin()` exists from `20250504133745_create_is_admin_function.sql`
-- Policy: Admins can view all devices
CREATE POLICY "Allow admins to view all devices"
ON public.user_devices
FOR SELECT
USING (public.is_admin());

-- Policy: Admins can manage all devices (update/delete)
CREATE POLICY "Allow admins to manage all devices"
ON public.user_devices
FOR ALL -- Includes UPDATE, DELETE
USING (public.is_admin());
