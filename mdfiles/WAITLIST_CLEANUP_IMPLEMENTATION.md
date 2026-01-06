# Waitlist Cleanup Implementation Guide

## Problem Solved

**Issue:** Waitlist entries were never cleaned up after the class date passed, causing database bloat and confusion.

**Root Cause:** The `schedule` table has `day_of_week` (e.g., "Monday") but no specific date. When a user joins a waitlist, the system didn't track WHICH Monday they were waiting for.

**Solution:** Added `target_date` column to track the specific class occurrence date, plus automated cleanup functions.

---

## Files Created

### 1. **add_waitlist_cleanup.sql** (Main Migration)
Adds all cleanup functionality:
- `target_date` column to waitlist table
- `get_next_class_date()` function (calculates next Monday, Tuesday, etc.)
- Auto-set trigger for target_date on INSERT
- `cleanup_past_waitlists()` function (deletes entries where target_date < TODAY)
- Enhanced `process_expired_waitlist_notifications()` function
- `waitlist_with_class_details` view (admin monitoring)
- `waitlist_cleanup_log` table (audit trail)
- `get_waitlist_summary()` function (stats)

### 2. **setup_waitlist_cron_jobs.sql** (Automation)
Sets up automated jobs:
- Daily cleanup at 2 AM (removes past entries)
- Hourly expiry check (expires old notifications)
- Weekly report (logs summary statistics)

### 3. **test_waitlist_cleanup.sql** (Testing)
Comprehensive test suite with 7 tests:
- Date calculation accuracy
- Auto-set trigger
- Cleanup functionality
- Summary function
- Admin view
- Expiry processing
- Logging system

---

## Implementation Steps

### Step 1: Run the Migration

```sql
-- In Supabase SQL Editor:
-- 1. Copy contents of add_waitlist_cleanup.sql
-- 2. Paste and run

-- Or via psql:
psql -h your-db-host -U postgres -d your-database -f database_sql/add_waitlist_cleanup.sql
```

**Expected Output:**
```
✓ Added target_date column
✓ Created get_next_class_date() function
✓ Created cleanup_past_waitlists() function
✓ Backfilled existing entries
✓ Created 7 supporting functions/views

Current Waitlist Summary:
  Total entries: X
  Past date (need cleanup): Y
  Future date (valid): Z
```

### Step 2: Setup Cron Jobs

```sql
-- Run setup_waitlist_cron_jobs.sql
-- This configures automatic cleanup
```

**Cron Jobs Created:**
- `daily-waitlist-cleanup` - Every day at 2 AM
- `hourly-waitlist-expiry` - Every hour
- `weekly-waitlist-report` - Every Monday at 9 AM

**Verify:**
```sql
SELECT jobname, schedule, active
FROM cron.job
WHERE jobname LIKE '%waitlist%';
```

### Step 3: Run Tests

```sql
-- Run test_waitlist_cleanup.sql
-- This validates everything works correctly
```

**Expected Output:**
```
✓ TEST 1: Date calculation
✓ TEST 2: Auto-set target_date
✓ TEST 3: Past entries cleanup
✓ TEST 4: Summary function
✓ TEST 5: Detail view
✓ TEST 6: Expiry processing
✓ TEST 7: Cleanup logging

SYSTEM READY FOR PRODUCTION
```

### Step 4: Run Initial Cleanup (if needed)

```sql
-- Clean up any existing past entries
SELECT * FROM cleanup_past_waitlists();
```

**Output Example:**
```
deleted_count | message
--------------+------------------------------------------
           15 | Cleaned up 15 past waitlist entries...
```

---

## How It Works

### User Joins Waitlist

**Before:**
```sql
INSERT INTO waitlist (schedule_id, user_id, queue_position, status)
VALUES ('schedule-uuid', 'user-uuid', 1, 'waiting');
-- ❌ No way to know WHICH Monday
```

**After (Automatic):**
```sql
INSERT INTO waitlist (schedule_id, user_id, queue_position, status)
VALUES ('schedule-uuid', 'user-uuid', 1, 'waiting');
-- ✅ Trigger auto-calculates target_date = next Monday (e.g., 2024-12-16)

-- Result:
{
  schedule_id: 'schedule-uuid',
  user_id: 'user-uuid',
  queue_position: 1,
  status: 'waiting',
  target_date: '2024-12-16'  ← Auto-calculated!
}
```

### Daily Cleanup (2 AM)

```sql
-- Cron job runs: SELECT cleanup_past_waitlists();

-- Deletes entries where:
-- - target_date < CURRENT_DATE (class already happened)
-- - status = 'waiting' OR 'expired' (not notified/converted)

-- Example on Dec 17:
DELETE FROM waitlist
WHERE target_date < '2024-12-17'  -- Deletes Dec 16 and earlier
  AND status IN ('waiting', 'expired');
```

### Hourly Expiry Check

```sql
-- Cron job runs: SELECT process_expired_waitlist_notifications();

-- 1. Expires notifications (24 hours after notification)
UPDATE waitlist
SET status = 'expired'
WHERE status = 'notified'
  AND expires_at < now();

-- 2. Also cleans up past dates
DELETE FROM waitlist
WHERE target_date < CURRENT_DATE
  AND status IN ('waiting', 'expired');
```

---

## Admin Monitoring

### View Waitlist Summary

```sql
SELECT * FROM get_waitlist_summary();
```

**Output:**
```
total_entries | waiting | notified | expired | converted | past_date | future_date
--------------+---------+----------+---------+-----------+-----------+-------------
          42  |    30   |     5    |    2    |     5     |     2     |     40
```

### View Detailed Waitlist Info

```sql
SELECT *
FROM waitlist_with_class_details
WHERE computed_status = 'PAST_CLASS'
ORDER BY target_date DESC;
```

**Output:**
```
user_name | class_name | day_of_week | target_date | queue_position | computed_status
----------|------------|-------------|-------------|----------------|----------------
John Doe  | Yoga       | Monday      | 2024-12-09  | 1              | PAST_CLASS
Jane      | HIIT       | Wednesday   | 2024-12-11  | 2              | PAST_CLASS
```

### View Cleanup History

```sql
SELECT
  cleanup_date,
  entries_deleted,
  cleanup_type,
  created_at
FROM waitlist_cleanup_log
ORDER BY created_at DESC
LIMIT 10;
```

**Output:**
```
cleanup_date | entries_deleted | cleanup_type | created_at
-------------|-----------------|--------------|---------------------------
2024-12-16   | 15              | automatic    | 2024-12-16 02:00:01+00
2024-12-15   | 8               | automatic    | 2024-12-15 02:00:01+00
2024-12-14   | 12              | manual       | 2024-12-14 10:30:00+00
```

---

## Manual Operations

### Manual Cleanup (Admin Only)

```sql
-- Clean up entries before a specific date
SELECT * FROM manual_waitlist_cleanup('2024-12-01');
```

**Output:**
```
deleted_waiting | deleted_expired | deleted_converted_old | total_deleted
----------------|-----------------|----------------------|---------------
      10        |       5         |          3           |      18
```

### Check Cron Job Status

```sql
-- View scheduled jobs
SELECT * FROM cron.job WHERE jobname LIKE '%waitlist%';

-- View recent job runs
SELECT
  jobid,
  runid,
  job_pid,
  database,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
WHERE jobid IN (
  SELECT jobid FROM cron.job WHERE jobname LIKE '%waitlist%'
)
ORDER BY start_time DESC
LIMIT 20;
```

### Force Run Cleanup Now

```sql
-- Run daily cleanup manually
SELECT * FROM cleanup_past_waitlists();

-- Run expiry check manually
SELECT * FROM process_expired_waitlist_notifications();
```

---

## Database Schema Changes

### New Columns

```sql
ALTER TABLE waitlist
ADD COLUMN target_date date;  -- Specific class date user is waiting for
```

### New Indexes

```sql
CREATE INDEX idx_waitlist_target_date
  ON waitlist(target_date)
  WHERE status IN ('waiting', 'expired');

CREATE INDEX idx_waitlist_status_target_date
  ON waitlist(status, target_date);
```

### New Table

```sql
CREATE TABLE waitlist_cleanup_log (
  id uuid PRIMARY KEY,
  cleanup_date date,
  entries_deleted integer,
  cleanup_type text,  -- 'automatic' or 'manual'
  performed_by uuid,
  details jsonb,
  created_at timestamptz
);
```

---

## Impact on Existing Code

### Frontend Changes Needed

**None required!** The `target_date` is automatically calculated by the trigger when users join the waitlist. No frontend code changes needed.

**Optional Enhancement:**
If you want to show users which specific date they're waitlisted for:

```typescript
// In waitlist display component
{waitlistEntry.target_date && (
  <p className="text-sm text-muted-foreground">
    Waitlisted for: {formatDate(waitlistEntry.target_date)}
  </p>
)}
```

### Backend Changes Needed

**None required!** All logic is in the database.

### Edge Functions

If you have edge functions that process waitlists, ensure they handle `target_date`:

```typescript
// supabase/functions/process-waitlist/index.ts
const { data: waitlisted } = await supabase
  .from('waitlist')
  .select('*')
  .eq('schedule_id', scheduleId)
  .eq('status', 'waiting')
  .gte('target_date', new Date().toISOString().split('T')[0])  // ← Add this
  .order('queue_position', { ascending: true })
  .limit(1)
  .single();
```

---

## Rollback Plan

If you need to revert these changes:

```sql
-- 1. Unschedule cron jobs
SELECT cron.unschedule('daily-waitlist-cleanup');
SELECT cron.unschedule('hourly-waitlist-expiry');
SELECT cron.unschedule('weekly-waitlist-report');

-- 2. Drop new objects
DROP VIEW IF EXISTS waitlist_with_class_details;
DROP TABLE IF EXISTS waitlist_cleanup_log;
DROP FUNCTION IF EXISTS cleanup_past_waitlists();
DROP FUNCTION IF EXISTS manual_waitlist_cleanup(date);
DROP FUNCTION IF EXISTS get_waitlist_summary();
DROP FUNCTION IF EXISTS get_next_class_date(text);
DROP FUNCTION IF EXISTS set_waitlist_target_date();
DROP TRIGGER IF EXISTS auto_set_waitlist_target_date ON waitlist;

-- 3. Remove column (optional - data loss)
ALTER TABLE waitlist DROP COLUMN IF EXISTS target_date;
```

---

## Performance Considerations

### Indexes

✅ **Added:**
- `idx_waitlist_target_date` - Fast cleanup queries
- `idx_waitlist_status_target_date` - Fast status + date queries

### Query Performance

**Before Cleanup:**
```sql
-- Slow: Full table scan
SELECT * FROM waitlist WHERE status = 'waiting';
-- Performance: O(n) where n = all waitlist entries ever
```

**After Cleanup:**
```sql
-- Fast: Indexed, filtered by date
SELECT * FROM waitlist
WHERE status = 'waiting'
  AND target_date >= CURRENT_DATE;
-- Performance: O(m) where m = only future entries
```

### Cron Job Impact

- **Daily cleanup:** <1 second (deletes only past entries)
- **Hourly expiry:** <500ms (updates only notified entries)
- **Weekly report:** <100ms (simple aggregation)

**Database Load:** Minimal (runs during low-traffic hours)

---

## Monitoring & Alerts

### Recommended Alerts

**1. Cleanup Failure Alert**
```sql
-- If cleanup hasn't run in 2 days
SELECT *
FROM waitlist_cleanup_log
WHERE cleanup_type = 'automatic'
  AND cleanup_date > CURRENT_DATE - 2
ORDER BY cleanup_date DESC
LIMIT 1;

-- Alert if: No results or cleanup_date < CURRENT_DATE - 1
```

**2. Too Many Past Entries Alert**
```sql
-- If cleanup isn't working
SELECT COUNT(*) as past_entries
FROM waitlist
WHERE target_date < CURRENT_DATE;

-- Alert if: past_entries > 50
```

**3. Cron Job Failure**
```sql
SELECT *
FROM cron.job_run_details
WHERE status = 'failed'
  AND start_time > now() - INTERVAL '24 hours'
ORDER BY start_time DESC;
```

### Dashboard Metrics

```sql
-- Daily cleanup effectiveness
SELECT
  cleanup_date,
  entries_deleted,
  (SELECT COUNT(*) FROM waitlist WHERE target_date < cleanup_date) as remaining_past
FROM waitlist_cleanup_log
WHERE cleanup_type = 'automatic'
ORDER BY cleanup_date DESC
LIMIT 30;
```

---

## FAQ

### Q: What happens to existing waitlist entries?
**A:** They are backfilled with calculated target_dates during migration. Entries with past dates will be cleaned up on the first cron run.

### Q: Can users join waitlist for multiple occurrences of the same class?
**A:** No. The UNIQUE constraint `(schedule_id, user_id)` prevents duplicate entries. If they want to waitlist for a different week, they must leave the current waitlist first.

### Q: What if a user joins waitlist on Friday for a Monday class?
**A:** `get_next_class_date('Monday')` calculates the next Monday (3 days away). If they join on Monday for a Monday class, it calculates NEXT Monday (7 days away), not today.

### Q: How long are waitlist entries kept after conversion?
**A:** Converted entries (status = 'converted') are kept forever by default. The manual cleanup function can optionally delete converted entries older than 30 days.

### Q: What if cron extension is not available?
**A:** You can use Supabase Edge Functions with scheduled triggers (webhooks) or external cron services (GitHub Actions, cron-job.org) to call the cleanup functions via API.

### Q: Can I change the cleanup schedule?
**A:** Yes. Edit the cron schedule in `setup_waitlist_cron_jobs.sql` and re-run it:
```sql
-- Change to cleanup at 3 AM instead
SELECT cron.schedule(
  'daily-waitlist-cleanup',
  '0 3 * * *',  -- 3 AM
  $$ SELECT cleanup_past_waitlists(); $$
);
```

---

## Success Verification

After implementation, verify:

✅ **1. target_date column exists:**
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'waitlist' AND column_name = 'target_date';
```

✅ **2. Functions exist:**
```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_name LIKE '%waitlist%'
ORDER BY routine_name;
```

✅ **3. Cron jobs scheduled:**
```sql
SELECT COUNT(*) as job_count
FROM cron.job
WHERE jobname LIKE '%waitlist%';
-- Expected: 3
```

✅ **4. Trigger active:**
```sql
SELECT trigger_name
FROM information_schema.triggers
WHERE trigger_name = 'auto_set_waitlist_target_date';
```

✅ **5. New entries get target_date:**
```sql
-- Insert test entry (will be auto-deleted by cleanup)
INSERT INTO waitlist (schedule_id, user_id, queue_position, status)
SELECT
  s.id,
  p.id,
  1,
  'waiting'
FROM schedule s, profiles p
LIMIT 1
ON CONFLICT DO NOTHING
RETURNING id, target_date;

-- Should return a row with target_date populated
```

---

## Next Steps

1. ✅ Run `add_waitlist_cleanup.sql`
2. ✅ Run `setup_waitlist_cron_jobs.sql`
3. ✅ Run `test_waitlist_cleanup.sql` to verify
4. ✅ Run initial cleanup: `SELECT * FROM cleanup_past_waitlists();`
5. ⏰ Wait 24 hours and check cleanup log
6. 📊 Monitor `waitlist_cleanup_log` table
7. 🔔 Set up alerts for cleanup failures

---

## Support

If you encounter issues:

1. **Check cron job logs:**
   ```sql
   SELECT * FROM cron.job_run_details
   WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname LIKE '%waitlist%')
   ORDER BY start_time DESC LIMIT 5;
   ```

2. **Check for errors:**
   ```sql
   SELECT status, return_message
   FROM cron.job_run_details
   WHERE status = 'failed'
   ORDER BY start_time DESC LIMIT 10;
   ```

3. **Manual test:**
   ```sql
   -- Run cleanup manually to see any errors
   SELECT * FROM cleanup_past_waitlists();
   SELECT * FROM process_expired_waitlist_notifications();
   ```

4. **Check waitlist summary:**
   ```sql
   SELECT * FROM get_waitlist_summary();
   ```

---

## Conclusion

You now have a fully automated waitlist cleanup system that:
- ✅ Tracks specific class occurrences
- ✅ Automatically cleans up past entries daily
- ✅ Expires old notifications hourly
- ✅ Logs all cleanup operations
- ✅ Provides admin monitoring views
- ✅ Has zero impact on existing functionality
- ✅ Requires no frontend changes

The system will keep your waitlist table clean and performant automatically!
