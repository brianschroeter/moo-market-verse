-- Drop the policy referencing the column
DROP POLICY IF EXISTS "Users can view their own YouTube memberships." ON public.youtube_memberships;

-- Drop the foreign key constraint
ALTER TABLE public.youtube_memberships DROP CONSTRAINT IF EXISTS youtube_memberships_youtube_connection_id_fkey;

-- Alter the column type
ALTER TABLE public.youtube_memberships
ALTER COLUMN youtube_connection_id TYPE TEXT
USING youtube_connection_id::text;

-- Recreate the policy
CREATE POLICY "Users can view their own YouTube memberships."
ON public.youtube_memberships
AS PERMISSIVE
FOR SELECT
TO public
USING (
    EXISTS (
        SELECT 1
        FROM public.youtube_connections
        WHERE (
            -- Note: Comparison might behave differently now between TEXT and UUID
            -- Ensure application logic handles potential type mismatches if joining
            (youtube_connections.id::text = youtube_memberships.youtube_connection_id) 
            AND (youtube_connections.user_id = auth.uid())
        )
    )
);
