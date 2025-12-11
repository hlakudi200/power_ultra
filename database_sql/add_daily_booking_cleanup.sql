-- =====================================================
-- Daily Booking & Waitlist Cleanup System
-- =====================================================
-- This migration adds automatic cleanup for BOTH bookings and waitlist
-- Clears out past bookings and waitlist entries daily
--
-- Problem: Bookings and waitlist accumulate forever, classes appear full
-- Solution: Clean up entries after the class date/time has passed
--
-- Run this AFTER add_waitlist_cleanup.sql

BEGIN;

-- =====================================================
-- 1. Add booking_date to track specific class occurrence
-- =====================================================

-- Check if column already exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'class_date'
  ) THEN
    ALTER TABLE public.bookings
    ADD COLUMN class_date date;
  END IF;
END $$;

COMMENT ON COLUMN public.bookings.class_date IS 'The specific date of the class occurrence (e.g., Monday Dec 16, 2024)';

-- =====================================================
-- 2. Create function to calculate next class date/time
-- =====================================================

CREATE OR REPLACE FUNCTION get_next_class_datetime(
  p_day_of_week text,
  p_class_time time
)
RETURNS timestamp
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  next_date date;
  result_timestamp timestamp;
BEGIN
  -- Get the next occurrence of the day
  next_date := get_next_class_date(p_day_of_week);

  -- Combine date and time
  result_timestamp := next_date + p_class_time;

  RETURN result_timestamp;
END;
$$;

COMMENT ON FUNCTION get_next_class_datetime IS 'Calculates the next occurrence datetime for a class based on day_of_week and time';

GRANT EXECUTE ON FUNCTION get_next_class_datetime TO authenticated;

-- =====================================================
-- 3. Backfill class_date for existing bookings
-- =====================================================

UPDATE public.bookings b
SET class_date = get_next_class_date(s.day_of_week)
FROM public.schedule s
WHERE b.schedule_id = s.id
  AND b.class_date IS NULL
  AND b.status IN ('confirmed', 'pending');

-- =====================================================
-- 4. Create trigger to auto-set class_date on booking INSERT
-- =====================================================

CREATE OR REPLACE FUNCTION set_booking_class_date()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  class_day_of_week text;
BEGIN
  -- Only set if not already provided
  IF NEW.class_date IS NULL THEN
    -- Get day_of_week from schedule
    SELECT day_of_week INTO class_day_of_week
    FROM public.schedule
    WHERE id = NEW.schedule_id;

    -- Calculate next occurrence
    NEW.class_date := get_next_class_date(class_day_of_week);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_set_booking_class_date ON public.bookings;

CREATE TRIGGER auto_set_booking_class_date
  BEFORE INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION set_booking_class_date();

COMMENT ON FUNCTION set_booking_class_date IS 'Automatically calculates and sets class_date when user books a class';

-- =====================================================
-- 5. Create comprehensive daily cleanup function
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_past_bookings_and_waitlist()
RETURNS TABLE(
  bookings_completed integer,
  waitlist_deleted integer,
  message text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_bookings_completed integer;
  v_waitlist_deleted integer;
  v_booking_ids uuid[];
  v_waitlist_ids uuid[];
BEGIN
  -- ============================
  -- 1. Mark past BOOKINGS as 'completed' (PRESERVE for analytics)
  -- ============================
  WITH updated_bookings AS (
    UPDATE public.bookings
    SET status = 'completed',
        updated_at = now()
    WHERE class_date < CURRENT_DATE
      AND status IN ('confirmed', 'pending')
    RETURNING id
  )
  SELECT COUNT(*)::integer, array_agg(id)
  INTO v_bookings_completed, v_booking_ids
  FROM updated_bookings;

  -- ============================
  -- 2. DELETE WAITLIST entries (not needed for analytics)
  -- ============================
  WITH deleted_waitlist AS (
    DELETE FROM public.waitlist
    WHERE target_date < CURRENT_DATE
      AND status IN ('waiting', 'expired', 'notified')
    RETURNING id
  )
  SELECT COUNT(*)::integer, array_agg(id)
  INTO v_waitlist_deleted, v_waitlist_ids
  FROM deleted_waitlist;

  -- ============================
  -- 3. Log the cleanup operation
  -- ============================
  INSERT INTO public.waitlist_cleanup_log (
    cleanup_date,
    entries_deleted,
    cleanup_type,
    details
  ) VALUES (
    CURRENT_DATE,
    v_waitlist_deleted,  -- Only count deleted (not completed bookings)
    'automatic',
    jsonb_build_object(
      'bookings_completed', v_bookings_completed,
      'waitlist_deleted', v_waitlist_deleted,
      'booking_ids', v_booking_ids,
      'waitlist_ids', v_waitlist_ids,
      'cutoff_date', CURRENT_DATE
    )
  );

  -- ============================
  -- 4. Return summary
  -- ============================
  RETURN QUERY SELECT
    v_bookings_completed,
    v_waitlist_deleted,
    format(
      'Daily cleanup: Marked %s bookings as completed, deleted %s waitlist entries (class_date/target_date < %s)',
      v_bookings_completed,
      v_waitlist_deleted,
      CURRENT_DATE
    );
END;
$$;

COMMENT ON FUNCTION cleanup_past_bookings_and_waitlist IS 'Marks past bookings as completed (preserved for analytics) and deletes waitlist entries. Run daily via cron.';

GRANT EXECUTE ON FUNCTION cleanup_past_bookings_and_waitlist TO service_role;

-- =====================================================
-- 6. Create cleanup summary function
-- =====================================================

CREATE OR REPLACE FUNCTION get_cleanup_summary()
RETURNS TABLE(
  total_bookings integer,
  confirmed_bookings integer,
  completed_bookings integer,
  past_active_bookings integer,
  future_bookings integer,
  total_waitlist integer,
  waiting_entries integer,
  past_waitlist integer,
  future_waitlist integer
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    -- Bookings stats
    COUNT(*)::integer as total_bookings,
    COUNT(*) FILTER (WHERE status = 'confirmed')::integer as confirmed_bookings,
    COUNT(*) FILTER (WHERE status = 'completed')::integer as completed_bookings,
    COUNT(*) FILTER (WHERE class_date < CURRENT_DATE AND status IN ('confirmed', 'pending'))::integer as past_active_bookings,
    COUNT(*) FILTER (WHERE class_date >= CURRENT_DATE AND status IN ('confirmed', 'pending'))::integer as future_bookings,
    -- Waitlist stats (subquery to avoid column name conflicts)
    (SELECT COUNT(*)::integer FROM public.waitlist) as total_waitlist,
    (SELECT COUNT(*)::integer FROM public.waitlist WHERE status = 'waiting') as waiting_entries,
    (SELECT COUNT(*)::integer FROM public.waitlist WHERE target_date < CURRENT_DATE) as past_waitlist,
    (SELECT COUNT(*)::integer FROM public.waitlist WHERE target_date >= CURRENT_DATE) as future_waitlist
  FROM public.bookings;
$$;

COMMENT ON FUNCTION get_cleanup_summary IS 'Returns summary statistics about bookings and waitlist for monitoring';

GRANT EXECUTE ON FUNCTION get_cleanup_summary TO authenticated;

-- =====================================================
-- 7. Add index for cleanup performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_bookings_class_date
  ON public.bookings(class_date)
  WHERE status IN ('confirmed', 'pending');

CREATE INDEX IF NOT EXISTS idx_bookings_status_class_date
  ON public.bookings(status, class_date);

-- =====================================================
-- 8. Create admin view for monitoring
-- =====================================================

CREATE OR REPLACE VIEW bookings_with_class_details AS
SELECT
  b.id as booking_id,
  b.user_id,
  p.full_name as user_name,
  b.schedule_id,
  c.name as class_name,
  s.day_of_week,
  s.start_time,
  s.end_time,
  b.class_date,
  b.status as booking_status,
  b.created_at as booked_at,
  -- Calculate if entry is stale
  CASE
    WHEN b.class_date < CURRENT_DATE THEN 'PAST_CLASS'
    WHEN b.class_date = CURRENT_DATE THEN 'TODAY'
    WHEN b.class_date > CURRENT_DATE THEN 'FUTURE'
    ELSE 'UNKNOWN'
  END as computed_status
FROM public.bookings b
JOIN public.profiles p ON b.user_id = p.id
JOIN public.schedule s ON b.schedule_id = s.id
JOIN public.classes c ON s.class_id = c.id;

COMMENT ON VIEW bookings_with_class_details IS 'Admin view showing bookings with class details and computed status';

GRANT SELECT ON bookings_with_class_details TO authenticated;

-- =====================================================
-- 9. Update the old cleanup function to use new one
-- =====================================================

-- Keep the old function name for backwards compatibility
CREATE OR REPLACE FUNCTION cleanup_past_waitlists()
RETURNS TABLE(
  deleted_count integer,
  message text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cleanup_result record;
BEGIN
  -- Call the new comprehensive cleanup function
  SELECT * INTO cleanup_result FROM cleanup_past_bookings_and_waitlist();

  -- Return in old format (just waitlist count for compatibility)
  RETURN QUERY SELECT
    cleanup_result.waitlist_deleted,
    format('Cleaned up %s waitlist entries (use cleanup_past_bookings_and_waitlist for full details)', cleanup_result.waitlist_deleted);
END;
$$;

-- =====================================================
-- 10. Create manual admin cleanup function
-- =====================================================

CREATE OR REPLACE FUNCTION manual_full_cleanup(
  p_before_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  completed_bookings integer,
  deleted_waitlist integer,
  total_processed integer,
  message text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_completed_bookings integer;
  v_deleted_waitlist integer;
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Only admins can run manual cleanup';
  END IF;

  -- Mark bookings as completed (PRESERVE for analytics)
  WITH updated AS (
    UPDATE public.bookings
    SET status = 'completed',
        updated_at = now()
    WHERE class_date < p_before_date
      AND status IN ('confirmed', 'pending')
    RETURNING id
  )
  SELECT COUNT(*)::integer INTO v_completed_bookings FROM updated;

  -- Delete waitlist entries for past classes
  WITH deleted AS (
    DELETE FROM public.waitlist
    WHERE target_date < p_before_date
      AND status IN ('waiting', 'expired', 'notified')
    RETURNING id
  )
  SELECT COUNT(*)::integer INTO v_deleted_waitlist FROM deleted;

  -- Log the manual cleanup
  INSERT INTO public.waitlist_cleanup_log (
    cleanup_date,
    entries_deleted,
    cleanup_type,
    performed_by,
    details
  ) VALUES (
    CURRENT_DATE,
    v_deleted_waitlist,  -- Only count deleted
    'manual',
    auth.uid(),
    jsonb_build_object(
      'bookings_completed', v_completed_bookings,
      'waitlist_deleted', v_deleted_waitlist,
      'cutoff_date', p_before_date
    )
  );

  RETURN QUERY SELECT
    v_completed_bookings,
    v_deleted_waitlist,
    v_completed_bookings + v_deleted_waitlist,
    format('Manual cleanup: Marked %s bookings as completed, deleted %s waitlist entries before %s',
           v_completed_bookings, v_deleted_waitlist, p_before_date);
END;
$$;

COMMENT ON FUNCTION manual_full_cleanup IS 'Admin-only manual cleanup: marks bookings as completed (preserved for analytics) and deletes waitlist entries';

GRANT EXECUTE ON FUNCTION manual_full_cleanup TO authenticated;

-- =====================================================
-- COMMIT TRANSACTION
-- =====================================================

COMMIT;

-- =====================================================
-- POST-MIGRATION VERIFICATION
-- =====================================================

DO $$
DECLARE
  summary record;
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'DAILY CLEANUP SYSTEM INSTALLED SUCCESSFULLY!';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Changes applied:';
  RAISE NOTICE '  ✓ Added class_date column to bookings table';
  RAISE NOTICE '  ✓ Created get_next_class_datetime() function';
  RAISE NOTICE '  ✓ Created auto_set_booking_class_date trigger';
  RAISE NOTICE '  ✓ Created cleanup_past_bookings_and_waitlist() function';
  RAISE NOTICE '  ✓ Created bookings_with_class_details view';
  RAISE NOTICE '  ✓ Created get_cleanup_summary() function';
  RAISE NOTICE '  ✓ Added indexes for performance';
  RAISE NOTICE '';

  -- Show current summary
  SELECT * INTO summary FROM get_cleanup_summary();
  RAISE NOTICE 'Current System Summary:';
  RAISE NOTICE '  BOOKINGS:';
  RAISE NOTICE '    Total bookings: %', summary.total_bookings;
  RAISE NOTICE '    Confirmed (future): %', summary.confirmed_bookings;
  RAISE NOTICE '    Completed (past, preserved): %', summary.completed_bookings;
  RAISE NOTICE '    Past active (need cleanup): %', summary.past_active_bookings;
  RAISE NOTICE '    Future bookings: %', summary.future_bookings;
  RAISE NOTICE '';
  RAISE NOTICE '  WAITLIST:';
  RAISE NOTICE '    Total waitlist: %', summary.total_waitlist;
  RAISE NOTICE '    Waiting entries: %', summary.waiting_entries;
  RAISE NOTICE '    Past waitlist (need cleanup): %', summary.past_waitlist;
  RAISE NOTICE '    Future waitlist (valid): %', summary.future_waitlist;
  RAISE NOTICE '';

  RAISE NOTICE '================================================';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '================================================';
  RAISE NOTICE '1. Update cron job to use new cleanup function:';
  RAISE NOTICE '   See update_daily_cleanup_cron.sql';
  RAISE NOTICE '';
  RAISE NOTICE '2. Run initial cleanup now:';
  RAISE NOTICE '   SELECT * FROM cleanup_past_bookings_and_waitlist();';
  RAISE NOTICE '';
  RAISE NOTICE '3. Monitor cleanup log:';
  RAISE NOTICE '   SELECT * FROM waitlist_cleanup_log ORDER BY created_at DESC LIMIT 10;';
  RAISE NOTICE '';
  RAISE NOTICE '4. View bookings with status:';
  RAISE NOTICE '   SELECT * FROM bookings_with_class_details WHERE computed_status = ''PAST_CLASS'';';
  RAISE NOTICE '================================================';
END $$;
