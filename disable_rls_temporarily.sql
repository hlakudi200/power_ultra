-- disable_rls_temporarily.sql
-- TEMPORARY FIX: Disable RLS to get admin panel working
-- WARNING: This removes security temporarily - only for development/testing!

-- =====================================================
-- 1. DISABLE RLS ON ALL TABLES
-- =====================================================

ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_submissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_inquiries DISABLE ROW LEVEL SECURITY;

-- Disable on new tables if they exist
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'instructors') THEN
        ALTER TABLE public.instructors DISABLE ROW LEVEL SECURITY;
    END IF;

    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'attendance') THEN
        ALTER TABLE public.attendance DISABLE ROW LEVEL SECURITY;
    END IF;

    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'audit_log') THEN
        ALTER TABLE public.audit_log DISABLE ROW LEVEL SECURITY;
    END IF;

    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'email_templates') THEN
        ALTER TABLE public.email_templates DISABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- =====================================================
-- 2. VERIFICATION
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=================================';
    RAISE NOTICE 'RLS TEMPORARILY DISABLED';
    RAISE NOTICE '=================================';
    RAISE NOTICE 'Try accessing /admin now!';
    RAISE NOTICE 'This should work immediately.';
    RAISE NOTICE '=================================';
    RAISE WARNING 'SECURITY WARNING: RLS is disabled!';
    RAISE WARNING 'Anyone can access all data!';
    RAISE WARNING 'Only use for development/testing!';
    RAISE NOTICE '=================================';
END $$;

-- =====================================================
-- TO RE-ENABLE RLS LATER (when we fix the policies properly):
-- =====================================================

/*
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_inquiries ENABLE ROW LEVEL SECURITY;
*/
