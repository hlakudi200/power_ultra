-- =====================================================
-- Fix Unique Booking Constraint
-- =====================================================
-- Problem: Current constraint prevents rebooking same class
-- Solution: Update constraint to include class_date
--
-- BEFORE: UNIQUE (user_id, schedule_id)
-- AFTER:  UNIQUE (user_id, schedule_id, class_date)
--
-- This allows users to book the same recurring class
-- for different dates (e.g., Monday Yoga every week)
-- =====================================================

BEGIN;

-- =====================================================
-- 1. Drop the old constraint
-- =====================================================

ALTER TABLE public.bookings
DROP CONSTRAINT IF EXISTS unique_booking;

-- =====================================================
-- 2. Add the new constraint with class_date
-- =====================================================

ALTER TABLE public.bookings
ADD CONSTRAINT unique_booking
  UNIQUE (user_id, schedule_id, class_date);

-- =====================================================
-- 3. Verify the constraint exists
-- =====================================================

DO $$
DECLARE
  constraint_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'unique_booking'
      AND table_name = 'bookings'
  ) INTO constraint_exists;

  IF constraint_exists THEN
    RAISE NOTICE '✓ Unique booking constraint updated successfully';
    RAISE NOTICE '  New constraint: UNIQUE (user_id, schedule_id, class_date)';
  ELSE
    RAISE EXCEPTION 'Failed to create unique_booking constraint';
  END IF;
END $$;

COMMIT;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'UNIQUE BOOKING CONSTRAINT UPDATED!';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'What changed:';
  RAISE NOTICE '  OLD: UNIQUE (user_id, schedule_id)';
  RAISE NOTICE '       → Prevented booking same class ever again';
  RAISE NOTICE '';
  RAISE NOTICE '  NEW: UNIQUE (user_id, schedule_id, class_date)';
  RAISE NOTICE '       → Allows booking same class for different dates';
  RAISE NOTICE '';
  RAISE NOTICE 'Examples:';
  RAISE NOTICE '  ✅ User can book Monday Yoga for Dec 16';
  RAISE NOTICE '  ✅ User can book Monday Yoga for Dec 23 (next week)';
  RAISE NOTICE '  ❌ User CANNOT book Monday Yoga twice for Dec 16';
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
END $$;
