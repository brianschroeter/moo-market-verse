-- supabase/migrations/20250504122257_create_user_roles_table_and_type.sql

-- Define an ENUM for user roles
CREATE TYPE public.user_role AS ENUM (
    'admin',
    'moderator',
    'member',
    'editor',
    'viewer' -- Add/remove roles as needed
);

-- Table to store user roles
CREATE TABLE public.user_roles (
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role public.user_role NOT NULL,
    assigned_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    PRIMARY KEY (user_id, role) -- A user can have multiple roles, or use (user_id) if one role per user
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_roles (examples - adjust to your application's needs)
CREATE POLICY "Users can view their own roles."
    ON public.user_roles FOR SELECT
    USING (auth.uid() = user_id);

-- Allow admins to manage all roles (requires is_admin function)
-- For now, this is commented out to avoid dependency on is_admin being created first.
-- The assign_admin_role function is SECURITY DEFINER and can manage roles.
/*
CREATE POLICY "Admins can manage all user roles."
    ON public.user_roles FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());
*/

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role); 