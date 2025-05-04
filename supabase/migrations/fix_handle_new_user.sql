
-- Drop the existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Update the function to better handle Discord auth data and add error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Add better logging for debugging
  RAISE LOG 'Creating new profile for user: %, with Discord data: %', NEW.id, NEW.raw_user_meta_data;
  
  INSERT INTO public.profiles (id, discord_id, discord_username, discord_avatar)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'discord_id', NEW.raw_user_meta_data->>'provider_id', ''),
    COALESCE(NEW.raw_user_meta_data->>'discord_username', NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar', NEW.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE LOG 'Error in handle_new_user trigger function: %', SQLERRM;
    RETURN NEW; -- Still return NEW to allow the user creation, even if profile creation fails
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
