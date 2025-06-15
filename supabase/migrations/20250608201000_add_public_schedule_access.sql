-- Add public read access to schedule-related tables
-- This allows the public schedule page to display channels, slots, and streams

-- Allow public read access to youtube_channels for schedule display
CREATE POLICY "Public can view youtube channels for schedule" ON youtube_channels
FOR SELECT
TO public
USING (true);

-- Allow public read access to schedule_slots for schedule display  
CREATE POLICY "Public can view schedule slots" ON schedule_slots
FOR SELECT
TO public
USING (true);

-- Allow public read access to live_streams for schedule display
CREATE POLICY "Public can view live streams" ON live_streams
FOR SELECT
TO public
USING (true);

-- The existing admin policies remain in place for full CRUD operations
-- These public policies only allow SELECT access for viewing the schedule