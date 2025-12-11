-- =====================================================
-- Check Bookings vs Waitlist Status
-- =====================================================
-- This script helps identify what's in bookings table vs waitlist table

-- =====================================================
-- 1. Check bookings table
-- =====================================================

SELECT
  'BOOKINGS TABLE' as table_name,
  COUNT(*) as total_count,
  COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed_count,
  COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_count
FROM public.bookings;

-- =====================================================
-- 2. Check waitlist table
-- =====================================================

SELECT
  'WAITLIST TABLE' as table_name,
  COUNT(*) as total_count,
  COUNT(*) FILTER (WHERE status = 'waiting') as waiting_count,
  COUNT(*) FILTER (WHERE status = 'notified') as notified_count,
  COUNT(*) FILTER (WHERE status = 'converted') as converted_count,
  COUNT(*) FILTER (WHERE status = 'expired') as expired_count,
  COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count
FROM public.waitlist;

-- =====================================================
-- 3. Show recent bookings with class details
-- =====================================================

SELECT
  'RECENT BOOKINGS' as section,
  b.id as booking_id,
  p.full_name as user_name,
  c.name as class_name,
  s.day_of_week,
  s.start_time,
  b.status as booking_status,
  b.created_at as booked_at
FROM public.bookings b
JOIN public.profiles p ON b.user_id = p.id
JOIN public.schedule s ON b.schedule_id = s.id
JOIN public.classes c ON s.class_id = c.id
ORDER BY b.created_at DESC
LIMIT 10;

-- =====================================================
-- 4. Check class capacity vs bookings
-- =====================================================

SELECT
  c.name as class_name,
  s.day_of_week,
  s.start_time,
  s.max_capacity,
  COUNT(b.id) FILTER (WHERE b.status = 'confirmed') as confirmed_bookings,
  s.max_capacity - COUNT(b.id) FILTER (WHERE b.status = 'confirmed') as available_spots,
  CASE
    WHEN COUNT(b.id) FILTER (WHERE b.status = 'confirmed') >= s.max_capacity THEN 'FULL'
    WHEN COUNT(b.id) FILTER (WHERE b.status = 'confirmed') >= s.max_capacity * 0.8 THEN 'NEARLY_FULL'
    ELSE 'AVAILABLE'
  END as capacity_status
FROM public.schedule s
JOIN public.classes c ON s.class_id = c.id
LEFT JOIN public.bookings b ON s.id = b.schedule_id
WHERE s.is_cancelled = false
GROUP BY c.name, s.day_of_week, s.start_time, s.max_capacity, s.id
ORDER BY s.day_of_week, s.start_time;

-- =====================================================
-- 5. Identify classes that should have waitlist entries
-- =====================================================

WITH full_classes AS (
  SELECT
    s.id as schedule_id,
    c.name as class_name,
    s.day_of_week,
    s.start_time,
    s.max_capacity,
    COUNT(b.id) FILTER (WHERE b.status = 'confirmed') as confirmed_bookings
  FROM public.schedule s
  JOIN public.classes c ON s.class_id = c.id
  LEFT JOIN public.bookings b ON s.id = b.schedule_id
  WHERE s.is_cancelled = false
  GROUP BY s.id, c.name, s.day_of_week, s.start_time, s.max_capacity
  HAVING COUNT(b.id) FILTER (WHERE b.status = 'confirmed') >= s.max_capacity
)
SELECT
  fc.*,
  COALESCE(COUNT(w.id), 0) as waitlist_count
FROM full_classes fc
LEFT JOIN public.waitlist w ON fc.schedule_id = w.schedule_id AND w.status IN ('waiting', 'notified')
GROUP BY fc.schedule_id, fc.class_name, fc.day_of_week, fc.start_time, fc.max_capacity, fc.confirmed_bookings;

-- =====================================================
-- 6. Summary analysis
-- =====================================================

DO $$
DECLARE
  booking_count integer;
  waitlist_count integer;
  full_class_count integer;
BEGIN
  SELECT COUNT(*) INTO booking_count FROM public.bookings WHERE status = 'confirmed';
  SELECT COUNT(*) INTO waitlist_count FROM public.waitlist WHERE status IN ('waiting', 'notified');

  SELECT COUNT(DISTINCT s.id) INTO full_class_count
  FROM public.schedule s
  LEFT JOIN public.bookings b ON s.id = b.schedule_id
  WHERE s.is_cancelled = false
  GROUP BY s.id, s.max_capacity
  HAVING COUNT(b.id) FILTER (WHERE b.status = 'confirmed') >= s.max_capacity;

  RAISE NOTICE '================================================';
  RAISE NOTICE 'DATABASE ANALYSIS SUMMARY';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Total confirmed bookings: %', booking_count;
  RAISE NOTICE 'Total active waitlist entries: %', waitlist_count;
  RAISE NOTICE 'Number of full classes: %', full_class_count;
  RAISE NOTICE '';

  IF full_class_count > 0 AND waitlist_count = 0 THEN
    RAISE WARNING 'ISSUE DETECTED: Classes are full but no one is on the waitlist!';
    RAISE NOTICE 'This suggests the waitlist feature may not be working correctly.';
  ELSIF waitlist_count > 0 THEN
    RAISE NOTICE '✓ Waitlist system appears to be in use';
  ELSE
    RAISE NOTICE 'No full classes found - waitlist system not needed yet';
  END IF;

  RAISE NOTICE '================================================';
END $$;
