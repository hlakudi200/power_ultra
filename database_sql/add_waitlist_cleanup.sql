-- =====================================================
-- Waitlist Cleanup System Migration
-- =====================================================
-- This migration adds automatic cleanup for waitlist entries
-- Addresses the issue: waitlists don't reset after class date passes
--
-- Problem: schedule table has day_of_week but no specific date
-- Solution: Add target_date to track which specific class occurrence
--
-- Run this AFTER create_waitlist_system.sql

BEGIN;

-- =====================================================
-- 1. Add target_date column to waitlist table
-- =====================================================

ALTER TABLE public.waitlist
ADD COLUMN IF NOT EXISTS target_date date;

COMMENT ON COLUMN public.waitlist.target_date IS 'The specific date of the class occurrence user is waitlisted for (e.g., Monday Dec 16, 2024)';

-- =====================================================
-- 2. Create function to calculate next occurrence of day_of_week
-- =====================================================

CREATE OR REPLACE FUNCTION get_next_class_date(p_day_of_week text)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  target_dow integer;
  current_dow integer;
  days_until integer;
BEGIN
  -- Convert day name to PostgreSQL day number (0=Sunday, 1=Monday, ..., 6=Saturday)
  target_dow := CASE p_day_of_week
    WHEN 'Sunday' THEN 0
    WHEN 'Monday' THEN 1
    WHEN 'Tuesday' THEN 2
    WHEN 'Wednesday' THEN 3
    WHEN 'Thursday' THEN 4
    WHEN 'Friday' THEN 5
    WHEN 'Saturday' THEN 6
    ELSE NULL
  END;

  IF target_dow IS NULL THEN
    RAISE EXCEPTION 'Invalid day_of_week: %. Must be Sunday-Saturday', p_day_of_week;
  END IF;

  -- Get current day of week
  current_dow := EXTRACT(DOW FROM CURRENT_DATE)::integer;

  -- Calculate days until next occurrence
  days_until := (target_dow - current_dow + 7) % 7;

  -- If result is 0, class is today - but user likely wants NEXT week's class
  -- So if it's 0, add 7 to get next week
  IF days_until = 0 THEN
    days_until := 7;
  END IF;

  RETURN CURRENT_DATE + days_until;
END;
$$;

COMMENT ON FUNCTION get_next_class_date IS 'Calculates the next occurrence date for a given day of week. Always returns a future date (never today).';

GRANT EXECUTE ON FUNCTION get_next_class_date TO authenticated;

-- =====================================================
-- 3. Backfill target_date for existing waitlist entries
-- =====================================================

-- For existing entries without target_date, estimate based on schedule day_of_week
UPDATE public.waitlist w
SET target_date = get_next_class_date(s.day_of_week)
FROM public.schedule s
WHERE w.schedule_id = s.id
  AND w.target_date IS NULL
  AND w.status = 'waiting';

-- =====================================================
-- 4. Create trigger to auto-set target_date on INSERT
-- =====================================================

CREATE OR REPLACE FUNCTION set_waitlist_target_date()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  class_day_of_week text;
BEGIN
  -- Only set if not already provided
  IF NEW.target_date IS NULL THEN
    -- Get day_of_week from schedule
    SELECT day_of_week INTO class_day_of_week
    FROM public.schedule
    WHERE id = NEW.schedule_id;

    -- Calculate next occurrence
    NEW.target_date := get_next_class_date(class_day_of_week);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_set_waitlist_target_date ON public.waitlist;

CREATE TRIGGER auto_set_waitlist_target_date
  BEFORE INSERT ON public.waitlist
  FOR EACH ROW
  EXECUTE FUNCTION set_waitlist_target_date();

COMMENT ON FUNCTION set_waitlist_target_date IS 'Automatically calculates and sets target_date when user joins waitlist';

-- =====================================================
-- 5. Create function to cleanup past waitlist entries
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_past_waitlists()
RETURNS TABLE(
  deleted_count integer,
  message text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count integer;
BEGIN
  -- Delete waitlist entries where target_date has passed
  WITH deleted AS (
    DELETE FROM public.waitlist
    WHERE target_date < CURRENT_DATE
      AND status IN ('waiting', 'expired')  -- Don't delete 'notified' or 'converted'
    RETURNING id
  )
  SELECT COUNT(*)::integer INTO v_deleted_count FROM deleted;

  RETURN QUERY SELECT
    v_deleted_count,
    format('Cleaned up %s past waitlist entries (target_date < %s)', v_deleted_count, CURRENT_DATE);
END;
$$;

COMMENT ON FUNCTION cleanup_past_waitlists IS 'Deletes waitlist entries for classes whose date has passed. Run daily via cron.';

GRANT EXECUTE ON FUNCTION cleanup_past_waitlists TO service_role;

-- =====================================================
-- 6. Enhanced: Cleanup expired notifications
-- =====================================================

-- Drop existing function first (it has different return type)
DROP FUNCTION IF EXISTS process_expired_waitlist_notifications();

-- Update existing function to also clean up past dates
CREATE OR REPLACE FUNCTION process_expired_waitlist_notifications()
RETURNS TABLE(
  expired_count integer,
  cleaned_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_expired_count integer;
  v_cleaned_count integer;
BEGIN
  -- 1. Mark notifications as expired if expires_at has passed
  WITH expired_entries AS (
    UPDATE public.waitlist
    SET status = 'expired',
        updated_at = now()
    WHERE status = 'notified'
      AND expires_at < now()
      AND target_date >= CURRENT_DATE  -- Only expire if class hasn't passed yet
    RETURNING id
  )
  SELECT COUNT(*)::integer INTO v_expired_count FROM expired_entries;

  -- 2. Clean up entries where target_date has passed
  WITH cleaned_entries AS (
    DELETE FROM public.waitlist
    WHERE target_date < CURRENT_DATE
      AND status IN ('waiting', 'expired')
    RETURNING id
  )
  SELECT COUNT(*)::integer INTO v_cleaned_count FROM cleaned_entries;

  RETURN QUERY SELECT v_expired_count, v_cleaned_count;
END;
$$;

COMMENT ON FUNCTION process_expired_waitlist_notifications IS 'Expires old notifications AND cleans up past class dates. Run hourly via cron.';

-- =====================================================
-- 7. Create function to get waitlist summary (for debugging)
-- =====================================================

CREATE OR REPLACE FUNCTION get_waitlist_summary()
RETURNS TABLE(
  total_entries integer,
  waiting_entries integer,
  notified_entries integer,
  expired_entries integer,
  converted_entries integer,
  past_date_entries integer,
  future_date_entries integer
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    COUNT(*)::integer as total_entries,
    COUNT(*) FILTER (WHERE status = 'waiting')::integer as waiting_entries,
    COUNT(*) FILTER (WHERE status = 'notified')::integer as notified_entries,
    COUNT(*) FILTER (WHERE status = 'expired')::integer as expired_entries,
    COUNT(*) FILTER (WHERE status = 'converted')::integer as converted_entries,
    COUNT(*) FILTER (WHERE target_date < CURRENT_DATE)::integer as past_date_entries,
    COUNT(*) FILTER (WHERE target_date >= CURRENT_DATE)::integer as future_date_entries
  FROM public.waitlist;
$$;

COMMENT ON FUNCTION get_waitlist_summary IS 'Returns summary statistics about waitlist entries for monitoring/debugging';

GRANT EXECUTE ON FUNCTION get_waitlist_summary TO authenticated;

-- =====================================================
-- 8. Update index for cleanup performance
-- =====================================================

-- Add index on target_date for faster cleanup queries
CREATE INDEX IF NOT EXISTS idx_waitlist_target_date
  ON public.waitlist(target_date)
  WHERE status IN ('waiting', 'expired');

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_waitlist_status_target_date
  ON public.waitlist(status, target_date);

-- =====================================================
-- 9. Create helper view for admin monitoring
-- =====================================================

CREATE OR REPLACE VIEW waitlist_with_class_details AS
SELECT
  w.id as waitlist_id,
  w.user_id,
  p.full_name as user_name,
  w.schedule_id,
  c.name as class_name,
  s.day_of_week,
  s.start_time,
  s.end_time,
  w.target_date,
  w.queue_position,
  w.status,
  w.notified_at,
  w.expires_at,
  w.created_at,
  -- Calculate if entry is stale
  CASE
    WHEN w.target_date < CURRENT_DATE THEN 'PAST_CLASS'
    WHEN w.status = 'notified' AND w.expires_at < now() THEN 'EXPIRED_NOTIFICATION'
    WHEN w.status = 'waiting' AND w.target_date >= CURRENT_DATE THEN 'ACTIVE'
    ELSE w.status
  END as computed_status
FROM public.waitlist w
JOIN public.profiles p ON w.user_id = p.id
JOIN public.schedule s ON w.schedule_id = s.id
JOIN public.classes c ON s.class_id = c.id;

COMMENT ON VIEW waitlist_with_class_details IS 'Admin view showing waitlist entries with class details and computed status';

-- Grant view access to admins
GRANT SELECT ON waitlist_with_class_details TO authenticated;

-- =====================================================
-- 10. Create RLS policy for the view (admin only)
-- =====================================================

-- Note: Views inherit RLS from underlying tables
-- But we can add explicit policy if needed

-- =====================================================
-- 11. Verification and testing queries
-- =====================================================

-- Test the get_next_class_date function
DO $$
DECLARE
  monday_date date;
  friday_date date;
BEGIN
  monday_date := get_next_class_date('Monday');
  friday_date := get_next_class_date('Friday');

  RAISE NOTICE 'Next Monday: %', monday_date;
  RAISE NOTICE 'Next Friday: %', friday_date;

  -- Verify Monday is actually a Monday
  IF EXTRACT(DOW FROM monday_date) != 1 THEN
    RAISE EXCEPTION 'get_next_class_date returned wrong day for Monday';
  END IF;
END $$;

-- =====================================================
-- 12. Create manual cleanup procedure (for admins)
-- =====================================================

CREATE OR REPLACE FUNCTION manual_waitlist_cleanup(
  p_before_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  deleted_waiting integer,
  deleted_expired integer,
  deleted_converted_old integer,
  total_deleted integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_waiting integer;
  v_deleted_expired integer;
  v_deleted_converted integer;
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Only admins can run manual cleanup';
  END IF;

  -- Delete waiting entries for past dates
  WITH deleted AS (
    DELETE FROM public.waitlist
    WHERE target_date < p_before_date
      AND status = 'waiting'
    RETURNING id
  )
  SELECT COUNT(*)::integer INTO v_deleted_waiting FROM deleted;

  -- Delete expired entries for past dates
  WITH deleted AS (
    DELETE FROM public.waitlist
    WHERE target_date < p_before_date
      AND status = 'expired'
    RETURNING id
  )
  SELECT COUNT(*)::integer INTO v_deleted_expired FROM deleted;

  -- Optionally delete old converted entries (keep for 30 days)
  WITH deleted AS (
    DELETE FROM public.waitlist
    WHERE target_date < p_before_date - 30  -- Keep converted for 30 days
      AND status = 'converted'
    RETURNING id
  )
  SELECT COUNT(*)::integer INTO v_deleted_converted FROM deleted;

  RETURN QUERY SELECT
    v_deleted_waiting,
    v_deleted_expired,
    v_deleted_converted,
    v_deleted_waiting + v_deleted_expired + v_deleted_converted;
END;
$$;

COMMENT ON FUNCTION manual_waitlist_cleanup IS 'Admin-only manual cleanup of waitlist entries before a specific date';

GRANT EXECUTE ON FUNCTION manual_waitlist_cleanup TO authenticated;

-- =====================================================
-- 13. Logging table for cleanup operations (optional)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.waitlist_cleanup_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cleanup_date date NOT NULL DEFAULT CURRENT_DATE,
  entries_deleted integer NOT NULL,
  cleanup_type text NOT NULL CHECK (cleanup_type IN ('automatic', 'manual')),
  performed_by uuid REFERENCES public.profiles(id),
  details jsonb,
  created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.waitlist_cleanup_log IS 'Audit log of waitlist cleanup operations';

-- Add logging to cleanup function
CREATE OR REPLACE FUNCTION cleanup_past_waitlists()
RETURNS TABLE(
  deleted_count integer,
  message text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count integer;
  v_deleted_ids uuid[];
BEGIN
  -- Delete waitlist entries where target_date has passed
  WITH deleted AS (
    DELETE FROM public.waitlist
    WHERE target_date < CURRENT_DATE
      AND status IN ('waiting', 'expired')
    RETURNING id
  )
  SELECT COUNT(*)::integer, array_agg(id) INTO v_deleted_count, v_deleted_ids FROM deleted;

  -- Log the cleanup
  INSERT INTO public.waitlist_cleanup_log (
    cleanup_date,
    entries_deleted,
    cleanup_type,
    details
  ) VALUES (
    CURRENT_DATE,
    v_deleted_count,
    'automatic',
    jsonb_build_object(
      'deleted_ids', v_deleted_ids,
      'cutoff_date', CURRENT_DATE
    )
  );

  RETURN QUERY SELECT
    v_deleted_count,
    format('Cleaned up %s past waitlist entries (target_date < %s)', v_deleted_count, CURRENT_DATE);
END;
$$;

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
  RAISE NOTICE 'WAITLIST CLEANUP SYSTEM INSTALLED SUCCESSFULLY!';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Changes applied:';
  RAISE NOTICE '  ✓ Added target_date column to waitlist table';
  RAISE NOTICE '  ✓ Created get_next_class_date() function';
  RAISE NOTICE '  ✓ Created auto_set_waitlist_target_date trigger';
  RAISE NOTICE '  ✓ Created cleanup_past_waitlists() function';
  RAISE NOTICE '  ✓ Enhanced process_expired_waitlist_notifications()';
  RAISE NOTICE '  ✓ Created waitlist_with_class_details view';
  RAISE NOTICE '  ✓ Created waitlist_cleanup_log table';
  RAISE NOTICE '  ✓ Added indexes for performance';
  RAISE NOTICE '';

  -- Show current waitlist summary
  SELECT * INTO summary FROM get_waitlist_summary();
  RAISE NOTICE 'Current Waitlist Summary:';
  RAISE NOTICE '  Total entries: %', summary.total_entries;
  RAISE NOTICE '  Waiting: %', summary.waiting_entries;
  RAISE NOTICE '  Notified: %', summary.notified_entries;
  RAISE NOTICE '  Expired: %', summary.expired_entries;
  RAISE NOTICE '  Converted: %', summary.converted_entries;
  RAISE NOTICE '  Past date (need cleanup): %', summary.past_date_entries;
  RAISE NOTICE '  Future date (valid): %', summary.future_date_entries;
  RAISE NOTICE '';

  RAISE NOTICE '================================================';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '================================================';
  RAISE NOTICE '1. Set up cron job to run cleanup_past_waitlists() daily';
  RAISE NOTICE '   See setup_waitlist_cron_jobs.sql for details';
  RAISE NOTICE '';
  RAISE NOTICE '2. Set up cron job to run process_expired_waitlist_notifications() hourly';
  RAISE NOTICE '   See setup_waitlist_cron_jobs.sql for details';
  RAISE NOTICE '';
  RAISE NOTICE '3. Run initial cleanup if needed:';
  RAISE NOTICE '   SELECT * FROM cleanup_past_waitlists();';
  RAISE NOTICE '';
  RAISE NOTICE '4. Monitor cleanup log:';
  RAISE NOTICE '   SELECT * FROM waitlist_cleanup_log ORDER BY created_at DESC LIMIT 10;';
  RAISE NOTICE '';
  RAISE NOTICE '5. View detailed waitlist info:';
  RAISE NOTICE '   SELECT * FROM waitlist_with_class_details WHERE computed_status = PAST_CLASS';
  RAISE NOTICE '================================================';
END $$;
