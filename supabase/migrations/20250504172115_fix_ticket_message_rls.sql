-- Enable Row Level Security for the ticket_messages table
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (optional, good practice)
DROP POLICY IF EXISTS "Allow admin full access to messages" ON public.ticket_messages;
DROP POLICY IF EXISTS "Allow user access to own ticket messages" ON public.ticket_messages;
DROP POLICY IF EXISTS "Allow users to insert messages in their tickets" ON public.ticket_messages;
DROP POLICY IF EXISTS "Allow admin to insert support messages" ON public.ticket_messages;
-- Add drops for UPDATE/DELETE if replacing existing ones

-- Policies for SELECT
CREATE POLICY "Allow admin full access to messages"
ON public.ticket_messages FOR SELECT
USING (is_admin());

CREATE POLICY "Allow user access to own ticket messages"
ON public.ticket_messages FOR SELECT
USING (
  -- Check if the current user owns the parent ticket
  auth.uid() = (SELECT user_id FROM public.support_tickets WHERE id = ticket_messages.ticket_id)
);

-- Policies for INSERT
-- Users can add messages to their own tickets
CREATE POLICY "Allow users to insert messages in their tickets"
ON public.ticket_messages FOR INSERT
WITH CHECK (
  auth.uid() = (SELECT user_id FROM public.support_tickets WHERE id = ticket_messages.ticket_id)
  AND ticket_messages.from_user = true -- Ensure users only mark messages as 'from_user'
);

-- Admins can add messages (presumably as support replies)
CREATE POLICY "Allow admin to insert support messages"
ON public.ticket_messages FOR INSERT
WITH CHECK (
  is_admin()
  AND ticket_messages.from_user = false -- Ensure admins mark messages as not 'from_user'
);

-- Policies for UPDATE (Example: Allow admins to update any message)
-- Adjust as needed for specific use cases
DROP POLICY IF EXISTS "Allow admin full update access to messages" ON public.ticket_messages;
CREATE POLICY "Allow admin full update access to messages"
ON public.ticket_messages FOR UPDATE
USING (is_admin())
WITH CHECK (is_admin());

-- Policies for DELETE (Example: Allow admins to delete any message)
-- Adjust as needed
DROP POLICY IF EXISTS "Allow admin full delete access to messages" ON public.ticket_messages;
CREATE POLICY "Allow admin full delete access to messages"
ON public.ticket_messages FOR DELETE
USING (is_admin());


-- Grant necessary privileges
GRANT SELECT ON TABLE public.ticket_messages TO authenticated;
GRANT INSERT (ticket_id, content, from_user) ON TABLE public.ticket_messages TO authenticated;
-- Grant UPDATE/DELETE based on who needs the permission (RLS controls rows)
GRANT UPDATE (content) ON TABLE public.ticket_messages TO authenticated; -- Admins can update via RLS
GRANT DELETE ON TABLE public.ticket_messages TO authenticated; -- Admins can delete via RLS

-- Ensure service_role has permissions if needed
GRANT ALL ON TABLE public.ticket_messages TO service_role;
