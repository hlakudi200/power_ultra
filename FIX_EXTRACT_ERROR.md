# Fix EXTRACT Error - Complete Solution

## The Problem

When you click "Create Plan" or "Edit Plan" after adding exercises, you get this error:
```
function pg_catalog.extract(unknown, integer) does not exist
```

This happens because there's a **trigger** on the `workout_plans` table that automatically runs when you update a plan. The trigger calls `get_plan_current_week()` which has a bug.

---

## The Solution

**Copy and paste this ENTIRE SQL into Supabase SQL Editor and run it:**

```sql
-- ============================================================================
-- Fix ALL workout tracking functions with EXTRACT errors
-- ============================================================================

-- 1. Fix get_plan_current_week function
DROP FUNCTION IF EXISTS get_plan_current_week(uuid);

CREATE OR REPLACE FUNCTION get_plan_current_week(p_plan_id uuid)
RETURNS integer AS $$
DECLARE
  v_start_date date;
  v_weeks_elapsed integer;
  v_duration_weeks integer;
BEGIN
  SELECT start_date, duration_weeks INTO v_start_date, v_duration_weeks
  FROM public.workout_plans
  WHERE id = p_plan_id;

  IF v_start_date IS NULL THEN
    RETURN 1;
  END IF;

  v_weeks_elapsed := FLOOR((CURRENT_DATE - v_start_date) / 7.0) + 1;

  IF v_weeks_elapsed > v_duration_weeks THEN
    RETURN v_duration_weeks;
  ELSIF v_weeks_elapsed < 1 THEN
    RETURN 1;
  ELSE
    RETURN v_weeks_elapsed;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION get_plan_current_week(uuid) TO authenticated;

-- 2. Fix get_current_week_dates function
DROP FUNCTION IF EXISTS get_current_week_dates(uuid);

CREATE OR REPLACE FUNCTION get_current_week_dates(p_plan_id uuid)
RETURNS TABLE (
  week_number integer,
  week_start date,
  week_end date
) AS $$
DECLARE
  v_start_date date;
  v_current_week integer;
BEGIN
  SELECT start_date INTO v_start_date
  FROM public.workout_plans
  WHERE id = p_plan_id;

  IF v_start_date IS NULL THEN
    v_start_date := CURRENT_DATE;
  END IF;

  v_current_week := get_plan_current_week(p_plan_id);

  RETURN QUERY
  SELECT
    v_current_week as week_number,
    (v_start_date + ((v_current_week - 1) * 7))::date as week_start,
    (v_start_date + ((v_current_week - 1) * 7) + 6)::date as week_end;
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION get_current_week_dates(uuid) TO authenticated;

-- 3. Fix get_week_completion_stats function
DROP FUNCTION IF EXISTS get_week_completion_stats(uuid, uuid, integer);

CREATE OR REPLACE FUNCTION get_week_completion_stats(
  p_member_id uuid,
  p_plan_id uuid,
  p_week_number integer
)
RETURNS TABLE (
  total_exercises integer,
  completed_exercises integer,
  completion_percentage numeric,
  week_start date,
  week_end date
) AS $$
DECLARE
  v_start_date date;
  v_week_start date;
  v_week_end date;
  v_total integer;
  v_completed integer;
BEGIN
  SELECT start_date INTO v_start_date
  FROM public.workout_plans
  WHERE id = p_plan_id;

  IF v_start_date IS NULL THEN
    v_start_date := CURRENT_DATE;
  END IF;

  v_week_start := v_start_date + ((p_week_number - 1) * 7);
  v_week_end := v_week_start + 6;

  SELECT COUNT(*) INTO v_total
  FROM public.workout_exercises
  WHERE plan_id = p_plan_id;

  SELECT COUNT(DISTINCT we.id) INTO v_completed
  FROM public.workout_exercises we
  INNER JOIN public.workout_progress wp ON wp.exercise_id = we.id
    AND wp.member_id = p_member_id
    AND wp.completed_date BETWEEN v_week_start AND v_week_end
  WHERE we.plan_id = p_plan_id;

  RETURN QUERY
  SELECT
    v_total,
    COALESCE(v_completed, 0),
    CASE WHEN v_total > 0 THEN ROUND((COALESCE(v_completed, 0)::numeric / v_total) * 100, 1) ELSE 0::numeric END,
    v_week_start,
    v_week_end;
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION get_week_completion_stats(uuid, uuid, integer) TO authenticated;

-- 4. Recreate the trigger
DROP TRIGGER IF EXISTS trigger_update_plan_current_week ON public.workout_plans;

CREATE OR REPLACE FUNCTION update_plan_current_week()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.start_date IS NOT NULL THEN
    NEW.current_week := get_plan_current_week(NEW.id);
  ELSE
    NEW.current_week := 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_plan_current_week
  BEFORE UPDATE ON public.workout_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_plan_current_week();
```

---

## How to Apply

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project

2. **Go to SQL Editor**
   - Click "SQL Editor" in left sidebar
   - Click "New Query"

3. **Copy & Paste**
   - Copy the ENTIRE SQL above (from "DROP FUNCTION" to the end)
   - Paste into the SQL Editor

4. **Run It**
   - Click "Run" button (or press Ctrl+Enter / Cmd+Enter)
   - Wait for "Success" message

5. **Test**
   - Refresh your app
   - Go to Trainer Dashboard
   - Click "View Details" on a client
   - Click "Edit Plan"
   - Add an exercise
   - Click "Create Plan" button
   - Should work without error now!

---

## What This Fixes

**The Bug:**
```sql
-- OLD (BROKEN)
EXTRACT(EPOCH FROM (CURRENT_DATE - v_start_date)) / (7 * 24 * 60 * 60)
```
This tries to extract epoch seconds, but the date subtraction doesn't return a proper interval.

**The Fix:**
```sql
-- NEW (WORKS)
(CURRENT_DATE - v_start_date) / 7.0
```
Direct integer division of days by 7 to get weeks.

---

## Verification

After running the SQL, you should be able to:
- ✅ Create new workout plans
- ✅ Edit existing workout plans
- ✅ Add/remove exercises without errors
- ✅ View client statistics without errors

If you still get errors, check:
1. Did you run the ENTIRE SQL script?
2. Did you see "Success" message in Supabase?
3. Did you refresh your app after running the SQL?

---

## Still Having Issues?

If you're still getting the EXTRACT error:
1. Make sure you're running the SQL in the correct Supabase project
2. Clear your browser cache
3. Check the browser console for the exact error message
4. Take a screenshot of the error and we can debug further
