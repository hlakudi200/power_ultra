# How to Apply Database Migrations

## Issue Fixed
✅ **Error 1**: Missing `useEffect` import - **FIXED** in `CreateWorkoutPlanDialog.tsx`
🔧 **Error 2**: Missing `get_client_stats` function - **Migration created, needs to be applied**

---

## Option 1: Using Supabase Dashboard (Recommended)

1. **Go to Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard/project/YOUR_PROJECT_ID
   - Or use your direct link: https://vhlkwzpbogbmdsblzlmh.supabase.co

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy and Paste the Migration**
   - Open the file: `supabase/migrations/add_get_client_stats_function.sql`
   - Copy all the contents
   - Paste into the SQL Editor

4. **Run the Query**
   - Click "Run" or press `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)
   - You should see: "Success. No rows returned"

5. **Verify**
   - Refresh your app
   - The 404 error should be gone

---

## Option 2: Using Supabase CLI (If installed)

If you have Supabase CLI installed locally:

```bash
# Navigate to project directory
cd C:\Users\Rapudi Hlakudi\Downloads\power-ultra-gym-site-main\power-ultra-gym-site-main

# Apply pending migrations
supabase db push

# Or apply this specific migration
supabase migration up
```

---

## Option 3: Manual SQL Execution

1. **Copy the SQL**:
   ```sql
   -- Copy this entire block and paste into Supabase SQL Editor

   CREATE OR REPLACE FUNCTION get_client_stats(
     p_assignment_id uuid,
     p_member_id uuid
   )
   RETURNS TABLE (
     compliance_percentage numeric,
     workouts_logged integer,
     current_streak integer
   ) AS $$
   DECLARE
     v_plan_id uuid;
     v_total_exercises integer;
     v_completed_exercises integer;
     v_workouts_count integer;
     v_streak integer;
   BEGIN
     -- Get active plan ID for this assignment
     SELECT id INTO v_plan_id
     FROM workout_plans
     WHERE assignment_id = p_assignment_id
       AND status = 'active'
     LIMIT 1;

     -- If no active plan, return zeros
     IF v_plan_id IS NULL THEN
       RETURN QUERY SELECT 0::numeric, 0::integer, 0::integer;
       RETURN;
     END IF;

     -- Count total exercises in the plan
     SELECT COUNT(DISTINCT id) INTO v_total_exercises
     FROM workout_exercises
     WHERE plan_id = v_plan_id;

     -- Count exercises completed in the last 7 days (current week)
     SELECT COUNT(DISTINCT we.id) INTO v_completed_exercises
     FROM workout_exercises we
     LEFT JOIN workout_progress wp ON we.id = wp.exercise_id
       AND wp.member_id = p_member_id
       AND wp.completed_date >= CURRENT_DATE - 7
     WHERE we.plan_id = v_plan_id
       AND wp.id IS NOT NULL;

     -- Count total unique workout sessions logged (all time)
     SELECT COUNT(DISTINCT completed_date) INTO v_workouts_count
     FROM workout_progress
     WHERE member_id = p_member_id
       AND plan_id = v_plan_id;

     -- Calculate current streak (consecutive days with at least 1 workout)
     WITH RECURSIVE daily_workouts AS (
       SELECT DISTINCT completed_date as workout_date
       FROM workout_progress
       WHERE member_id = p_member_id
       ORDER BY completed_date DESC
     ),
     streak_calc AS (
       SELECT
         workout_date,
         ROW_NUMBER() OVER (ORDER BY workout_date DESC) as rn,
         workout_date - (ROW_NUMBER() OVER (ORDER BY workout_date DESC) * INTERVAL '1 day') as grp
       FROM daily_workouts
       WHERE workout_date <= CURRENT_DATE
     ),
     current_streak_group AS (
       SELECT COUNT(*) as streak_days
       FROM streak_calc
       WHERE workout_date >= CURRENT_DATE - INTERVAL '30 days'
         AND grp = (
           SELECT grp
           FROM streak_calc
           WHERE workout_date = CURRENT_DATE
              OR workout_date = (
                SELECT MAX(workout_date)
                FROM daily_workouts
                WHERE workout_date <= CURRENT_DATE
              )
           LIMIT 1
         )
     )
     SELECT COALESCE(streak_days, 0) INTO v_streak
     FROM current_streak_group;

     -- If no streak found, set to 0
     v_streak := COALESCE(v_streak, 0);

     -- Calculate compliance percentage
     RETURN QUERY
     SELECT
       CASE
         WHEN v_total_exercises > 0
         THEN ROUND((v_completed_exercises::numeric / v_total_exercises) * 100, 1)
         ELSE 0
       END as compliance_percentage,
       COALESCE(v_workouts_count, 0) as workouts_logged,
       v_streak as current_streak;
   END;
   $$ LANGUAGE plpgsql STABLE;

   -- Grant execute permission to authenticated users
   GRANT EXECUTE ON FUNCTION get_client_stats(uuid, uuid) TO authenticated;

   -- Add comment
   COMMENT ON FUNCTION get_client_stats IS 'Returns client statistics: compliance percentage (last 7 days), total workouts logged, and current workout streak';
   ```

2. **Execute in Supabase Dashboard**
   - Paste the SQL into SQL Editor
   - Click "Run"

---

## Verification Steps

After applying the migration:

1. **Check the browser console**
   - The error should change from 404 to showing data or a different error

2. **Test the function directly in SQL Editor**:
   ```sql
   -- Test with sample IDs (replace with actual IDs from your database)
   SELECT * FROM get_client_stats(
     'assignment-id-here'::uuid,
     'member-id-here'::uuid
   );
   ```

3. **Refresh your app**
   - Navigate to trainer dashboard
   - Click "View Details" on a client
   - Statistics should now display instead of errors

---

## What This Function Does

**Returns 3 key metrics for a client**:

1. **Compliance Percentage** (0-100%)
   - Calculated as: (Exercises completed this week / Total exercises in plan) × 100
   - Based on last 7 days

2. **Workouts Logged** (integer)
   - Total unique days with at least one workout logged
   - All-time count for the active plan

3. **Current Streak** (integer)
   - Consecutive days with workouts
   - Resets if a day is missed
   - Looks back up to 30 days

---

## Troubleshooting

### If you still see 404 error:
- Make sure you ran the SQL in the correct Supabase project
- Check the SQL Editor for any error messages
- Verify you're logged into the right Supabase account

### If you see permission errors:
- Make sure the `GRANT EXECUTE` line was included
- Your RLS policies should allow trainers to call this function

### If you see data type errors:
- Ensure the `workout_progress` table has a `completed_date` column
- Check that the migration `enhance_workout_tracking.sql` was applied

---

## Next Steps After Migration

Once the migration is applied and working:

1. Test the Client Detail View thoroughly
2. Add the remaining placeholder stats (Active Plans, Avg Compliance)
3. Consider implementing the batch RPC function for ClientList

See `TRAINER_DASHBOARD_UPDATED_ANALYSIS.md` for full implementation guide.
