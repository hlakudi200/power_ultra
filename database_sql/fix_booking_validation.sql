-- =====================================================
-- Fix Booking Validation to Exclude Cancelled Bookings
-- =====================================================
-- The is_class_full function was counting ALL bookings including cancelled ones
-- This prevented waitlist users from booking even when spots were available

-- Fix: Only count confirmed and pending bookings
CREATE OR REPLACE FUNCTION public.is_class_full(schedule_id_param uuid)
RETURNS boolean AS $$
DECLARE
    current_bookings integer;
    max_cap integer;
BEGIN
    -- Get the max capacity for this schedule
    SELECT max_capacity INTO max_cap
    FROM public.schedule
    WHERE id = schedule_id_param;

    -- Count ONLY active bookings (confirmed or pending, NOT cancelled)
    SELECT COUNT(*) INTO current_bookings
    FROM public.bookings
    WHERE schedule_id = schedule_id_param
      AND status IN ('confirmed', 'pending');  -- ✅ Only count active bookings

    RETURN current_bookings >= max_cap;
END;
$$ LANGUAGE plpgsql STABLE;

-- Also fix the get_booking_count function to be consistent
CREATE OR REPLACE FUNCTION public.get_booking_count(schedule_id_param uuid)
RETURNS integer AS $$
DECLARE
    booking_count integer;
BEGIN
    -- Count ONLY active bookings (confirmed or pending, NOT cancelled)
    SELECT COUNT(*) INTO booking_count
    FROM public.bookings
    WHERE schedule_id = schedule_id_param
      AND status IN ('confirmed', 'pending');  -- ✅ Only count active bookings

    RETURN booking_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- Also fix the get_available_spots function
CREATE OR REPLACE FUNCTION public.get_available_spots(schedule_id_param uuid)
RETURNS integer AS $$
DECLARE
    max_cap integer;
    current_bookings integer;
BEGIN
    SELECT max_capacity INTO max_cap
    FROM public.schedule
    WHERE id = schedule_id_param;

    -- Count ONLY active bookings (confirmed or pending, NOT cancelled)
    SELECT COUNT(*) INTO current_bookings
    FROM public.bookings
    WHERE schedule_id = schedule_id_param
      AND status IN ('confirmed', 'pending');  -- ✅ Only count active bookings

    RETURN GREATEST(max_cap - current_bookings, 0);
END;
$$ LANGUAGE plpgsql STABLE;

-- Verify the fix
DO $$
BEGIN
  RAISE NOTICE 'Booking validation functions updated successfully!';
  RAISE NOTICE 'Functions now only count active bookings (confirmed/pending)';
  RAISE NOTICE 'Cancelled bookings are excluded from capacity checks';
END $$;
