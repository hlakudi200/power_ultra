-- =====================================================
-- Debug Waitlist Cleanup - Diagnostic Script
-- =====================================================
-- This script helps identify why cleanup is not deleting entries

-- =====================================================
-- Step 1: Check current waitlist entries
-- =====================================================

DO $$
DECLARE
  total_count integer;
  past_count integer;
  null_date_count integer;
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'WAITLIST CLEANUP DIAGNOSTIC';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';

  -- Count all entries
  SELECT COUNT(*) INTO total_count FROM public.waitlist;
  RAISE NOTICE 'Total waitlist entries: %', total_count;

  -- Count past entries
  SELECT COUNT(*) INTO past_count
  FROM public.waitlist
  WHERE target_date < CURRENT_DATE;
  RAISE NOTICE 'Entries with past target_date: %', past_count;

  -- Count entries with NULL target_date
  SELECT COUNT(*) INTO null_date_count
  FROM public.waitlist
  WHERE target_date IS NULL;
  RAISE NOTICE 'Entries with NULL target_date: %', null_date_count;

  RAISE NOTICE '';
END $$;

-- =====================================================
-- Step 2: Show sample waitlist entries with details
-- =====================================================

SELECT
  w.id,
  w.status,
  w.target_date,
  w.created_at,
  CASE
    WHEN w.target_date IS NULL THEN 'NULL_DATE'
    WHEN w.target_date < CURRENT_DATE THEN 'PAST'
    WHEN w.target_date = CURRENT_DATE THEN 'TODAY'
    WHEN w.target_date > CURRENT_DATE THEN 'FUTURE'
  END as date_category,
  CURRENT_DATE as today,
  (w.target_date - CURRENT_DATE) as days_difference,
  s.day_of_week,
  c.name as class_name
FROM public.waitlist w
JOIN public.schedule s ON w.schedule_id = s.id
JOIN public.classes c ON s.class_id = c.id
ORDER BY w.target_date NULLS FIRST, w.created_at DESC
LIMIT 10;

-- =====================================================
-- Step 3: Check cleanup function behavior
-- =====================================================

DO $$
DECLARE
  past_entries_before integer;
  past_entries_after integer;
  cleanup_result record;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'TESTING CLEANUP FUNCTION';
  RAISE NOTICE '================================================';

  -- Count past entries before cleanup
  SELECT COUNT(*) INTO past_entries_before
  FROM public.waitlist
  WHERE target_date < CURRENT_DATE
    AND status IN ('waiting', 'expired');

  RAISE NOTICE 'Past entries (waiting/expired) BEFORE cleanup: %', past_entries_before;

  -- Run cleanup
  SELECT * INTO cleanup_result FROM cleanup_past_waitlists();

  RAISE NOTICE 'Cleanup function returned:';
  RAISE NOTICE '  Deleted count: %', cleanup_result.deleted_count;
  RAISE NOTICE '  Message: %', cleanup_result.message;

  -- Count past entries after cleanup
  SELECT COUNT(*) INTO past_entries_after
  FROM public.waitlist
  WHERE target_date < CURRENT_DATE
    AND status IN ('waiting', 'expired');

  RAISE NOTICE 'Past entries (waiting/expired) AFTER cleanup: %', past_entries_after;

  IF past_entries_before > 0 AND past_entries_after > 0 THEN
    RAISE WARNING 'Cleanup did not delete all eligible entries!';
  ELSIF past_entries_before = 0 THEN
    RAISE NOTICE '✓ No past entries to clean up';
  ELSE
    RAISE NOTICE '✓ Cleanup successful';
  END IF;

  RAISE NOTICE '';
END $$;

-- =====================================================
-- Step 4: Check entries by status breakdown
-- =====================================================

DO $$
DECLARE
  r record;
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'WAITLIST ENTRIES BY STATUS';
  RAISE NOTICE '================================================';

  FOR r IN
    SELECT
      status,
      COUNT(*) as count,
      COUNT(*) FILTER (WHERE target_date < CURRENT_DATE) as past_count,
      COUNT(*) FILTER (WHERE target_date IS NULL) as null_date_count,
      COUNT(*) FILTER (WHERE target_date >= CURRENT_DATE) as future_count
    FROM public.waitlist
    GROUP BY status
    ORDER BY status
  LOOP
    RAISE NOTICE 'Status: %', r.status;
    RAISE NOTICE '  Total: %', r.count;
    RAISE NOTICE '  Past dates: %', r.past_count;
    RAISE NOTICE '  NULL dates: %', r.null_date_count;
    RAISE NOTICE '  Future dates: %', r.future_count;
  END LOOP;

  RAISE NOTICE '';
END $$;

-- =====================================================
-- Step 5: Show entries that SHOULD be deleted
-- =====================================================

SELECT
  'SHOULD BE DELETED' as note,
  w.id,
  w.status,
  w.target_date,
  w.created_at,
  p.full_name as user_name,
  c.name as class_name,
  s.day_of_week
FROM public.waitlist w
JOIN public.profiles p ON w.user_id = p.id
JOIN public.schedule s ON w.schedule_id = s.id
JOIN public.classes c ON s.class_id = c.id
WHERE w.target_date < CURRENT_DATE
  AND w.status IN ('waiting', 'expired')
ORDER BY w.target_date;

-- =====================================================
-- Step 6: Check if target_date column has values
-- =====================================================

DO $$
DECLARE
  has_nulls boolean;
  min_date date;
  max_date date;
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'TARGET_DATE COLUMN ANALYSIS';
  RAISE NOTICE '================================================';

  SELECT EXISTS(SELECT 1 FROM public.waitlist WHERE target_date IS NULL)
  INTO has_nulls;

  IF has_nulls THEN
    RAISE WARNING 'Some entries have NULL target_date - these will not be cleaned up!';
  ELSE
    RAISE NOTICE '✓ All entries have target_date set';
  END IF;

  SELECT MIN(target_date), MAX(target_date)
  INTO min_date, max_date
  FROM public.waitlist;

  RAISE NOTICE 'Earliest target_date: %', min_date;
  RAISE NOTICE 'Latest target_date: %', max_date;
  RAISE NOTICE 'Today: %', CURRENT_DATE;
  RAISE NOTICE '';
END $$;

-- =====================================================
-- Step 7: Test cleanup query directly
-- =====================================================

DO $$
DECLARE
  deleted_count integer;
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'DIRECT DELETE TEST (DRY RUN - COUNT ONLY)';
  RAISE NOTICE '================================================';

  -- Count what WOULD be deleted
  SELECT COUNT(*) INTO deleted_count
  FROM public.waitlist
  WHERE target_date < CURRENT_DATE
    AND status IN ('waiting', 'expired');

  RAISE NOTICE 'Would delete: % entries', deleted_count;
  RAISE NOTICE '';

  IF deleted_count = 0 THEN
    RAISE NOTICE 'Explanation: No entries match deletion criteria:';
    RAISE NOTICE '  - target_date < CURRENT_DATE (%)' , CURRENT_DATE;
    RAISE NOTICE '  - AND status IN (''waiting'', ''expired'')';
  END IF;
END $$;

-- =====================================================
-- Step 8: Check cleanup log
-- =====================================================

SELECT
  cleanup_date,
  entries_deleted,
  cleanup_type,
  created_at,
  details
FROM public.waitlist_cleanup_log
ORDER BY created_at DESC
LIMIT 10;

-- =====================================================
-- FINAL SUMMARY
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'DIAGNOSTIC COMPLETE';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Common Issues:';
  RAISE NOTICE '1. Entries have NULL target_date (need backfill)';
  RAISE NOTICE '2. Entries have status other than waiting/expired';
  RAISE NOTICE '3. All target_dates are in the future';
  RAISE NOTICE '4. Permissions issue (function not running with correct privileges)';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '- Review the output above to identify the issue';
  RAISE NOTICE '- Check if target_date needs backfilling';
  RAISE NOTICE '- Verify entry statuses';
  RAISE NOTICE '================================================';
END $$;
