CREATE TABLE public.ticket_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    message_id UUID REFERENCES public.ticket_messages(id) ON DELETE CASCADE, -- Optional: if attachment is specific to a message
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL, -- Who uploaded it
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL UNIQUE, -- Path in Supabase Storage, should be unique
    file_type TEXT, -- MIME type
    file_size_bytes BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    -- No updated_at for attachments usually, they are replaced if changed
);

ALTER TABLE public.ticket_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view attachments for their own tickets."
    ON public.ticket_attachments FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.support_tickets st
        WHERE st.id = ticket_id AND st.user_id = auth.uid()
    ));

CREATE POLICY "Users can insert attachments for their own tickets if ticket is open."
    ON public.ticket_attachments FOR INSERT
    WITH CHECK (user_id = auth.uid() AND EXISTS (
        SELECT 1 FROM public.support_tickets st
        WHERE st.id = ticket_id AND st.user_id = auth.uid() AND st.status <> 'Closed'::public.ticket_status AND st.status <> 'Resolved'::public.ticket_status
    ));

CREATE POLICY "Users can delete their own attachments if ticket is open."
    ON public.ticket_attachments FOR DELETE
    USING (user_id = auth.uid() AND EXISTS (
        SELECT 1 FROM public.support_tickets st
        WHERE st.id = ticket_id AND st.user_id = auth.uid() AND st.status <> 'Closed'::public.ticket_status AND st.status <> 'Resolved'::public.ticket_status
    ));

CREATE POLICY "Admins can manage all ticket attachments."
    ON public.ticket_attachments FOR ALL
    USING (public.is_admin());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ticket_attachments_ticket_id ON public.ticket_attachments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_attachments_message_id ON public.ticket_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_ticket_attachments_user_id ON public.ticket_attachments(user_id); 