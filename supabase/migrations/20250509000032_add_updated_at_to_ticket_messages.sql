-- 1. Add the updated_at column to ticket_messages
ALTER TABLE public.ticket_messages
ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();

-- 2. Create the function to handle auto-updating the timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create the trigger to call the function before any update on ticket_messages
CREATE TRIGGER on_ticket_message_update
BEFORE UPDATE ON public.ticket_messages
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
