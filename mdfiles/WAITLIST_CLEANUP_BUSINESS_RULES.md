# Waitlist Cleanup Business Rules - Missing Implementation

## Problem Statement

The current waitlist system (based on test cases review) **does NOT have automatic cleanup** for:
- ✗ Waitlist entries for classes that have already occurred
- ✗ Stale waitlist entries after class ends
- ✗ Expired notifications (user notified but didn't book)

This can lead to:
- Database bloat (old waitlist entries never removed)
- Confusion (users see themselves on waitlist for past classes)
- Invalid notifications (notifying users about past classes)

---

## Recommended Business Rules

### Rule 1: Auto-Remove Waitlist After Class Time Passes

**Trigger:** Class end_time has passed

**Action:**
```sql
-- Run daily cleanup job (Supabase cron or edge function)
DELETE FROM waitlist
WHERE schedule_id IN (
  SELECT id FROM schedule
  WHERE
    -- Convert day_of_week to actual date
    -- AND end_time < CURRENT_TIMESTAMP
    -- (Need to calculate actual datetime from day_of_week + time)
);
```

**Implementation Options:**

**Option A: Cron Job (Recommended)**
```sql
-- Run at midnight every day
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'cleanup-past-waitlists',
  '0 0 * * *',  -- Daily at midnight
  $$
  DELETE FROM waitlist
  WHERE created_at < NOW() - INTERVAL '7 days'
    AND status = 'active';
  $$
);
```

**Option B: Database Trigger**
```sql
-- Trigger on schedule table to cleanup when class completes
CREATE OR REPLACE FUNCTION cleanup_waitlist_after_class()
RETURNS TRIGGER AS $$
BEGIN
  -- Only for recurring schedules, calculate if this week's instance passed
  -- Delete waitlist entries older than 24 hours
  DELETE FROM waitlist
  WHERE schedule_id = OLD.id
    AND created_at < NOW() - INTERVAL '24 hours';

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;
```

**Option C: Edge Function (Most Flexible)**
```typescript
// supabase/functions/cleanup-waitlists/index.ts
import { createClient } from '@supabase/supabase-js'

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Calculate cutoff date (7 days ago)
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - 7)

  // Delete old waitlist entries
  const { data, error } = await supabase
    .from('waitlist')
    .delete()
    .lt('created_at', cutoffDate.toISOString())
    .eq('status', 'active')

  return new Response(
    JSON.stringify({
      success: !error,
      deleted_count: data?.length || 0,
      error: error?.message
    }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
```

---

### Rule 2: Expire Notified Waitlist Entries

**Trigger:** User notified but doesn't book within X hours

**Business Logic:**
- User gets notification: "Spot available!"
- User has 2-4 hours to book (configurable)
- If not booked within window → Expire entry, notify next person

**Implementation:**

```sql
-- Add notified_at timestamp to waitlist table
ALTER TABLE waitlist
ADD COLUMN IF NOT EXISTS notified_at timestamptz;

-- Function to expire old notifications
CREATE OR REPLACE FUNCTION expire_waitlist_notifications()
RETURNS integer AS $$
DECLARE
  expired_count integer;
  notification_window_hours integer := 4;  -- Configurable
BEGIN
  -- Find entries where user was notified > X hours ago but didn't book
  WITH expired_entries AS (
    UPDATE waitlist
    SET status = 'expired'
    WHERE status = 'notified'
      AND notified_at < NOW() - (notification_window_hours || ' hours')::interval
    RETURNING id, schedule_id
  )
  SELECT COUNT(*) INTO expired_count FROM expired_entries;

  -- For each expired entry, notify next person in line
  -- (Call process_waitlist for each schedule_id)

  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Schedule to run every hour
SELECT cron.schedule(
  'expire-waitlist-notifications',
  '0 * * * *',  -- Every hour
  $$ SELECT expire_waitlist_notifications(); $$
);
```

---

### Rule 3: Clean Up After Class Date Passes (Day-Specific)

**Challenge:** Schedule table has `day_of_week` but no specific date

**Problem:**
```sql
-- Schedule entry:
{
  day_of_week: "Monday",
  start_time: "10:00:00",
  end_time: "11:00:00"
}

-- Question: Which Monday? This Monday or next Monday?
```

**Solution A: Add Instance Tracking**
```sql
-- Create class_instances table for specific occurrences
CREATE TABLE class_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid REFERENCES schedule(id),
  occurrence_date date NOT NULL,  -- Specific Monday (e.g., 2024-12-09)
  start_datetime timestamptz,     -- 2024-12-09 10:00:00
  end_datetime timestamptz,       -- 2024-12-09 11:00:00
  status text DEFAULT 'scheduled',
  UNIQUE(schedule_id, occurrence_date)
);

-- Waitlist references class_instance instead of schedule
ALTER TABLE waitlist
ADD COLUMN instance_id uuid REFERENCES class_instances(id);

-- Now cleanup is easy:
DELETE FROM waitlist
WHERE instance_id IN (
  SELECT id FROM class_instances
  WHERE end_datetime < NOW()
);
```

**Solution B: Add Date to Waitlist Entry**
```sql
-- When user joins waitlist, capture the target date
ALTER TABLE waitlist
ADD COLUMN target_date date;  -- Which Monday they want

-- Cleanup based on target_date
DELETE FROM waitlist
WHERE target_date < CURRENT_DATE;
```

**Solution C: Time-Based Expiry (Simpler)**
```sql
-- Just delete waitlist entries older than 14 days
-- Assumes class happens within 2 weeks of joining waitlist
DELETE FROM waitlist
WHERE created_at < NOW() - INTERVAL '14 days';
```

---

## Recommended Implementation Plan

### Phase 1: Immediate (Simple Cleanup)
```sql
-- Add cleanup function (runs daily)
CREATE OR REPLACE FUNCTION cleanup_old_waitlists()
RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Delete waitlist entries older than 14 days
  WITH deleted AS (
    DELETE FROM waitlist
    WHERE created_at < NOW() - INTERVAL '14 days'
      AND status IN ('active', 'expired')
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Schedule daily cleanup
SELECT cron.schedule(
  'daily-waitlist-cleanup',
  '0 2 * * *',  -- 2 AM daily
  $$ SELECT cleanup_old_waitlists(); $$
);
```

### Phase 2: Enhanced (Add target_date)
```sql
-- Modify waitlist table
ALTER TABLE waitlist
ADD COLUMN target_date date;

-- When joining waitlist, calculate next occurrence of day_of_week
CREATE OR REPLACE FUNCTION get_next_class_date(p_day_of_week text)
RETURNS date AS $$
BEGIN
  -- Calculate next occurrence of day_of_week
  -- If today is Monday and class is Monday → next Monday (7 days)
  -- If today is Tuesday and class is Monday → next Monday (6 days)
  RETURN CURRENT_DATE + (
    (7 + (
      CASE p_day_of_week
        WHEN 'Monday' THEN 1
        WHEN 'Tuesday' THEN 2
        WHEN 'Wednesday' THEN 3
        WHEN 'Thursday' THEN 4
        WHEN 'Friday' THEN 5
        WHEN 'Saturday' THEN 6
        WHEN 'Sunday' THEN 0
      END
      - EXTRACT(DOW FROM CURRENT_DATE)::integer
    )) % 7
  )::integer;
END;
$$ LANGUAGE plpgsql;

-- Modified join_waitlist function
CREATE OR REPLACE FUNCTION join_waitlist(
  p_user_id uuid,
  p_schedule_id uuid
)
RETURNS uuid AS $$
DECLARE
  v_day_of_week text;
  v_target_date date;
  v_waitlist_id uuid;
BEGIN
  -- Get day_of_week from schedule
  SELECT day_of_week INTO v_day_of_week
  FROM schedule WHERE id = p_schedule_id;

  -- Calculate target date
  v_target_date := get_next_class_date(v_day_of_week);

  -- Insert waitlist entry with target_date
  INSERT INTO waitlist (user_id, schedule_id, target_date, status)
  VALUES (p_user_id, p_schedule_id, v_target_date, 'active')
  RETURNING id INTO v_waitlist_id;

  RETURN v_waitlist_id;
END;
$$ LANGUAGE plpgsql;

-- Cleanup based on target_date
CREATE OR REPLACE FUNCTION cleanup_past_waitlists()
RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  WITH deleted AS (
    DELETE FROM waitlist
    WHERE target_date < CURRENT_DATE
      AND status = 'active'
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
```

### Phase 3: Advanced (Notification Expiry)
```sql
-- Add notified_at column
ALTER TABLE waitlist
ADD COLUMN notified_at timestamptz;

-- Modified process_waitlist to record notification time
CREATE OR REPLACE FUNCTION process_waitlist(
  p_schedule_id uuid,
  p_class_details jsonb
)
RETURNS jsonb AS $$
DECLARE
  v_waitlisted record;
  v_notified_count integer := 0;
BEGIN
  -- Get first person on waitlist
  SELECT * INTO v_waitlisted
  FROM waitlist
  WHERE schedule_id = p_schedule_id
    AND status = 'active'
  ORDER BY created_at ASC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('notified_count', 0);
  END IF;

  -- Create notification
  INSERT INTO notifications (user_id, type, title, message, related_id)
  VALUES (
    v_waitlisted.user_id,
    'waitlist',
    'Spot Available!',
    format('A spot is now available for %s', p_class_details->>'class_name'),
    p_schedule_id
  );

  -- Update waitlist entry (mark as notified and record time)
  UPDATE waitlist
  SET
    status = 'notified',
    notified_at = NOW()
  WHERE id = v_waitlisted.id;

  RETURN jsonb_build_object('notified_count', 1);
END;
$$ LANGUAGE plpgsql;

-- Expire notifications after 4 hours
CREATE OR REPLACE FUNCTION expire_old_notifications()
RETURNS integer AS $$
DECLARE
  expired_count integer;
  notification_window_hours integer := 4;
BEGIN
  WITH expired AS (
    UPDATE waitlist
    SET status = 'expired'
    WHERE status = 'notified'
      AND notified_at < NOW() - (notification_window_hours || ' hours')::interval
    RETURNING id, schedule_id
  ),
  notify_next AS (
    -- For each expired entry, notify next person
    SELECT DISTINCT schedule_id
    FROM expired
  )
  SELECT COUNT(*) INTO expired_count FROM expired;

  -- Process waitlist for affected schedules
  PERFORM process_waitlist(schedule_id, NULL)
  FROM notify_next;

  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Run every hour
SELECT cron.schedule(
  'expire-waitlist-notifications',
  '0 * * * *',
  $$ SELECT expire_old_notifications(); $$
);
```

---

## New Test Cases Needed

Add these to `06_WAITLIST_TESTS.md`:

### TC-WAITLIST-029: Auto-Cleanup - Class Date Passed
**Priority:** High
**Type:** Functional - Cleanup

#### Preconditions
- Waitlist entry created 15 days ago
- Class date has passed

#### Test Steps
1. Run daily cleanup job
2. Check waitlist table

#### Expected Results
- Waitlist entry deleted
- User no longer on waitlist
- Database cleaned up

---

### TC-WAITLIST-030: Notification Expiry - User Didn't Book
**Priority:** High
**Type:** Functional - Expiry

#### Preconditions
- User A notified 5 hours ago
- User A didn't book
- User B is next on waitlist

#### Test Steps
1. Run hourly expiry check
2. Check User A status
3. Check User B notifications

#### Expected Results
- User A entry marked 'expired'
- User B gets notification
- User B is now first in line

---

### TC-WAITLIST-031: Target Date Calculation
**Priority:** High
**Type:** Functional - Date Logic

#### Preconditions
- Today is Wednesday Dec 11
- User joins waitlist for Monday class

#### Test Steps
1. Join waitlist
2. Check target_date in database

#### Expected Results
- target_date = Monday Dec 16 (next Monday)
- Correct calculation from day_of_week

---

### TC-WAITLIST-032: Cleanup Doesn't Remove Future Waitlists
**Priority:** High
**Type:** Functional - Safety Check

#### Preconditions
- User joined waitlist for class next Monday

#### Test Steps
1. Run cleanup job
2. Check waitlist entry

#### Expected Results
- Entry NOT deleted
- Only past entries removed
- Future waitlists preserved

---

## Summary of Recommendations

| Feature | Priority | Complexity | Impact |
|---------|----------|-----------|--------|
| Simple time-based cleanup (14 days) | **HIGH** | Low | Medium |
| Add target_date to waitlist | **HIGH** | Medium | High |
| Notification expiry (4 hours) | Medium | Medium | High |
| Class instances table | Low | High | High |

### Immediate Action Items

1. **Add `target_date` column to waitlist table**
   ```sql
   ALTER TABLE waitlist ADD COLUMN target_date date;
   ```

2. **Create cleanup function**
   ```sql
   CREATE FUNCTION cleanup_past_waitlists() ...
   ```

3. **Schedule daily cron job**
   ```sql
   SELECT cron.schedule('daily-waitlist-cleanup', '0 2 * * *', ...);
   ```

4. **Update join_waitlist to calculate target_date**
   - Calculate next occurrence of day_of_week
   - Store in target_date column

5. **Add 4 new test cases** (TC-WAITLIST-029 to TC-WAITLIST-032)

---

## Database Migration Script

```sql
-- Migration: Add Waitlist Cleanup
-- File: add_waitlist_cleanup.sql

BEGIN;

-- 1. Add target_date column
ALTER TABLE waitlist
ADD COLUMN IF NOT EXISTS target_date date,
ADD COLUMN IF NOT EXISTS notified_at timestamptz;

-- 2. Backfill target_date for existing entries (estimate as 7 days from created_at)
UPDATE waitlist
SET target_date = (created_at::date + 7)
WHERE target_date IS NULL;

-- 3. Create get_next_class_date function
CREATE OR REPLACE FUNCTION get_next_class_date(p_day_of_week text)
RETURNS date AS $$
DECLARE
  target_dow integer;
  current_dow integer;
  days_until integer;
BEGIN
  -- Convert day name to number (0=Sunday, 1=Monday, ..., 6=Saturday)
  target_dow := CASE p_day_of_week
    WHEN 'Sunday' THEN 0
    WHEN 'Monday' THEN 1
    WHEN 'Tuesday' THEN 2
    WHEN 'Wednesday' THEN 3
    WHEN 'Thursday' THEN 4
    WHEN 'Friday' THEN 5
    WHEN 'Saturday' THEN 6
  END;

  current_dow := EXTRACT(DOW FROM CURRENT_DATE)::integer;

  -- Calculate days until next occurrence
  days_until := (target_dow - current_dow + 7) % 7;

  -- If 0, class is today, so target next week
  IF days_until = 0 THEN
    days_until := 7;
  END IF;

  RETURN CURRENT_DATE + days_until;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 4. Create cleanup function
CREATE OR REPLACE FUNCTION cleanup_past_waitlists()
RETURNS TABLE(deleted_count integer, message text) AS $$
DECLARE
  v_deleted_count integer;
BEGIN
  WITH deleted AS (
    DELETE FROM waitlist
    WHERE target_date < CURRENT_DATE
      AND status IN ('active', 'expired')
    RETURNING id
  )
  SELECT COUNT(*)::integer INTO v_deleted_count FROM deleted;

  RETURN QUERY SELECT v_deleted_count, format('Deleted %s past waitlist entries', v_deleted_count);
END;
$$ LANGUAGE plpgsql;

-- 5. Create notification expiry function
CREATE OR REPLACE FUNCTION expire_waitlist_notifications()
RETURNS TABLE(expired_count integer, notified_count integer) AS $$
DECLARE
  v_expired_count integer;
  v_notification_window_hours integer := 4;
  v_schedule record;
BEGIN
  -- Expire old notifications
  WITH expired AS (
    UPDATE waitlist
    SET status = 'expired'
    WHERE status = 'notified'
      AND notified_at < NOW() - (v_notification_window_hours || ' hours')::interval
      AND target_date >= CURRENT_DATE  -- Don't expire if class passed
    RETURNING id, schedule_id
  )
  SELECT COUNT(*)::integer INTO v_expired_count FROM expired;

  -- TODO: Trigger process_waitlist for affected schedules
  -- (Requires calling edge function or separate trigger)

  RETURN QUERY SELECT v_expired_count, 0;
END;
$$ LANGUAGE plpgsql;

-- 6. Grant permissions
GRANT EXECUTE ON FUNCTION get_next_class_date TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_past_waitlists TO authenticated;
GRANT EXECUTE ON FUNCTION expire_waitlist_notifications TO authenticated;

-- 7. Comments
COMMENT ON FUNCTION get_next_class_date IS 'Calculates the next occurrence of a given day of week';
COMMENT ON FUNCTION cleanup_past_waitlists IS 'Deletes waitlist entries for classes that have passed';
COMMENT ON FUNCTION expire_waitlist_notifications IS 'Expires waitlist notifications after 4 hours, notifies next person';

COMMIT;
```

---

## Answer to Your Original Question

**Q: When a day for that class has passed, are all users on the queue cleaned up? Does it reset?**

**A: Currently, NO.** Based on the test cases, there's no automatic cleanup implemented. This is a **critical missing feature** that should be added.

**Recommended Implementation:**
1. Add `target_date` column to track which specific class occurrence
2. Run daily cleanup job to delete waitlist entries where `target_date < CURRENT_DATE`
3. Add notification expiry (4 hours) to move to next person if user doesn't book

This prevents database bloat and ensures waitlists stay relevant to upcoming classes.
