-- =====================================================
-- Setup Cron Jobs for Waitlist Cleanup
-- =====================================================
-- This script sets up automated cron jobs to:
-- 1. Clean up past waitlist entries daily
-- 2. Expire old notifications hourly
--
-- Prerequisites:
-- - pg_cron extension must be enabled in Supabase
-- - add_waitlist_cleanup.sql must be run first
--
-- Run this AFTER add_waitlist_cleanup.sql

-- =====================================================
-- 1. Enable pg_cron extension
-- =====================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- =====================================================
-- 2. Setup Daily Cleanup Job (2 AM)
-- =====================================================

-- Remove existing job if it exists
DO $$
BEGIN
  PERFORM cron.unschedule('daily-waitlist-cleanup');
EXCEPTION
  WHEN OTHERS THEN
    NULL; -- Job doesn't exist, ignore error
END $$;

-- Schedule daily cleanup at 2 AM
SELECT cron.schedule(
  'daily-waitlist-cleanup',
  '0 2 * * *',  -- Every day at 2:00 AM
  $$
  SELECT cleanup_past_waitlists();
  $$
);

-- =====================================================
-- 3. Setup Hourly Notification Expiry Job
-- =====================================================

-- Remove existing job if it exists
DO $$
BEGIN
  PERFORM cron.unschedule('hourly-waitlist-expiry');
EXCEPTION
  WHEN OTHERS THEN
    NULL; -- Job doesn't exist, ignore error
END $$;

-- Schedule hourly check for expired notifications
SELECT cron.schedule(
  'hourly-waitlist-expiry',
  '0 * * * *',  -- Every hour at :00
  $$
  SELECT process_expired_waitlist_notifications();
  $$
);

-- =====================================================
-- 4. Setup Weekly Cleanup Report (Optional)
-- =====================================================

-- Remove existing job if it exists
DO $$
BEGIN
  PERFORM cron.unschedule('weekly-waitlist-report');
EXCEPTION
  WHEN OTHERS THEN
    NULL; -- Job doesn't exist, ignore error
END $$;

-- Schedule weekly summary (Mondays at 9 AM)
SELECT cron.schedule(
  'weekly-waitlist-report',
  '0 9 * * 1',  -- Every Monday at 9:00 AM
  $$
  -- Log the weekly summary
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
      'total_entries', total_entries,
      'waiting_entries', waiting_entries,
      'past_date_entries', past_date_entries,
      'report_date', CURRENT_DATE
    )
  FROM get_waitlist_summary();
  $$
);

-- =====================================================
-- 5. Verification: List all cron jobs
-- =====================================================

SELECT
  jobid,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active
FROM cron.job
WHERE jobname LIKE '%waitlist%'
ORDER BY jobid;

-- =====================================================
-- 6. Manual trigger for testing (commented out)
-- =====================================================

-- Test daily cleanup manually:
-- SELECT * FROM cleanup_past_waitlists();

-- Test hourly expiry manually:
-- SELECT * FROM process_expired_waitlist_notifications();

-- View cron job history:
-- SELECT * FROM cron.job_run_details
-- WHERE jobid IN (
--   SELECT jobid FROM cron.job WHERE jobname LIKE '%waitlist%'
-- )
-- ORDER BY start_time DESC
-- LIMIT 20;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'CRON JOBS CONFIGURED SUCCESSFULLY!';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Scheduled Jobs:';
  RAISE NOTICE '  1. daily-waitlist-cleanup';
  RAISE NOTICE '     Schedule: Every day at 2:00 AM';
  RAISE NOTICE '     Action: Deletes waitlist entries for past classes';
  RAISE NOTICE '';
  RAISE NOTICE '  2. hourly-waitlist-expiry';
  RAISE NOTICE '     Schedule: Every hour';
  RAISE NOTICE '     Action: Expires notifications after 24 hours';
  RAISE NOTICE '';
  RAISE NOTICE '  3. weekly-waitlist-report';
  RAISE NOTICE '     Schedule: Every Monday at 9:00 AM';
  RAISE NOTICE '     Action: Logs weekly waitlist summary';
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'To monitor cron jobs:';
  RAISE NOTICE '  SELECT * FROM cron.job WHERE jobname LIKE %%waitlist%%;';
  RAISE NOTICE '';
  RAISE NOTICE 'To view job execution history:';
  RAISE NOTICE '  SELECT * FROM cron.job_run_details';
  RAISE NOTICE '  WHERE jobid IN (';
  RAISE NOTICE '    SELECT jobid FROM cron.job WHERE jobname LIKE %%waitlist%%';
  RAISE NOTICE '  )';
  RAISE NOTICE '  ORDER BY start_time DESC LIMIT 20;';
  RAISE NOTICE '================================================';
END $$;
