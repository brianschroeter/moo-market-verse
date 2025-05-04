-- Enable Row Level Security for the ticket_attachments table
ALTER TABLE public.ticket_attachments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow admin full access to attachments" ON public.ticket_attachments;
DROP POLICY IF EXISTS "Allow user access to own ticket attachments" ON public.ticket_attachments;
DROP POLICY IF EXISTS "Allow admin to insert attachments" ON public.ticket_attachments;
DROP POLICY IF EXISTS "Allow user to insert attachments for own tickets" ON public.ticket_attachments;
DROP POLICY IF EXISTS "Allow admin to delete attachments" ON public.ticket_attachments;

-- Policies for SELECT
CREATE POLICY "Allow admin full access to attachments"
ON public.ticket_attachments FOR SELECT
USING (is_admin());

CREATE POLICY "Allow user access to own ticket attachments"
ON public.ticket_attachments FOR SELECT
USING (
  auth.uid() = (SELECT user_id FROM public.support_tickets WHERE id = ticket_attachments.ticket_id)
);

-- Policies for INSERT
CREATE POLICY "Allow admin to insert attachments"
ON public.ticket_attachments FOR INSERT
WITH CHECK (is_admin());

CREATE POLICY "Allow user to insert attachments for own tickets"
ON public.ticket_attachments FOR INSERT
WITH CHECK (
  auth.uid() = (SELECT user_id FROM public.support_tickets WHERE id = ticket_attachments.ticket_id)
  -- Optionally add check for message ownership if message_id is not null
  -- AND (ticket_attachments.message_id IS NULL OR EXISTS (SELECT 1 FROM ticket_messages tm WHERE tm.id = ticket_attachments.message_id AND tm.from_user = true))
);

-- Policies for DELETE (Example: Only Admins can delete)
CREATE POLICY "Allow admin to delete attachments"
ON public.ticket_attachments FOR DELETE
USING (is_admin());

-- NOTE: Update policies are often complex for attachments. Usually handled by deleting/re-uploading.
-- If updates are needed, define specific policies.

-- Grant necessary privileges
GRANT SELECT ON TABLE public.ticket_attachments TO authenticated;
GRANT INSERT (ticket_id, message_id, file_name, file_type, file_size, file_path) ON TABLE public.ticket_attachments TO authenticated;
GRANT DELETE ON TABLE public.ticket_attachments TO authenticated; -- Admins can delete via RLS

-- Ensure service_role has permissions if needed
GRANT ALL ON TABLE public.ticket_attachments TO service_role;
