-- simple_profile_sync.sql
-- Simple profile sync without auth.users triggers
-- This approach works around Supabase permission restrictions

-- =====================================================
-- 1. BACKFILL EXISTING USERS (Safe approach)
-- =====================================================

-- Create profiles for users that don't have them yet
INSERT INTO public.profiles (id, email, first_name, last_name, phone)
SELECT
  au.id,
  au.email,
  au.raw_user_meta_data->>'first_name' as first_name,
  au.raw_user_meta_data->>'last_name' as last_name,
  au.raw_user_meta_data->>'phone' as phone
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = au.id
)
ON CONFLICT (id) DO NOTHING;

-- Update existing profiles with latest data from auth.users metadata
UPDATE public.profiles p
SET
  email = COALESCE(au.email, p.email),
  first_name = COALESCE(au.raw_user_meta_data->>'first_name', p.first_name),
  last_name = COALESCE(au.raw_user_meta_data->>'last_name', p.last_name),
  phone = COALESCE(au.raw_user_meta_data->>'phone', p.phone),
  updated_at = now()
FROM auth.users au
WHERE p.id = au.id;

-- =====================================================
-- 2. ENSURE EMAIL COLUMN EXISTS IN PROFILES
-- =====================================================

-- Add email column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles' AND column_name = 'email'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN email text;
    END IF;
END $$;

-- =====================================================
-- 3. VERIFICATION & REPORT
-- =====================================================

DO $$
DECLARE
  total_auth_users integer;
  total_profiles integer;
  profiles_with_names integer;
  profiles_without_names integer;
  missing_profiles integer;
BEGIN
  -- Count auth users
  SELECT COUNT(*) INTO total_auth_users FROM auth.users;

  -- Count profiles
  SELECT COUNT(*) INTO total_profiles FROM public.profiles;

  -- Count profiles with names
  SELECT COUNT(*) INTO profiles_with_names
  FROM public.profiles
  WHERE first_name IS NOT NULL AND last_name IS NOT NULL;

  -- Count profiles without names
  SELECT COUNT(*) INTO profiles_without_names
  FROM public.profiles
  WHERE first_name IS NULL OR last_name IS NULL;

  -- Count auth users without profiles
  SELECT COUNT(*) INTO missing_profiles
  FROM auth.users au
  WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = au.id);

  RAISE NOTICE '====================================';
  RAISE NOTICE 'PROFILE SYNC REPORT';
  RAISE NOTICE '====================================';
  RAISE NOTICE 'Total auth.users: %', total_auth_users;
  RAISE NOTICE 'Total profiles: %', total_profiles;
  RAISE NOTICE 'Profiles with names: %', profiles_with_names;
  RAISE NOTICE 'Profiles without names: %', profiles_without_names;
  RAISE NOTICE 'Auth users missing profiles: %', missing_profiles;
  RAISE NOTICE '====================================';

  IF missing_profiles = 0 THEN
    RAISE NOTICE '✓ All users have profiles!';
  ELSE
    RAISE WARNING 'Some users still missing profiles';
  END IF;

  IF profiles_without_names = 0 THEN
    RAISE NOTICE '✓ All profiles have names!';
  ELSE
    RAISE NOTICE 'Note: % profiles don''t have names yet (users haven''t completed onboarding)', profiles_without_names;
  END IF;
END $$;

-- =====================================================
-- 4. SHOW ALL USERS
-- =====================================================

SELECT
    p.id,
    p.email,
    p.first_name,
    p.last_name,
    p.phone,
    p.is_admin,
    p.role,
    p.membership_expiry_date,
    CASE
        WHEN p.membership_expiry_date IS NULL THEN 'No Membership'
        WHEN p.membership_expiry_date >= CURRENT_DATE THEN 'Active'
        ELSE 'Expired'
    END as membership_status
FROM public.profiles p
ORDER BY p.updated_at DESC;
