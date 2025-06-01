-- Add user_id column back to ticket_messages table
-- Make it nullable to handle existing records without breaking them
ALTER TABLE public.ticket_messages 
ADD COLUMN user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_ticket_messages_user_id ON public.ticket_messages(user_id);

-- Update RLS policies to work with nullable user_id
-- Drop existing policies first
DROP POLICY IF EXISTS "Users can insert messages for their tickets" ON public.ticket_messages;
DROP POLICY IF EXISTS "Admins can manage all ticket messages" ON public.ticket_messages;

-- Recreate policies that handle nullable user_id
-- Users can insert messages to their own tickets
CREATE POLICY "Users can insert messages for their tickets"
ON public.ticket_messages FOR INSERT
WITH CHECK (
  auth.uid() = (SELECT user_id FROM public.support_tickets WHERE id = ticket_messages.ticket_id)
  AND ticket_messages.from_user = true 
  AND ticket_messages.user_id = auth.uid()
);

-- Admins can insert support messages (with their user_id)
CREATE POLICY "Admins can insert support messages"
ON public.ticket_messages FOR INSERT
WITH CHECK (
  is_admin()
  AND ticket_messages.from_user = false
  AND ticket_messages.user_id = auth.uid()
);

-- Admins can manage all messages (for edit/delete)
CREATE POLICY "Admins can manage all ticket messages"
ON public.ticket_messages FOR ALL
USING (is_admin())
WITH CHECK (is_admin());