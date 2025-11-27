-- Add status column to bookings table
-- This enables tracking booking states (pending, confirmed, cancelled, completed)

-- =====================================================
-- 1. ADD STATUS COLUMN
-- =====================================================

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed'));

-- =====================================================
-- 2. UPDATE EXISTING BOOKINGS
-- =====================================================

-- Set all existing bookings to 'confirmed' status
UPDATE public.bookings
SET status = 'confirmed'
WHERE status IS NULL;

-- =====================================================
-- 3. CREATE INDEX FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);

-- =====================================================
-- 4. VERIFICATION
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=================================';
    RAISE NOTICE 'BOOKING STATUS COLUMN ADDED!';
    RAISE NOTICE '=================================';
    RAISE NOTICE 'Column: status (TEXT)';
    RAISE NOTICE 'Allowed values: pending, confirmed, cancelled, completed';
    RAISE NOTICE 'Default: confirmed';
    RAISE NOTICE 'All existing bookings set to: confirmed';
    RAISE NOTICE 'Index created for performance';
    RAISE NOTICE '=================================';
END $$;
