# Quick Start: Fix Waitlist Cleanup Issue

## Problem
Waitlist entries never get cleaned up after class dates pass, causing database bloat.

## Solution in 3 Steps

### Step 1: Run Main Migration (2 minutes)

1. Open **Supabase Dashboard** → **SQL Editor**
2. Click **"New Query"**
3. Copy and paste contents of: `database_sql/add_waitlist_cleanup.sql`
4. Click **"Run"** or press **Ctrl+Enter**

**Expected Output:**
```
✓ Added target_date column
✓ Created 8 functions
✓ Backfilled existing entries
✓ Migration completed successfully!

Current Waitlist Summary:
  Total entries: 42
  Past date (need cleanup): 12
  Future date (valid): 30
```

### Step 2: Setup Automated Cleanup (1 minute)

1. Still in **SQL Editor**, click **"New Query"**
2. Copy and paste contents of: `database_sql/setup_waitlist_cron_jobs.sql`
3. Click **"Run"**

**Expected Output:**
```
✓ Cron job 'daily-waitlist-cleanup' scheduled (2 AM daily)
✓ Cron job 'hourly-waitlist-expiry' scheduled (every hour)
✓ Cron job 'weekly-waitlist-report' scheduled (Mondays 9 AM)
```

### Step 3: Verify Everything Works (2 minutes)

1. Click **"New Query"**
2. Copy and paste contents of: `database_sql/test_waitlist_cleanup.sql`
3. Click **"Run"**

**Expected Output:**
```
✓ TEST 1 PASSED: Date calculation
✓ TEST 2 PASSED: Auto-set target_date
✓ TEST 3 PASSED: Cleanup works correctly
✓ TEST 4 PASSED: Summary function
✓ TEST 5 PASSED: View accessible
✓ TEST 6 PASSED: Expiry processing
✓ TEST 7 PASSED: Logging works

ALL TESTS COMPLETED!
SYSTEM READY FOR PRODUCTION
```

---

## Done! 🎉

Your waitlist system now:
- ✅ Automatically cleans up entries for past classes (daily at 2 AM)
- ✅ Expires old notifications after 24 hours (every hour)
- ✅ Tracks which specific class date users are waitlisted for
- ✅ Logs all cleanup operations for monitoring

---

## Optional: Run Initial Cleanup Now

If you want to clean up existing past entries immediately (instead of waiting for 2 AM):

```sql
-- Run this in SQL Editor
SELECT * FROM cleanup_past_waitlists();
```

**Output Example:**
```
deleted_count | message
--------------+------------------------------------------
           12 | Cleaned up 12 past waitlist entries...
```

---

## Verify Cron Jobs Are Running

After 24 hours, check the cleanup log:

```sql
SELECT
  cleanup_date,
  entries_deleted,
  cleanup_type,
  created_at
FROM waitlist_cleanup_log
ORDER BY created_at DESC
LIMIT 5;
```

**Expected:**
```
cleanup_date | entries_deleted | cleanup_type | created_at
-------------|-----------------|--------------|---------------------------
2024-12-17   | 8               | automatic    | 2024-12-17 02:00:01+00
2024-12-16   | 15              | automatic    | 2024-12-16 02:00:01+00
```

If you see entries with `cleanup_type = 'automatic'`, the cron jobs are working!

---

## Monitor Waitlist Health

```sql
-- Quick health check
SELECT * FROM get_waitlist_summary();
```

**Output:**
```
total | waiting | notified | expired | converted | past_date | future_date
------|---------|----------|---------|-----------|-----------|-------------
  42  |   30    |    5     |    2    |     5     |     0     |     42
```

**Healthy System:** `past_date` should always be 0 (or very low if cleanup just ran)

---

## Troubleshooting

### Issue: Tests fail
**Solution:** Make sure you ran `add_waitlist_cleanup.sql` first

### Issue: No cron jobs showing
**Solution:** pg_cron extension might not be enabled. Contact Supabase support or use Edge Functions as alternative

### Issue: Past entries not cleaning up
**Solution:**
```sql
-- Check cron job status
SELECT * FROM cron.job WHERE jobname LIKE '%waitlist%';

-- If not running, manually trigger:
SELECT * FROM cleanup_past_waitlists();
```

---

## Files Reference

1. **add_waitlist_cleanup.sql** - Main migration (run first)
2. **setup_waitlist_cron_jobs.sql** - Automated jobs setup (run second)
3. **test_waitlist_cleanup.sql** - Test suite (run third to verify)
4. **WAITLIST_CLEANUP_IMPLEMENTATION.md** - Full documentation
5. **WAITLIST_CLEANUP_BUSINESS_RULES.md** - Detailed business rules

---

## Need Help?

Check the full implementation guide: [WAITLIST_CLEANUP_IMPLEMENTATION.md](WAITLIST_CLEANUP_IMPLEMENTATION.md)

Or view the business rules: [WAITLIST_CLEANUP_BUSINESS_RULES.md](WAITLIST_CLEANUP_BUSINESS_RULES.md)
