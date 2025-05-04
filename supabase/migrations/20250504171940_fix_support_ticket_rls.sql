-- Enable Row Level Security for the support_tickets table
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (optional, but good practice for clean state)
-- It's often safer to drop specific policies you intend to replace.
DROP POLICY IF EXISTS "Allow admin full access" ON public.support_tickets;
DROP POLICY IF EXISTS "Allow individual user access" ON public.support_tickets;
DROP POLICY IF EXISTS "Allow users to insert their own tickets" ON public.support_tickets;
-- DROP POLICY IF EXISTS "Allow users to update their own tickets" ON public.support_tickets; -- Keep if users could update, drop if replacing
DROP POLICY IF EXISTS "Allow admin full update access" ON public.support_tickets;
DROP POLICY IF EXISTS "Allow admin full delete access" ON public.support_tickets;


-- Policies for SELECT
CREATE POLICY "Allow admin full access"
ON public.support_tickets FOR SELECT
USING (is_admin());

CREATE POLICY "Allow individual user access"
ON public.support_tickets FOR SELECT
USING (auth.uid() = user_id);

-- Policy for INSERT
CREATE POLICY "Allow users to insert their own tickets"
ON public.support_tickets FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policies for UPDATE
-- Admins can update any ticket
CREATE POLICY "Allow admin full update access"
ON public.support_tickets FOR UPDATE
USING (is_admin())
WITH CHECK (is_admin());

-- Note: No user-specific update policy is added here. Users cannot update tickets directly via this policy.
-- If users need to update certain fields, a more granular policy would be required.

-- Policy for DELETE
-- Admins can delete any ticket
CREATE POLICY "Allow admin full delete access"
ON public.support_tickets FOR DELETE
USING (is_admin());

-- Note: Regular users cannot delete tickets.

-- Grant necessary schema and table privileges
-- Ensure roles can access the schema
GRANT USAGE ON SCHEMA public TO authenticated, service_role;

-- Grant SELECT permission (RLS handles filtering)
GRANT SELECT ON TABLE public.support_tickets TO authenticated;

-- Grant INSERT permission for specific columns (RLS handles row check)
-- Ensure 'message' column exists or remove it from the list
GRANT INSERT (subject, /* message, -- Assuming message is part of ticket, add if exists */ user_id, status, created_at, updated_at) ON TABLE public.support_tickets TO authenticated;

-- Grant UPDATE permission for specific columns (RLS handles row check)
GRANT UPDATE (status, updated_at) ON TABLE public.support_tickets TO authenticated; -- Admins can update via RLS

-- Grant DELETE permission (RLS handles row check)
GRANT DELETE ON TABLE public.support_tickets TO authenticated; -- Admins can delete via RLS

-- Ensure service_role has necessary permissions if used for background tasks/direct access
GRANT ALL ON TABLE public.support_tickets TO service_role;
