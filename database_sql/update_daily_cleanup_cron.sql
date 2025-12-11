-- =====================================================
-- Update Cron Jobs for Daily Booking & Waitlist Cleanup
-- =====================================================
-- This script updates the cron job to clean BOTH bookings and waitlist daily
--
-- Prerequisites:
-- - pg_cron extension must be enabled
-- - add_daily_booking_cleanup.sql must be run first
--
-- Run this AFTER add_daily_booking_cleanup.sql

-- =====================================================
-- 1. Remove old waitlist-only cleanup job
-- =====================================================

DO $$
BEGIN
  PERFORM cron.unschedule('daily-waitlist-cleanup');
EXCEPTION
  WHEN OTHERS THEN
    NULL; -- Job doesn't exist, ignore error
END $$;

-- =====================================================
-- 2. Create new comprehensive daily cleanup job (2 AM)
-- =====================================================

SELECT cron.schedule(
  'daily-booking-waitlist-cleanup',
  '0 2 * * *',  -- Every day at 2:00 AM
  $$
  SELECT cleanup_past_bookings_and_waitlist();
  $$
);

-- =====================================================
-- 3. Keep hourly expiry job (unchanged)
-- =====================================================

DO $$
BEGIN
  PERFORM cron.unschedule('hourly-waitlist-expiry');
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

SELECT cron.schedule(
  'hourly-waitlist-expiry',
  '0 * * * *',  -- Every hour at :00
  $$
  SELECT process_expired_waitlist_notifications();
  $$
);

-- =====================================================
-- 4. Update weekly report job
-- =====================================================

DO $$
BEGIN
  PERFORM cron.unschedule('weekly-waitlist-report');
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

SELECT cron.schedule(
  'weekly-system-report',
  '0 9 * * 1',  -- Every Monday at 9:00 AM
  $$
  -- Log the weekly summary with both bookings and waitlist stats
  INSERT INTO waitlist_cleanup_log (
    cleanup_date,
    entries_deleted,
    cleanup_type,
    details
  )
  SELECT
    CURRENT_DATE,
    0,
    'weekly_report',
    jsonb_build_object(
      'total_bookings', total_bookings,
      'confirmed_bookings', confirmed_bookings,
      'past_bookings', past_bookings,
      'total_waitlist', total_waitlist,
      'waiting_entries', waiting_entries,
      'past_waitlist', past_waitlist,
      'report_date', CURRENT_DATE
    )
  FROM get_cleanup_summary();
  $$
);

-- =====================================================
-- 5. Verification: List all cron jobs
-- =====================================================

SELECT
  jobid,
  jobname,
  schedule,
  active,
  database
FROM cron.job
WHERE jobname LIKE '%waitlist%' OR jobname LIKE '%booking%' OR jobname LIKE '%system%'
ORDER BY jobid;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'CRON JOBS UPDATED SUCCESSFULLY!';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Scheduled Jobs:';
  RAISE NOTICE '  1. daily-booking-waitlist-cleanup (NEW!)';
  RAISE NOTICE '     Schedule: Every day at 2:00 AM';
  RAISE NOTICE '     Action: Deletes BOTH bookings AND waitlist for past classes';
  RAISE NOTICE '';
  RAISE NOTICE '  2. hourly-waitlist-expiry';
  RAISE NOTICE '     Schedule: Every hour';
  RAISE NOTICE '     Action: Expires notifications after 24 hours';
  RAISE NOTICE '';
  RAISE NOTICE '  3. weekly-system-report';
  RAISE NOTICE '     Schedule: Every Monday at 9:00 AM';
  RAISE NOTICE '     Action: Logs weekly summary of bookings + waitlist';
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'To monitor cron jobs:';
  RAISE NOTICE '  SELECT * FROM cron.job WHERE jobname LIKE %%booking%% OR jobname LIKE %%waitlist%%;';
  RAISE NOTICE '';
  RAISE NOTICE 'To view job execution history:';
  RAISE NOTICE '  SELECT * FROM cron.job_run_details';
  RAISE NOTICE '  WHERE jobid IN (';
  RAISE NOTICE '    SELECT jobid FROM cron.job';
  RAISE NOTICE '    WHERE jobname LIKE %%booking%% OR jobname LIKE %%waitlist%%';
  RAISE NOTICE '  )';
  RAISE NOTICE '  ORDER BY start_time DESC LIMIT 20;';
  RAISE NOTICE '================================================';
END $$;
