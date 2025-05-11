CREATE TABLE public.ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, -- Or SET NULL if user can be deleted but message retained
    body TEXT NOT NULL,
    from_user BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL -- If messages can be edited
);

ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Examples)
CREATE POLICY "Users can view messages for their own tickets."
    ON public.ticket_messages FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.support_tickets st
        WHERE st.id = ticket_id AND st.user_id = auth.uid()
    ));

CREATE POLICY "Users can insert messages for their own tickets if ticket is open."
    ON public.ticket_messages FOR INSERT
    WITH CHECK (user_id = auth.uid() AND EXISTS (
        SELECT 1 FROM public.support_tickets st
        WHERE st.id = ticket_id AND st.user_id = auth.uid() AND st.status <> 'Closed'::public.ticket_status AND st.status <> 'Resolved'::public.ticket_status
    ));

-- Policy for admins/support to view/add messages (requires is_admin or similar role check)
CREATE POLICY "Admins can manage all ticket messages."
    ON public.ticket_messages FOR ALL
    USING (public.is_admin()) -- Assumes is_admin() exists and works
    WITH CHECK (public.is_admin());


-- Trigger for updated_at (if messages are editable)
CREATE TRIGGER on_ticket_messages_updated
  BEFORE UPDATE ON public.ticket_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON public.ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_user_id ON public.ticket_messages(user_id); 