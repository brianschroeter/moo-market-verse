CREATE TABLE public.persistent_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role_id text NOT NULL,
    created_at timestamptz DEFAULT now(),
    CONSTRAINT unique_profile_role UNIQUE (profile_id, role_id)
);

COMMENT ON TABLE public.persistent_roles IS 'Stores Discord roles persistently assigned to user profiles.';
COMMENT ON COLUMN public.persistent_roles.id IS 'Unique identifier for the persistent role assignment.';
COMMENT ON COLUMN public.persistent_roles.profile_id IS 'Foreign key referencing the user profile.';
COMMENT ON COLUMN public.persistent_roles.role_id IS 'The Discord Role ID.';
COMMENT ON COLUMN public.persistent_roles.created_at IS 'Timestamp when the role assignment was created.';
COMMENT ON CONSTRAINT unique_profile_role ON public.persistent_roles IS 'Ensures a profile can only have a specific role assigned once.';

ALTER TABLE public.persistent_roles ENABLE ROW LEVEL SECURITY;

-- Add appropriate RLS policies here based on your application's needs.
-- Example: Allow users to read their own role assignments
-- CREATE POLICY "Allow read own roles" ON public.persistent_roles FOR SELECT USING (auth.uid() = profile_id);
