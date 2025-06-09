-- Add RLS policies for youtube_channels table
-- This migration adds the missing Row Level Security policies that were omitted in the original table creation

-- Enable RLS on youtube_channels table (should already be enabled but ensure it)
ALTER TABLE youtube_channels ENABLE ROW LEVEL SECURITY;

-- Policy for admins to select all youtube channels
CREATE POLICY "Admins can select all youtube channels" ON youtube_channels
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- Policy for admins to insert youtube channels
CREATE POLICY "Admins can insert youtube channels" ON youtube_channels
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- Policy for admins to update youtube channels
CREATE POLICY "Admins can update youtube channels" ON youtube_channels
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- Policy for admins to delete youtube channels
CREATE POLICY "Admins can delete youtube channels" ON youtube_channels
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- Add similar policies for schedule_slots table (ensure they exist)
-- Policy for admins to select all schedule slots
CREATE POLICY "Admins can select all schedule slots" ON schedule_slots
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- Policy for admins to insert schedule slots
CREATE POLICY "Admins can insert schedule slots" ON schedule_slots
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- Policy for admins to update schedule slots
CREATE POLICY "Admins can update schedule slots" ON schedule_slots
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- Policy for admins to delete schedule slots
CREATE POLICY "Admins can delete schedule slots" ON schedule_slots
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- Add policies for live_streams table to ensure admins can manage them
-- Policy for admins to select all live streams
CREATE POLICY "Admins can select all live streams" ON live_streams
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- Policy for admins to insert live streams (for manual additions if needed)
CREATE POLICY "Admins can insert live streams" ON live_streams
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- Policy for admins to update live streams
CREATE POLICY "Admins can update live streams" ON live_streams
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- Policy for admins to delete live streams
CREATE POLICY "Admins can delete live streams" ON live_streams
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);