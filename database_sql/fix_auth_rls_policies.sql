-- fix_auth_rls_policies.sql
-- CRITICAL FIX: Add missing INSERT policy and optimize RLS for session performance
-- This fixes the "Safety timeout triggered" and session hanging issues
-- Based on official Supabase best practices documentation

-- =====================================================
-- 1. DROP OLD POLICIES ON PROFILES
-- =====================================================

DROP POLICY IF EXISTS "Allow individual user read access on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow individual user update access on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow individual user insert access on profiles" ON public.profiles;

-- =====================================================
-- 2. CREATE OPTIMIZED USER POLICIES
-- =====================================================

-- CRITICAL: Add INSERT policy (was missing - causes new user profile creation to hang)
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK ((SELECT auth.uid()) = id);

-- SELECT: Optimized with SELECT wrapping (95% faster per Supabase docs)
CREATE POLICY "Users can select own profile"
ON public.profiles FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = id);

-- UPDATE: Optimized with SELECT wrapping
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING ((SELECT auth.uid()) = id)
WITH CHECK ((SELECT auth.uid()) = id);

-- DELETE: Allow users to delete their own profile (optional but recommended)
CREATE POLICY "Users can delete own profile"
ON public.profiles FOR DELETE
TO authenticated
USING ((SELECT auth.uid()) = id);

-- =====================================================
-- 3. ADD PERFORMANCE INDEX
-- =====================================================

-- Index on id column for faster RLS policy evaluation
-- Note: We don't add a partial index with auth.uid() because auth.uid()
-- is not IMMUTABLE and can't be used in index predicates
CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id);

-- =====================================================
-- 4. VERIFICATION & DIAGNOSTICS
-- =====================================================

DO $$
DECLARE
  policy_count INTEGER;
  index_count INTEGER;
BEGIN
  -- Count policies on profiles
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'profiles' AND schemaname = 'public';

  -- Count indexes on profiles
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE tablename = 'profiles' AND schemaname = 'public';

  RAISE NOTICE '=================================================';
  RAISE NOTICE 'AUTH RLS POLICIES FIXED!';
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'Policies on profiles table: %', policy_count;
  RAISE NOTICE 'Indexes on profiles table: %', index_count;
  RAISE NOTICE '';
  RAISE NOTICE 'FIXES APPLIED:';
  RAISE NOTICE '✓ Added missing INSERT policy for profiles';
  RAISE NOTICE '✓ Optimized SELECT/UPDATE policies with SELECT wrapping';
  RAISE NOTICE '✓ Added performance indexes';
  RAISE NOTICE '';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '1. Update SessionProvider.tsx to use synchronous callbacks';
  RAISE NOTICE '2. Remove timeout workarounds from fetchProfile';
  RAISE NOTICE '3. Test authentication flow';
  RAISE NOTICE '=================================================';
END $$;

-- =====================================================
-- 5. TEST RLS POLICIES (OPTIONAL - UNCOMMENT TO RUN)
-- =====================================================

/*
-- Test as authenticated user
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims.sub TO 'test-user-id';

-- Should succeed
SELECT * FROM profiles WHERE id = 'test-user-id';
INSERT INTO profiles (id, email, role) VALUES ('test-user-id', 'test@example.com', 'member');
UPDATE profiles SET full_name = 'Test User' WHERE id = 'test-user-id';

-- Should fail (different user)
SELECT * FROM profiles WHERE id = 'other-user-id';

-- Reset role
RESET ROLE;
*/
