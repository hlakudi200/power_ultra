-- admin_schema.sql
-- Comprehensive Admin Dashboard Database Schema
-- Creates tables, functions, and policies for a full-featured admin system

-- =====================================================
-- 1. CREATE ADMIN ROLES & PERMISSIONS
-- =====================================================

-- Admin roles enum type
DO $$ BEGIN
    CREATE TYPE admin_role AS ENUM ('super_admin', 'admin', 'staff', 'instructor');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add role column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS role admin_role DEFAULT NULL;

-- Add is_admin helper column for easier queries
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- Create index for faster admin lookups
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role) WHERE role IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON public.profiles(is_admin) WHERE is_admin = true;

-- =====================================================
-- 2. INSTRUCTORS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.instructors (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    name text NOT NULL,
    bio text,
    specialties text[],
    certifications text[],
    profile_image_url text,
    email text,
    phone text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.instructors ENABLE ROW LEVEL SECURITY;

-- Public can read active instructors
CREATE POLICY "Allow public read access on active instructors"
ON public.instructors FOR SELECT
USING (is_active = true);

-- Admins can manage all instructors
CREATE POLICY "Allow admin full access on instructors"
ON public.instructors FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND is_admin = true
    )
);

-- =====================================================
-- 3. AUDIT LOG TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id uuid NOT NULL REFERENCES public.profiles(id),
    action text NOT NULL,
    table_name text,
    record_id uuid,
    old_data jsonb,
    new_data jsonb,
    ip_address text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Allow admin read access on audit_log"
ON public.audit_log FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND is_admin = true
    )
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_audit_log_admin_id ON public.audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_table_name ON public.audit_log(table_name);

-- =====================================================
-- 4. ATTENDANCE TRACKING TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.attendance (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    schedule_id uuid NOT NULL REFERENCES public.schedule(id) ON DELETE CASCADE,
    status text NOT NULL CHECK (status IN ('attended', 'no_show', 'cancelled')),
    checked_in_at timestamp with time zone,
    checked_in_by uuid REFERENCES public.profiles(id),
    notes text,
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Users can view their own attendance
CREATE POLICY "Allow users to view own attendance"
ON public.attendance FOR SELECT
USING (auth.uid() = user_id);

-- Admins can manage all attendance
CREATE POLICY "Allow admin full access on attendance"
ON public.attendance FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND is_admin = true
    )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON public.attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_schedule_id ON public.attendance(schedule_id);
CREATE INDEX IF NOT EXISTS idx_attendance_created_at ON public.attendance(created_at DESC);

-- =====================================================
-- 5. EMAIL TEMPLATES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.email_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    subject text NOT NULL,
    body_html text NOT NULL,
    body_text text,
    variables text[], -- Available variables like {{name}}, {{date}}
    category text CHECK (category IN ('welcome', 'booking', 'membership', 'general')),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Only admins can manage templates
CREATE POLICY "Allow admin full access on email_templates"
ON public.email_templates FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND is_admin = true
    )
);

-- =====================================================
-- 6. CONTACT SUBMISSIONS TRACKING
-- =====================================================

-- Add tracking fields to existing contact_submissions table
ALTER TABLE public.contact_submissions
ADD COLUMN IF NOT EXISTS status text DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'archived'));

ALTER TABLE public.contact_submissions
ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES public.profiles(id);

ALTER TABLE public.contact_submissions
ADD COLUMN IF NOT EXISTS replied_at timestamp with time zone;

ALTER TABLE public.contact_submissions
ADD COLUMN IF NOT EXISTS notes text;

-- Create index
CREATE INDEX IF NOT EXISTS idx_contact_submissions_status ON public.contact_submissions(status);

-- Admin RLS policy for contact submissions
CREATE POLICY "Allow admin full access on contact_submissions"
ON public.contact_submissions FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND is_admin = true
    )
);

-- =====================================================
-- 7. MEMBERSHIP INQUIRIES TRACKING
-- =====================================================

-- Add tracking fields to membership_inquiries table
ALTER TABLE public.membership_inquiries
ADD COLUMN IF NOT EXISTS status text DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'converted', 'rejected'));

ALTER TABLE public.membership_inquiries
ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES public.profiles(id);

ALTER TABLE public.membership_inquiries
ADD COLUMN IF NOT EXISTS followed_up_at timestamp with time zone;

ALTER TABLE public.membership_inquiries
ADD COLUMN IF NOT EXISTS notes text;

ALTER TABLE public.membership_inquiries
ADD COLUMN IF NOT EXISTS converted_to uuid REFERENCES public.profiles(id);

-- Create index
CREATE INDEX IF NOT EXISTS idx_membership_inquiries_status ON public.membership_inquiries(status);

-- Admin RLS policy for membership inquiries
CREATE POLICY "Allow admin full access on membership_inquiries"
ON public.membership_inquiries FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND is_admin = true
    )
);

-- =====================================================
-- 8. HELPER FUNCTIONS FOR ADMIN
-- =====================================================

-- Check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = user_id AND is_admin = true
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Get dashboard stats
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS jsonb AS $$
DECLARE
    stats jsonb;
    total_members integer;
    active_members integer;
    expired_members integer;
    total_classes integer;
    total_bookings_today integer;
    new_members_this_week integer;
    new_inquiries integer;
BEGIN
    -- Check if user is admin
    IF NOT public.is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Unauthorized: Admin access required';
    END IF;

    -- Total members
    SELECT COUNT(*) INTO total_members FROM public.profiles WHERE role IS NULL OR role != 'super_admin';

    -- Active members
    SELECT COUNT(*) INTO active_members
    FROM public.profiles
    WHERE membership_expiry_date IS NOT NULL
    AND membership_expiry_date >= CURRENT_DATE;

    -- Expired members
    SELECT COUNT(*) INTO expired_members
    FROM public.profiles
    WHERE membership_expiry_date IS NOT NULL
    AND membership_expiry_date < CURRENT_DATE;

    -- Total classes
    SELECT COUNT(*) INTO total_classes FROM public.classes;

    -- Bookings today
    SELECT COUNT(*) INTO total_bookings_today
    FROM public.bookings b
    JOIN public.schedule s ON b.schedule_id = s.id
    WHERE s.day_of_week = to_char(CURRENT_DATE, 'Day');

    -- New members this week
    SELECT COUNT(*) INTO new_members_this_week
    FROM public.profiles
    WHERE updated_at >= CURRENT_DATE - INTERVAL '7 days';

    -- New inquiries (unread)
    SELECT COUNT(*) INTO new_inquiries
    FROM public.contact_submissions
    WHERE status = 'new';

    stats := jsonb_build_object(
        'total_members', total_members,
        'active_members', active_members,
        'expired_members', expired_members,
        'total_classes', total_classes,
        'bookings_today', total_bookings_today,
        'new_members_this_week', new_members_this_week,
        'new_inquiries', new_inquiries
    );

    RETURN stats;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Get member growth data (for charts)
CREATE OR REPLACE FUNCTION public.get_member_growth(months integer DEFAULT 6)
RETURNS TABLE(month text, count bigint) AS $$
BEGIN
    -- Check if user is admin
    IF NOT public.is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Unauthorized: Admin access required';
    END IF;

    RETURN QUERY
    SELECT
        to_char(date_trunc('month', updated_at), 'Mon YYYY') as month,
        COUNT(*) as count
    FROM public.profiles
    WHERE updated_at >= CURRENT_DATE - (months || ' months')::interval
    GROUP BY date_trunc('month', updated_at)
    ORDER BY date_trunc('month', updated_at) ASC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Get popular classes
CREATE OR REPLACE FUNCTION public.get_popular_classes(limit_count integer DEFAULT 10)
RETURNS TABLE(
    class_id uuid,
    class_name text,
    booking_count bigint
) AS $$
BEGIN
    -- Check if user is admin
    IF NOT public.is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Unauthorized: Admin access required';
    END IF;

    RETURN QUERY
    SELECT
        c.id as class_id,
        c.name as class_name,
        COUNT(b.id) as booking_count
    FROM public.classes c
    LEFT JOIN public.schedule s ON s.class_id = c.id
    LEFT JOIN public.bookings b ON b.schedule_id = s.id
    GROUP BY c.id, c.name
    ORDER BY booking_count DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Log admin action
CREATE OR REPLACE FUNCTION public.log_admin_action(
    action_text text,
    table_name_text text DEFAULT NULL,
    record_id_param uuid DEFAULT NULL,
    old_data_param jsonb DEFAULT NULL,
    new_data_param jsonb DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
    log_id uuid;
BEGIN
    INSERT INTO public.audit_log (
        admin_id,
        action,
        table_name,
        record_id,
        old_data,
        new_data
    ) VALUES (
        auth.uid(),
        action_text,
        table_name_text,
        record_id_param,
        old_data_param,
        new_data_param
    )
    RETURNING id INTO log_id;

    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 9. UPDATE EXISTING TABLES FOR ADMIN
-- =====================================================

-- Add instructor reference to classes
ALTER TABLE public.classes
ADD COLUMN IF NOT EXISTS instructor_id uuid REFERENCES public.instructors(id);

-- Add cancellation tracking to schedule
ALTER TABLE public.schedule
ADD COLUMN IF NOT EXISTS is_cancelled boolean DEFAULT false;

ALTER TABLE public.schedule
ADD COLUMN IF NOT EXISTS cancelled_at timestamp with time zone;

ALTER TABLE public.schedule
ADD COLUMN IF NOT EXISTS cancelled_by uuid REFERENCES public.profiles(id);

ALTER TABLE public.schedule
ADD COLUMN IF NOT EXISTS cancellation_reason text;

-- Create admin policies for managing classes
DROP POLICY IF EXISTS "Allow admin full access on classes" ON public.classes;
CREATE POLICY "Allow admin full access on classes"
ON public.classes FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND is_admin = true
    )
);

-- Create admin policies for managing schedule
DROP POLICY IF EXISTS "Allow admin full access on schedule" ON public.schedule;
CREATE POLICY "Allow admin full access on schedule"
ON public.schedule FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND is_admin = true
    )
);

-- Create admin policies for managing memberships
DROP POLICY IF EXISTS "Allow admin full access on memberships" ON public.memberships;
CREATE POLICY "Allow admin full access on memberships"
ON public.memberships FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND is_admin = true
    )
);

-- Create admin policies for viewing all bookings
DROP POLICY IF EXISTS "Allow admin read access on all bookings" ON public.bookings;
CREATE POLICY "Allow admin read access on all bookings"
ON public.bookings FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND is_admin = true
    )
);

-- Create admin policies for managing all profiles
DROP POLICY IF EXISTS "Allow admin read access on all profiles" ON public.profiles;
CREATE POLICY "Allow admin read access on all profiles"
ON public.profiles FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND is_admin = true
    )
);

DROP POLICY IF EXISTS "Allow admin update access on all profiles" ON public.profiles;
CREATE POLICY "Allow admin update access on all profiles"
ON public.profiles FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND is_admin = true
    )
);

-- =====================================================
-- 10. CREATE FIRST ADMIN USER (MANUAL STEP)
-- =====================================================

-- IMPORTANT: After running this script, manually set your first admin:
-- UPDATE public.profiles
-- SET is_admin = true, role = 'super_admin'
-- WHERE email = 'your-admin-email@example.com';

-- =====================================================
-- 11. COMMENTS & DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.instructors IS 'Instructor profiles for gym staff';
COMMENT ON TABLE public.audit_log IS 'Tracks all admin actions for security and compliance';
COMMENT ON TABLE public.attendance IS 'Tracks class attendance and no-shows';
COMMENT ON TABLE public.email_templates IS 'Customizable email templates for automated communications';

COMMENT ON FUNCTION public.is_admin IS 'Checks if a user has admin privileges';
COMMENT ON FUNCTION public.get_dashboard_stats IS 'Returns real-time dashboard statistics for admin';
COMMENT ON FUNCTION public.get_member_growth IS 'Returns member growth data for charts';
COMMENT ON FUNCTION public.get_popular_classes IS 'Returns most popular classes by booking count';
COMMENT ON FUNCTION public.log_admin_action IS 'Logs admin actions to audit trail';

-- =====================================================
-- SETUP COMPLETE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=== ADMIN SCHEMA SETUP COMPLETE ===';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Set your first admin user:';
    RAISE NOTICE '   UPDATE public.profiles SET is_admin = true, role = ''super_admin''';
    RAISE NOTICE '   WHERE email = ''your-email@example.com'';';
    RAISE NOTICE '2. Test admin functions with: SELECT public.get_dashboard_stats();';
    RAISE NOTICE '3. Build admin UI components';
END $$;
