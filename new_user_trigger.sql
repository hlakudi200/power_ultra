-- Drop the trigger if it already exists to avoid "already exists" error
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 1. Create the function to be triggered (or replace it if it exists)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $BODY$
BEGIN
  -- Insert a new row into public.profiles
  INSERT INTO public.profiles (id, email, first_name, last_name, phone)
  VALUES (
    NEW.id, 
    NEW.email, 
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'phone'
  );
  
  RETURN NEW;
END;
$BODY$; -- Changed from $$;

-- 2. Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
