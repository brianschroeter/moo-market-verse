-- supabase/migrations/20250504043255_create_support_tickets_table.sql

CREATE TYPE public.ticket_status AS ENUM (
    'Open',
    'In Progress',
    'Pending Customer Response',
    'Resolved',
    'Closed'
);

CREATE TYPE public.ticket_priority AS ENUM (
    'Low',
    'Medium',
    'High',
    'Urgent'
);

CREATE TABLE public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    description TEXT,
    status public.ticket_status DEFAULT 'Open' NOT NULL,
    priority public.ticket_priority DEFAULT 'Medium' NOT NULL,
    assigned_to_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Optional: if tickets can be assigned
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    resolved_at TIMESTAMPTZ
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Example RLS policies (adjust to your needs)
CREATE POLICY "Users can view their own support tickets."
    ON public.support_tickets FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create support tickets."
    ON public.support_tickets FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own support tickets if not resolved or closed."
    ON public.support_tickets FOR UPDATE
    USING (auth.uid() = user_id AND status <> 'Resolved' AND status <> 'Closed')
    WITH CHECK (auth.uid() = user_id);

-- Admin RLS policy is excluded for now to avoid dependency on is_admin function.
-- It can be added in a later migration after is_admin function is confirmed to be created.

-- Trigger for updated_at (reuses public.handle_updated_at function)
CREATE TRIGGER on_support_tickets_updated
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Optional: Indexes
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON public.support_tickets(priority); 