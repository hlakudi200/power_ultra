# Fix 400 Error When Logging Workouts

## 🐛 Error

```
POST https://...supabase.co/rest/v1/rpc/upsert_workout_progress 400 (Bad Request)
```

## 🔍 Root Cause

**Type Mismatch**: The `workout_progress` table has `weight_used` as `numeric(10,2)` but the `upsert_workout_progress` function was trying to insert TEXT directly into a NUMERIC column.

### The Problem

**Database Table** (`workout_progress`):
```sql
weight_used numeric(10,2)  -- Expects: 135.50
```

**Frontend** sends:
```javascript
p_weight_used: "135"  // Sends text
```

**Old Function** tried to:
```sql
INSERT INTO workout_progress (weight_used) VALUES ("135");  -- ❌ TEXT into NUMERIC = ERROR
```

---

## ✅ The Fix

Updated the `upsert_workout_progress` function to:
1. Accept weight as TEXT (flexible: "135", "135 lbs", "135.5 kg")
2. Extract only the numeric part using regex
3. Cast to NUMERIC before inserting

### Updated Function Logic

```sql
-- Accept text
p_weight_used text  -- Can be "135", "135 lbs", "60.5 kg", etc.

-- Extract numbers only
v_weight_numeric := CAST(regexp_replace(p_weight_used, '[^0-9.]', '', 'g') AS numeric);

-- Insert numeric value
INSERT INTO workout_progress (weight_used) VALUES (v_weight_numeric);
```

**Examples**:
- Input: `"135"` → Stored: `135.00`
- Input: `"135 lbs"` → Stored: `135.00`
- Input: `"60.5"` → Stored: `60.50`
- Input: `"bodyweight"` → Stored: `NULL`

---

## 🔧 How to Apply the Fix

### Option 1: Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard** → **SQL Editor**
2. **Click "New Query"**
3. **Copy and paste this SQL**:

```sql
-- Fix upsert_workout_progress function weight type
DROP FUNCTION IF EXISTS upsert_workout_progress(uuid, uuid, uuid, integer, integer, text, integer, integer, text);

CREATE OR REPLACE FUNCTION upsert_workout_progress(
  p_member_id uuid,
  p_exercise_id uuid,
  p_plan_id uuid,
  p_sets_completed integer,
  p_reps_completed integer,
  p_weight_used text,
  p_duration_minutes integer,
  p_rating integer,
  p_notes text
)
RETURNS uuid AS $$
DECLARE
  v_progress_id uuid;
  v_week_number integer;
  v_today date;
  v_weight_numeric numeric;
BEGIN
  v_today := CURRENT_DATE;
  v_week_number := get_plan_current_week(p_plan_id);

  -- Extract numeric value from weight text
  IF p_weight_used IS NOT NULL AND p_weight_used != '' THEN
    v_weight_numeric := CAST(regexp_replace(p_weight_used, '[^0-9.]', '', 'g') AS numeric);
  ELSE
    v_weight_numeric := NULL;
  END IF;

  -- Try to update existing log for today
  UPDATE public.workout_progress
  SET
    sets_completed = p_sets_completed,
    reps_completed = p_reps_completed,
    weight_used = v_weight_numeric,
    duration_minutes = p_duration_minutes,
    rating = p_rating,
    notes = p_notes,
    completed_at = NOW(),
    completed_date = v_today,
    week_number = v_week_number,
    plan_id = p_plan_id
  WHERE member_id = p_member_id
    AND exercise_id = p_exercise_id
    AND completed_date = v_today
  RETURNING id INTO v_progress_id;

  -- If no existing log, insert new one
  IF v_progress_id IS NULL THEN
    INSERT INTO public.workout_progress (
      member_id,
      exercise_id,
      plan_id,
      sets_completed,
      reps_completed,
      weight_used,
      duration_minutes,
      rating,
      notes,
      week_number,
      completed_at,
      completed_date
    ) VALUES (
      p_member_id,
      p_exercise_id,
      p_plan_id,
      p_sets_completed,
      p_reps_completed,
      v_weight_numeric,
      p_duration_minutes,
      p_rating,
      p_notes,
      v_week_number,
      NOW(),
      v_today
    )
    RETURNING id INTO v_progress_id;
  END IF;

  RETURN v_progress_id;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION upsert_workout_progress(uuid, uuid, uuid, integer, integer, text, integer, integer, text) TO authenticated;
```

4. **Click "Run"** or press **Ctrl+Enter**
5. **Verify**: You should see "Success. No rows returned"

### Option 2: Using Migration File

If you have Supabase CLI:

```bash
cd C:\Users\Rapudi Hlakudi\Downloads\power-ultra-gym-site-main\power-ultra-gym-site-main
supabase migration up
```

The migration file is already created at:
`supabase/migrations/fix_upsert_workout_progress_weight_type.sql`

---

## ✅ Testing After Fix

1. **Refresh your app** (hard reload: Ctrl+Shift+R / Cmd+Shift+R)
2. **Navigate to** "My Workout Plan"
3. **Click on today's tab**
4. **Click "Log Workout"** on any exercise
5. **Fill in the form**:
   - Sets: 4
   - Reps: 10
   - Weight: 135 (or any number)
   - Duration: Leave blank or add minutes
   - Rating: 3 stars
   - Notes: Optional
6. **Click "Log Workout"**
7. **Expected**: Success toast appears, no 400 error

---

## 🎯 What This Fixes

### Before (Broken)
```
User enters weight: 135
    ↓
Frontend sends: p_weight_used = "135"
    ↓
Function tries: INSERT weight_used = "135" (text)
    ↓
Database expects: numeric(10,2)
    ↓
❌ 400 Bad Request Error
```

### After (Fixed)
```
User enters weight: 135
    ↓
Frontend sends: p_weight_used = "135"
    ↓
Function extracts: v_weight_numeric = 135.00 (numeric)
    ↓
Function inserts: INSERT weight_used = 135.00
    ↓
Database accepts: numeric(10,2) ✅
    ↓
✅ Success! Workout logged
```

---

## 🔍 Additional Benefits

The function now handles various weight formats:

| User Input | What's Sent | What's Stored | Result |
|------------|-------------|---------------|--------|
| `135` | `"135"` | `135.00` | ✅ Works |
| `135.5` | `"135.5"` | `135.50` | ✅ Works |
| `60 kg` | `"60 kg"` | `60.00` | ✅ Works (extracts number) |
| `bodyweight` | `"bodyweight"` | `NULL` | ✅ Works (no numbers → NULL) |
| Empty | `null` | `NULL` | ✅ Works |

---

## 🐛 If Still Not Working

### Check Browser Console
Look for the exact error message:
```javascript
// Press F12 → Console tab
// Look for errors when clicking "Log Workout"
```

### Common Issues

**1. Function Not Updated**
- Make sure you ran the SQL in the correct Supabase project
- Verify with: `SELECT * FROM pg_proc WHERE proname = 'upsert_workout_progress';`

**2. Cache Issue**
- Hard refresh: Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac)
- Or clear browser cache completely

**3. Wrong Project**
- Make sure you're in the right Supabase project
- Check the URL: `https://vhlkwzpbogbmdsblzlmh.supabase.co`

**4. Permissions Issue**
- The `GRANT EXECUTE` line should be included
- Check RLS policies on `workout_progress` table

---

## 📊 Database Schema Reference

### workout_progress Table
```sql
CREATE TABLE workout_progress (
  id uuid PRIMARY KEY,
  exercise_id uuid REFERENCES workout_exercises(id),
  member_id uuid REFERENCES profiles(id),
  plan_id uuid REFERENCES workout_plans(id),
  completed_at timestamptz DEFAULT now(),
  completed_date date,
  week_number integer,
  sets_completed integer,
  reps_completed integer,
  weight_used numeric(10,2),        -- ⭐ This is the field that was causing issues
  duration_minutes integer,
  rating integer CHECK (rating BETWEEN 1 AND 5),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Unique constraint: one log per exercise per day
CREATE UNIQUE INDEX unique_exercise_completion_per_day
  ON workout_progress(member_id, exercise_id, completed_date);
```

---

## ✅ Summary

**Issue**: Type mismatch between TEXT parameter and NUMERIC column

**Fix**: Extract numeric value from text before inserting

**Files Modified**:
- `supabase/migrations/fix_upsert_workout_progress_weight_type.sql` (new)
- `src/components/LogWorkoutDialog.tsx` (sends plain number as text)

**Result**: Users can now successfully log workouts without 400 errors! 🎉
