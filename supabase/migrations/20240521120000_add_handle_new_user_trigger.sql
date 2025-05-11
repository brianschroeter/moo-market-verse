-- 1. Define the function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public -- Explicitly set search_path within the function for security
AS $$
BEGIN
  -- Add better logging for debugging
  RAISE LOG 'Creating new profile for user: %, with Discord data: %', NEW.id, NEW.raw_user_meta_data;

  INSERT INTO public.profiles (id, discord_id, discord_username, discord_avatar) -- Ensure these columns exist in your profiles table
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'discord_id', NEW.raw_user_meta_data->>'provider_id', TEXT''),
    COALESCE(NEW.raw_user_meta_data->>'discord_username', NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', TEXT''),
    COALESCE(NEW.raw_user_meta_data->>'discord_avatar', NEW.raw_user_meta_data->>'avatar_url', TEXT'')
  );
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE LOG 'Error in handle_new_user trigger function for user %: %', NEW.id, SQLERRM;
    RETURN NEW; -- Still return NEW to allow the user creation, even if profile creation fails
END;
$$;

-- 2. Create the trigger on auth.users to call the function
-- Ensure this trigger doesn't already exist or use CREATE OR REPLACE TRIGGER if your PG version supports it and it's safe.
-- For migrations, it's common to DROP IF EXISTS first if you anticipate re-running, but for a new one, CREATE should be fine.
-- However, to be safe in case it was partially created or to make the migration idempotent:
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant usage on schema and execute on function if needed, though SECURITY DEFINER helps
-- This might already be in place from initial Supabase setup or other migrations.
-- GRANT USAGE ON SCHEMA public TO supabase_auth_admin; -- Or the role auth.users triggers run as
-- GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin; 