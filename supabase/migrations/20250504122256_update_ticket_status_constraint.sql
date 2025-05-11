-- Drop the existing constraint
ALTER TABLE public.support_tickets
DROP CONSTRAINT IF EXISTS support_tickets_status_check;

-- Add the new constraint with the updated list of allowed values
ALTER TABLE public.support_tickets
ADD CONSTRAINT support_tickets_status_check
CHECK (status::text = ANY (ARRAY['open'::text, 'awaiting_support'::text, 'awaiting_user'::text, 'replied'::text, 'closed'::text]));
