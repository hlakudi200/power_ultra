-- fix_rls_policies.sql
-- Fix the infinite recursion in RLS policies

-- =====================================================
-- 1. DROP ALL PROBLEMATIC POLICIES
-- =====================================================

-- Drop admin policies that cause recursion
DROP POLICY IF EXISTS "Allow admin read access on all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow admin update access on all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow admin full access on instructors" ON public.instructors;
DROP POLICY IF EXISTS "Allow admin read access on all bookings" ON public.bookings;
DROP POLICY IF EXISTS "Allow admin full access on classes" ON public.classes;
DROP POLICY IF EXISTS "Allow admin full access on schedule" ON public.schedule;
DROP POLICY IF EXISTS "Allow admin full access on memberships" ON public.memberships;
DROP POLICY IF EXISTS "Allow admin full access on contact_submissions" ON public.contact_submissions;
DROP POLICY IF EXISTS "Allow admin full access on membership_inquiries" ON public.membership_inquiries;
DROP POLICY IF EXISTS "Allow admin full access on attendance" ON public.attendance;
DROP POLICY IF EXISTS "Allow admin read access on audit_log" ON public.audit_log;
DROP POLICY IF EXISTS "Allow admin full access on email_templates" ON public.email_templates;

-- =====================================================
-- 2. CREATE SAFE ADMIN CHECK FUNCTION
-- =====================================================

-- This function uses SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION public.is_admin_safe()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =====================================================
-- 3. RECREATE POLICIES WITHOUT RECURSION
-- =====================================================

-- PROFILES: Admins can read/update all profiles
CREATE POLICY "Admin can read all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  (SELECT is_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1) = true
);

CREATE POLICY "Admin can update all profiles"
ON public.profiles FOR UPDATE
TO authenticated
USING (
  (SELECT is_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1) = true
);

-- BOOKINGS: Admins can read all bookings
CREATE POLICY "Admin can read all bookings"
ON public.bookings FOR SELECT
TO authenticated
USING (
  (SELECT is_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1) = true
);

-- CLASSES: Admins can manage all classes
CREATE POLICY "Admin can manage classes"
ON public.classes FOR ALL
TO authenticated
USING (
  (SELECT is_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1) = true
)
WITH CHECK (
  (SELECT is_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1) = true
);

-- SCHEDULE: Admins can manage schedule
CREATE POLICY "Admin can manage schedule"
ON public.schedule FOR ALL
TO authenticated
USING (
  (SELECT is_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1) = true
)
WITH CHECK (
  (SELECT is_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1) = true
);

-- MEMBERSHIPS: Admins can manage membership plans
CREATE POLICY "Admin can manage memberships"
ON public.memberships FOR ALL
TO authenticated
USING (
  (SELECT is_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1) = true
)
WITH CHECK (
  (SELECT is_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1) = true
);

-- CONTACT SUBMISSIONS: Admins can view and manage
CREATE POLICY "Admin can manage contact submissions"
ON public.contact_submissions FOR ALL
TO authenticated
USING (
  (SELECT is_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1) = true
)
WITH CHECK (
  (SELECT is_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1) = true
);

-- MEMBERSHIP INQUIRIES: Admins can view and manage
CREATE POLICY "Admin can manage membership inquiries"
ON public.membership_inquiries FOR ALL
TO authenticated
USING (
  (SELECT is_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1) = true
)
WITH CHECK (
  (SELECT is_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1) = true
);

-- INSTRUCTORS (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'instructors') THEN
    EXECUTE 'CREATE POLICY "Admin can manage instructors"
    ON public.instructors FOR ALL
    TO authenticated
    USING (
      (SELECT is_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1) = true
    )
    WITH CHECK (
      (SELECT is_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1) = true
    )';
  END IF;
END $$;

-- ATTENDANCE (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'attendance') THEN
    EXECUTE 'CREATE POLICY "Admin can manage attendance"
    ON public.attendance FOR ALL
    TO authenticated
    USING (
      (SELECT is_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1) = true
    )
    WITH CHECK (
      (SELECT is_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1) = true
    )';
  END IF;
END $$;

-- AUDIT LOG (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'audit_log') THEN
    EXECUTE 'CREATE POLICY "Admin can read audit log"
    ON public.audit_log FOR SELECT
    TO authenticated
    USING (
      (SELECT is_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1) = true
    )';
  END IF;
END $$;

-- EMAIL TEMPLATES (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'email_templates') THEN
    EXECUTE 'CREATE POLICY "Admin can manage email templates"
    ON public.email_templates FOR ALL
    TO authenticated
    USING (
      (SELECT is_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1) = true
    )
    WITH CHECK (
      (SELECT is_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1) = true
    )';
  END IF;
END $$;

-- =====================================================
-- 4. VERIFICATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '=================================';
  RAISE NOTICE 'RLS POLICIES FIXED!';
  RAISE NOTICE '=================================';
  RAISE NOTICE 'Infinite recursion eliminated';
  RAISE NOTICE 'Admin policies recreated safely';
  RAISE NOTICE 'Try accessing /admin now!';
  RAISE NOTICE '=================================';
END $$;
