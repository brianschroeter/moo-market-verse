-- Add ON DELETE CASCADE to ticket_messages referencing support_tickets
ALTER TABLE public.ticket_messages
DROP CONSTRAINT IF EXISTS ticket_messages_ticket_id_fkey,
ADD CONSTRAINT ticket_messages_ticket_id_fkey
  FOREIGN KEY (ticket_id)
  REFERENCES public.support_tickets(id)
  ON DELETE CASCADE;

-- Add ON DELETE CASCADE to ticket_attachments referencing support_tickets
ALTER TABLE public.ticket_attachments
DROP CONSTRAINT IF EXISTS ticket_attachments_ticket_id_fkey,
ADD CONSTRAINT ticket_attachments_ticket_id_fkey
  FOREIGN KEY (ticket_id)
  REFERENCES public.support_tickets(id)
  ON DELETE CASCADE;

-- Add ON DELETE CASCADE to ticket_attachments referencing ticket_messages
ALTER TABLE public.ticket_attachments
DROP CONSTRAINT IF EXISTS ticket_attachments_message_id_fkey,
ADD CONSTRAINT ticket_attachments_message_id_fkey
  FOREIGN KEY (message_id)
  REFERENCES public.ticket_messages(id)
  ON DELETE CASCADE;
