-- fix_user_profile_sync.sql
-- Ensures profiles table is always in sync with auth.users

-- =====================================================
-- 1. DROP OLD TRIGGERS IF THEY EXIST
-- =====================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

-- =====================================================
-- 2. CREATE/REPLACE FUNCTION FOR NEW USERS
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert a new row into public.profiles when user is created
  INSERT INTO public.profiles (id, email, first_name, last_name, phone)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO NOTHING; -- Ignore if already exists

  RETURN NEW;
END;
$$;

-- =====================================================
-- 3. CREATE/REPLACE FUNCTION FOR USER UPDATES
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_user_metadata_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update profiles table when auth.users metadata changes
  UPDATE public.profiles
  SET
    email = NEW.email,
    first_name = COALESCE(NEW.raw_user_meta_data->>'first_name', first_name),
    last_name = COALESCE(NEW.raw_user_meta_data->>'last_name', last_name),
    phone = COALESCE(NEW.raw_user_meta_data->>'phone', phone),
    updated_at = now()
  WHERE id = NEW.id;

  -- If profile doesn't exist (shouldn't happen but just in case), create it
  IF NOT FOUND THEN
    INSERT INTO public.profiles (id, email, first_name, last_name, phone)
    VALUES (
      NEW.id,
      NEW.email,
      NEW.raw_user_meta_data->>'first_name',
      NEW.raw_user_meta_data->>'last_name',
      NEW.raw_user_meta_data->>'phone'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- =====================================================
-- 4. CREATE TRIGGERS
-- =====================================================

-- Trigger on user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Trigger on user metadata update
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.raw_user_meta_data IS DISTINCT FROM NEW.raw_user_meta_data)
  EXECUTE FUNCTION public.handle_user_metadata_update();

-- =====================================================
-- 5. BACKFILL EXISTING USERS
-- =====================================================

-- Sync any existing auth.users that don't have profiles yet
INSERT INTO public.profiles (id, email, first_name, last_name, phone)
SELECT
  au.id,
  au.email,
  au.raw_user_meta_data->>'first_name',
  au.raw_user_meta_data->>'last_name',
  au.raw_user_meta_data->>'phone'
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Update existing profiles with latest metadata from auth.users
UPDATE public.profiles p
SET
  email = au.email,
  first_name = COALESCE(au.raw_user_meta_data->>'first_name', p.first_name),
  last_name = COALESCE(au.raw_user_meta_data->>'last_name', p.last_name),
  phone = COALESCE(au.raw_user_meta_data->>'phone', p.phone),
  updated_at = now()
FROM auth.users au
WHERE p.id = au.id
AND (
  p.email != au.email OR
  p.first_name IS NULL OR
  p.last_name IS NULL
);

-- =====================================================
-- 6. VERIFICATION
-- =====================================================

DO $$
DECLARE
  auth_user_count integer;
  profile_count integer;
  missing_profiles integer;
BEGIN
  SELECT COUNT(*) INTO auth_user_count FROM auth.users;
  SELECT COUNT(*) INTO profile_count FROM public.profiles;
  SELECT COUNT(*) INTO missing_profiles
  FROM auth.users au
  LEFT JOIN public.profiles p ON au.id = p.id
  WHERE p.id IS NULL;

  RAISE NOTICE '=== USER PROFILE SYNC COMPLETE ===';
  RAISE NOTICE 'Auth users: %', auth_user_count;
  RAISE NOTICE 'Profiles: %', profile_count;
  RAISE NOTICE 'Missing profiles: %', missing_profiles;

  IF missing_profiles = 0 THEN
    RAISE NOTICE 'All users have profiles! ✓';
  ELSE
    RAISE WARNING 'Some users still missing profiles - check RLS policies';
  END IF;
END $$;

-- =====================================================
-- 7. ADD COMMENTS
-- =====================================================

COMMENT ON FUNCTION public.handle_new_user IS 'Automatically creates a profile when a new user signs up';
COMMENT ON FUNCTION public.handle_user_metadata_update IS 'Syncs profile data when user metadata is updated';
COMMENT ON TRIGGER on_auth_user_created ON auth.users IS 'Creates profile for new users';
COMMENT ON TRIGGER on_auth_user_updated ON auth.users IS 'Updates profile when user metadata changes';
