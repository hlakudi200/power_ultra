-- Add missing timestamp columns to tables
-- This fixes the admin pages that expect created_at and updated_at columns

-- =====================================================
-- 1. ADD TIMESTAMPS TO CLASSES TABLE
-- =====================================================
ALTER TABLE public.classes
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- =====================================================
-- 2. ADD TIMESTAMPS TO SCHEDULE TABLE
-- =====================================================
ALTER TABLE public.schedule
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- =====================================================
-- 3. ADD TIMESTAMPS TO MEMBERSHIPS TABLE
-- =====================================================
ALTER TABLE public.memberships
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- =====================================================
-- 4. ADD CREATED_AT TO BOOKINGS TABLE (already has booking_date)
-- =====================================================
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- =====================================================
-- 5. ADD CREATED_AT TO CONTACT_SUBMISSIONS (already has submitted_at)
-- =====================================================
ALTER TABLE public.contact_submissions
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Copy submitted_at values to created_at for existing rows
UPDATE public.contact_submissions
SET created_at = submitted_at
WHERE created_at IS NULL OR created_at > submitted_at;

-- =====================================================
-- 6. UPDATE TRIGGERS FOR AUTO-UPDATING updated_at
-- =====================================================

-- Apply updated_at trigger to classes
DROP TRIGGER IF EXISTS set_updated_at_classes ON public.classes;
CREATE TRIGGER set_updated_at_classes
BEFORE UPDATE ON public.classes
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Apply updated_at trigger to schedule
DROP TRIGGER IF EXISTS set_updated_at_schedule ON public.schedule;
CREATE TRIGGER set_updated_at_schedule
BEFORE UPDATE ON public.schedule
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Apply updated_at trigger to memberships
DROP TRIGGER IF EXISTS set_updated_at_memberships ON public.memberships;
CREATE TRIGGER set_updated_at_memberships
BEFORE UPDATE ON public.memberships
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Apply updated_at trigger to bookings
DROP TRIGGER IF EXISTS set_updated_at_bookings ON public.bookings;
CREATE TRIGGER set_updated_at_bookings
BEFORE UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Apply updated_at trigger to contact_submissions
DROP TRIGGER IF EXISTS set_updated_at_contact ON public.contact_submissions;
CREATE TRIGGER set_updated_at_contact
BEFORE UPDATE ON public.contact_submissions
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- 7. VERIFICATION
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '=================================';
    RAISE NOTICE 'TIMESTAMPS ADDED SUCCESSFULLY!';
    RAISE NOTICE '=================================';
    RAISE NOTICE 'All tables now have created_at and updated_at columns';
    RAISE NOTICE 'Auto-update triggers configured';
    RAISE NOTICE 'Admin pages should work without errors now!';
    RAISE NOTICE '=================================';
END $$;
