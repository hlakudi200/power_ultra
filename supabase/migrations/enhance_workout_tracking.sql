-- Enhancement: Add Weekly Tracking and Better Progress Features
-- This migration adds features for week tracking, duplicate prevention, and better progress visualization

-- ============================================================================
-- 1. Add Week Tracking to Workout Plans
-- ============================================================================

-- Add columns to track plan start date and current week
ALTER TABLE public.workout_plans
ADD COLUMN IF NOT EXISTS start_date date DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS current_week integer DEFAULT 1;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_workout_plans_start_date ON public.workout_plans(start_date);

-- ============================================================================
-- 2. Enhance Workout Progress Table
-- ============================================================================

-- Add week number to progress tracking
ALTER TABLE public.workout_progress
ADD COLUMN IF NOT EXISTS week_number integer,
ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES public.workout_plans(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS completed_date date;

-- Create immutable function for date conversion
CREATE OR REPLACE FUNCTION immutable_date(timestamptz)
RETURNS date AS $$
  SELECT $1::date;
$$ LANGUAGE SQL IMMUTABLE;

-- Add unique constraint to prevent duplicate logs per exercise per day
-- Using completed_date column instead of converting timestamptz
CREATE UNIQUE INDEX IF NOT EXISTS unique_exercise_completion_per_day
ON public.workout_progress(member_id, exercise_id, completed_date);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_workout_progress_week ON public.workout_progress(week_number);
CREATE INDEX IF NOT EXISTS idx_workout_progress_plan ON public.workout_progress(plan_id);
CREATE INDEX IF NOT EXISTS idx_workout_progress_completed_date ON public.workout_progress(completed_date);

-- ============================================================================
-- 3. Function: Calculate Current Week Number
-- ============================================================================

CREATE OR REPLACE FUNCTION get_plan_current_week(p_plan_id uuid)
RETURNS integer AS $$
DECLARE
  v_start_date date;
  v_weeks_elapsed integer;
  v_duration_weeks integer;
BEGIN
  -- Get plan start date and duration
  SELECT start_date, duration_weeks INTO v_start_date, v_duration_weeks
  FROM public.workout_plans
  WHERE id = p_plan_id;

  -- Calculate weeks elapsed since start
  v_weeks_elapsed := FLOOR(EXTRACT(EPOCH FROM (CURRENT_DATE - v_start_date)) / (7 * 24 * 60 * 60)) + 1;

  -- Cap at duration_weeks (don't go beyond plan duration)
  IF v_weeks_elapsed > v_duration_weeks THEN
    RETURN v_duration_weeks;
  ELSIF v_weeks_elapsed < 1 THEN
    RETURN 1;
  ELSE
    RETURN v_weeks_elapsed;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 4. Function: Get Current Week's Start and End Dates
-- ============================================================================

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
  -- Get plan start date
  SELECT start_date INTO v_start_date
  FROM public.workout_plans
  WHERE id = p_plan_id;

  -- Get current week number
  v_current_week := get_plan_current_week(p_plan_id);

  -- Calculate week start and end
  RETURN QUERY
  SELECT
    v_current_week as week_number,
    (v_start_date + ((v_current_week - 1) * 7))::date as week_start,
    (v_start_date + ((v_current_week - 1) * 7) + 6)::date as week_end;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 5. Function: Get Week Completion Stats
-- ============================================================================

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
  -- Get plan start date
  SELECT start_date INTO v_start_date
  FROM public.workout_plans
  WHERE id = p_plan_id;

  -- Calculate week boundaries
  v_week_start := v_start_date + ((p_week_number - 1) * 7);
  v_week_end := v_week_start + 6;

  -- Count total exercises in plan
  SELECT COUNT(*) INTO v_total
  FROM public.workout_exercises
  WHERE plan_id = p_plan_id;

  -- Count completed exercises this week
  SELECT COUNT(DISTINCT we.id) INTO v_completed
  FROM public.workout_exercises we
  LEFT JOIN public.workout_progress wp ON wp.exercise_id = we.id
    AND wp.member_id = p_member_id
    AND wp.completed_date BETWEEN v_week_start AND v_week_end
  WHERE we.plan_id = p_plan_id
    AND wp.id IS NOT NULL;

  -- Return stats
  RETURN QUERY
  SELECT
    v_total,
    v_completed,
    CASE WHEN v_total > 0 THEN ROUND((v_completed::numeric / v_total) * 100, 1) ELSE 0 END,
    v_week_start,
    v_week_end;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 6. Function: Get Exercise Completion History
-- ============================================================================

CREATE OR REPLACE FUNCTION get_exercise_history(
  p_member_id uuid,
  p_exercise_id uuid,
  p_limit integer DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  completed_at timestamptz,
  sets_completed integer,
  reps_completed integer,
  weight_used text,
  duration_minutes integer,
  rating integer,
  notes text,
  week_number integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    wp.id,
    wp.completed_at,
    wp.sets_completed,
    wp.reps_completed,
    wp.weight_used,
    wp.duration_minutes,
    wp.rating,
    wp.notes,
    wp.week_number
  FROM public.workout_progress wp
  WHERE wp.member_id = p_member_id
    AND wp.exercise_id = p_exercise_id
  ORDER BY wp.completed_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 7. Function: Get Personal Records (PRs)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_exercise_personal_record(
  p_member_id uuid,
  p_exercise_id uuid
)
RETURNS TABLE (
  max_weight numeric,
  max_weight_date timestamptz,
  max_volume numeric,
  max_volume_date timestamptz,
  total_sessions integer,
  last_completed timestamptz
) AS $$
BEGIN
  RETURN QUERY
  WITH weight_pr AS (
    SELECT
      CASE
        WHEN weight_used ~ '^[0-9]+\.?[0-9]*' THEN
          CAST(regexp_replace(weight_used, '[^0-9.]', '', 'g') AS numeric)
        ELSE 0
      END as weight_value,
      completed_at
    FROM public.workout_progress
    WHERE member_id = p_member_id
      AND exercise_id = p_exercise_id
      AND weight_used IS NOT NULL
      AND weight_used != ''
  ),
  volume_pr AS (
    SELECT
      (sets_completed * CAST(reps_completed AS numeric) *
       CASE
         WHEN weight_used ~ '^[0-9]+\.?[0-9]*' THEN
           CAST(regexp_replace(weight_used, '[^0-9.]', '', 'g') AS numeric)
         ELSE 0
       END) as volume,
      completed_at
    FROM public.workout_progress
    WHERE member_id = p_member_id
      AND exercise_id = p_exercise_id
  )
  SELECT
    (SELECT MAX(weight_value) FROM weight_pr),
    (SELECT completed_at FROM weight_pr WHERE weight_value = (SELECT MAX(weight_value) FROM weight_pr) LIMIT 1),
    (SELECT MAX(volume) FROM volume_pr),
    (SELECT completed_at FROM volume_pr WHERE volume = (SELECT MAX(volume) FROM volume_pr) LIMIT 1),
    (SELECT COUNT(*)::integer FROM public.workout_progress WHERE member_id = p_member_id AND exercise_id = p_exercise_id),
    (SELECT MAX(completed_at) FROM public.workout_progress WHERE member_id = p_member_id AND exercise_id = p_exercise_id);
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 8. Function: Update or Insert Workout Progress (Prevent Duplicates)
-- ============================================================================

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
BEGIN
  v_today := CURRENT_DATE;

  -- Get current week number for this plan
  v_week_number := get_plan_current_week(p_plan_id);

  -- Try to update existing log for today
  UPDATE public.workout_progress
  SET
    sets_completed = p_sets_completed,
    reps_completed = p_reps_completed,
    weight_used = p_weight_used,
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
      p_weight_used,
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

-- ============================================================================
-- 9. Trigger: Auto-update current week on workout plans
-- ============================================================================

CREATE OR REPLACE FUNCTION update_plan_current_week()
RETURNS TRIGGER AS $$
BEGIN
  NEW.current_week := get_plan_current_week(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_plan_current_week
  BEFORE UPDATE ON public.workout_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_plan_current_week();

-- ============================================================================
-- 10. Update existing workout_progress records with plan_id and completed_date
-- ============================================================================

-- Backfill plan_id for existing progress records
UPDATE public.workout_progress wp
SET plan_id = we.plan_id
FROM public.workout_exercises we
WHERE wp.exercise_id = we.id
  AND wp.plan_id IS NULL;

-- Backfill completed_date for existing progress records
UPDATE public.workout_progress
SET completed_date = immutable_date(completed_at)
WHERE completed_date IS NULL;

-- ============================================================================
-- 11. Grant permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_plan_current_week(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_week_dates(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_week_completion_stats(uuid, uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_exercise_history(uuid, uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_exercise_personal_record(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_workout_progress(uuid, uuid, uuid, integer, integer, text, integer, integer, text) TO authenticated;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Summary of changes:
-- ✅ Added start_date and current_week to workout_plans
-- ✅ Added week_number and plan_id to workout_progress
-- ✅ Added unique constraint to prevent duplicate daily logs
-- ✅ Created function to calculate current week
-- ✅ Created function to get week completion stats
-- ✅ Created function to get exercise history
-- ✅ Created function to get personal records
-- ✅ Created upsert function to prevent duplicates
-- ✅ Added trigger to auto-update current week
-- ✅ Backfilled existing data
