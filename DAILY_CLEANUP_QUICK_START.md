# Quick Start: Daily Booking & Waitlist Cleanup

## Problem Solved
Bookings and waitlist entries accumulate forever, making classes appear permanently full even after they've occurred.

## Solution
Automatic daily cleanup at 2 AM that removes:
- **Bookings** for classes that have already happened
- **Waitlist entries** for past classes
- This "resets" the schedule daily so users can book fresh

---

## Installation (3 Steps - 5 Minutes)

### Step 1: Run Main Migration

1. Open **Supabase Dashboard** → **SQL Editor**
2. Click **"New Query"**
3. Copy and paste: `database_sql/add_daily_booking_cleanup.sql`
4. Click **"Run"**

**Expected Output:**
```
✓ Added class_date column to bookings
✓ Created cleanup functions
✓ Created monitoring views
✓ Migration completed!

Current System Summary:
  BOOKINGS:
    Past bookings (need cleanup): 25
  WAITLIST:
    Past waitlist (need cleanup): 8
```

### Step 2: Update Cron Jobs

1. Click **"New Query"**
2. Copy and paste: `database_sql/update_daily_cleanup_cron.sql`
3. Click **"Run"**

**Expected Output:**
```
✓ Cron job 'daily-booking-waitlist-cleanup' scheduled (2 AM daily)
✓ System ready!
```

### Step 3: Run Initial Cleanup NOW

Don't wait until 2 AM - clean up existing past entries immediately:

```sql
SELECT * FROM cleanup_past_bookings_and_waitlist();
```

**Expected Output:**
```
bookings_deleted | waitlist_deleted | message
-----------------|------------------|----------------------------------
              25 |                8 | Daily cleanup: Deleted 25 bookings...
```

---

## Done! 🎉

Your system now:
- ✅ Cleans up bookings for past classes daily at 2 AM
- ✅ Cleans up waitlist entries daily at 2 AM
- ✅ "Resets" the schedule automatically
- ✅ Users can book the next occurrence of recurring classes
- ✅ Logs all cleanup operations

---

## How It Works

### Before Cleanup
```
Monday Yoga class:
- Bookings for Dec 2, Dec 9, Dec 16 all exist
- Class appears full because total bookings > capacity
- Users can't book even though Dec 2 and Dec 9 have passed
```

### After Cleanup (Daily at 2 AM)
```
Monday Yoga class:
- Bookings for Dec 2, Dec 9 are DELETED
- Only Dec 16 bookings remain
- Users can now book for Dec 23 (next Monday)
```

---

## Monitoring

### Check cleanup status:
```sql
SELECT * FROM get_cleanup_summary();
```

**Output:**
```
total_bookings | past_bookings | total_waitlist | past_waitlist
---------------|---------------|----------------|---------------
          156  |             0 |             12 |             0
```

**Healthy System:** `past_bookings` and `past_waitlist` should be 0 or very low.

### View cleanup history:
```sql
SELECT
  cleanup_date,
  details->>'bookings_deleted' as bookings,
  details->>'waitlist_deleted' as waitlist,
  cleanup_type,
  created_at
FROM waitlist_cleanup_log
WHERE cleanup_type = 'automatic'
ORDER BY created_at DESC
LIMIT 7;
```

**Example:**
```
cleanup_date | bookings | waitlist | cleanup_type | created_at
-------------|----------|----------|--------------|------------------
2024-12-17   | 15       | 3        | automatic    | 2024-12-17 02:00
2024-12-16   | 22       | 5        | automatic    | 2024-12-16 02:00
```

### View entries that will be cleaned tomorrow:
```sql
-- Bookings to be cleaned
SELECT * FROM bookings_with_class_details
WHERE computed_status = 'PAST_CLASS';

-- Waitlist to be cleaned
SELECT * FROM waitlist_with_class_details
WHERE computed_status = 'PAST_CLASS';
```

---

## Testing the Cleanup

### Test manually before waiting for 2 AM:

```sql
-- 1. Check what will be deleted
SELECT * FROM get_cleanup_summary();

-- 2. Run cleanup manually
SELECT * FROM cleanup_past_bookings_and_waitlist();

-- 3. Verify cleanup worked
SELECT * FROM get_cleanup_summary();
-- past_bookings and past_waitlist should now be 0

-- 4. Check the log
SELECT * FROM waitlist_cleanup_log ORDER BY created_at DESC LIMIT 1;
```

---

## Verify Cron Jobs Are Running

After 24-48 hours, check if automatic cleanup is working:

```sql
-- View recent automatic cleanups
SELECT
  cleanup_date,
  details->>'bookings_deleted' as bookings_deleted,
  details->>'waitlist_deleted' as waitlist_deleted,
  cleanup_type,
  created_at
FROM waitlist_cleanup_log
WHERE cleanup_type = 'automatic'
ORDER BY created_at DESC
LIMIT 5;
```

**If you see entries with `cleanup_type = 'automatic'`**, the cron job is working! ✅

---

## Admin Tools

### Manual Cleanup (Admin Only)
```sql
-- Clean up everything before a specific date
SELECT * FROM manual_full_cleanup('2024-12-10');
```

### Check Cron Job Status
```sql
SELECT
  jobname,
  schedule,
  active,
  last_run_status
FROM cron.job
WHERE jobname LIKE '%booking%' OR jobname LIKE '%waitlist%';
```

---

## Troubleshooting

### Issue: Past bookings not cleaning up
**Solution:**
```sql
-- Check if class_date column has values
SELECT
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE class_date IS NULL) as null_dates
FROM bookings;

-- If many null_dates, run backfill:
UPDATE bookings b
SET class_date = get_next_class_date(s.day_of_week)
FROM schedule s
WHERE b.schedule_id = s.id AND b.class_date IS NULL;
```

### Issue: Cron job not running
**Check:**
```sql
SELECT * FROM cron.job_run_details
WHERE jobid IN (
  SELECT jobid FROM cron.job WHERE jobname = 'daily-booking-waitlist-cleanup'
)
ORDER BY start_time DESC LIMIT 5;
```

**If no results:** pg_cron might not be enabled. Run cleanup manually or use Edge Functions.

---

## Next Steps

1. ✅ Run `add_daily_booking_cleanup.sql`
2. ✅ Run `update_daily_cleanup_cron.sql`
3. ✅ Run initial cleanup: `SELECT * FROM cleanup_past_bookings_and_waitlist();`
4. ⏰ Wait 24 hours
5. 📊 Check `waitlist_cleanup_log` to verify automatic cleanup ran
6. 🎯 Monitor `get_cleanup_summary()` daily

---

## Files Reference

1. **add_daily_booking_cleanup.sql** - Main migration (run first)
2. **update_daily_cleanup_cron.sql** - Update cron jobs (run second)
3. **DAILY_CLEANUP_QUICK_START.md** - This guide
4. **check_bookings_vs_waitlist.sql** - Diagnostic tool

---

## Support

Need help? Check:
- `SELECT * FROM get_cleanup_summary();` - System status
- `SELECT * FROM waitlist_cleanup_log ORDER BY created_at DESC;` - Cleanup history
- `SELECT * FROM bookings_with_class_details WHERE computed_status = 'PAST_CLASS';` - What needs cleanup
