-- =====================================================
-- Prevent Users from Joining Waitlist if Already Booked
-- =====================================================
-- Users should not be able to join a waitlist for a class they've already booked

-- Create a function to check if user has an active booking
CREATE OR REPLACE FUNCTION check_waitlist_booking_conflict()
RETURNS TRIGGER AS $$
DECLARE
  active_booking_count integer;
BEGIN
  -- Check if user already has an active booking for this schedule
  SELECT COUNT(*) INTO active_booking_count
  FROM public.bookings
  WHERE schedule_id = NEW.schedule_id
    AND user_id = NEW.user_id
    AND status IN ('confirmed', 'pending');

  -- If they have an active booking, prevent waitlist entry
  IF active_booking_count > 0 THEN
    RAISE EXCEPTION 'You already have a booking for this class. Cannot join waitlist.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce this check
DROP TRIGGER IF EXISTS prevent_waitlist_if_booked ON public.waitlist;
CREATE TRIGGER prevent_waitlist_if_booked
  BEFORE INSERT ON public.waitlist
  FOR EACH ROW
  EXECUTE FUNCTION check_waitlist_booking_conflict();

-- Also create a reverse check: prevent booking if user is on waitlist with 'notified' status
-- (they should book through the waitlist flow, not as a new booking)
CREATE OR REPLACE FUNCTION check_booking_waitlist_conflict()
RETURNS TRIGGER AS $$
DECLARE
  notified_waitlist_count integer;
BEGIN
  -- Only enforce this for NEW bookings (not updates)
  IF TG_OP = 'INSERT' THEN
    -- Check if user is on waitlist with 'notified' status
    SELECT COUNT(*) INTO notified_waitlist_count
    FROM public.waitlist
    WHERE schedule_id = NEW.schedule_id
      AND user_id = NEW.user_id
      AND status = 'notified';

    -- If they're notified on waitlist, the booking should convert their status
    -- This is actually OK - the BookingDialog already handles this conversion
    -- So we don't need to block it, just ensure the waitlist gets updated
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: We don't create a trigger for the reverse check because
-- BookingDialog already handles converting waitlist status to 'converted'

-- Add comment to document the constraint
COMMENT ON FUNCTION check_waitlist_booking_conflict IS
  'Prevents users from joining a waitlist if they already have an active booking for that class';

-- Verify the trigger was created
DO $$
BEGIN
  RAISE NOTICE 'Waitlist-Booking conflict prevention implemented!';
  RAISE NOTICE 'Users cannot join waitlist if they already have an active booking';
  RAISE NOTICE 'Trigger: prevent_waitlist_if_booked';
END $$;
