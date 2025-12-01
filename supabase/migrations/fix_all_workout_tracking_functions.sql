-- ============================================================================
-- Fix ALL workout tracking functions with EXTRACT errors
-- ============================================================================
-- This fixes the EXTRACT error in get_plan_current_week and related functions
-- The issue: EXTRACT(EPOCH FROM date - date) returns double precision, not integer

-- ============================================================================
-- 1. Fix get_plan_current_week function
-- ============================================================================

DROP FUNCTION IF EXISTS get_plan_current_week(uuid);

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

  -- If no start date, return 1
  IF v_start_date IS NULL THEN
    RETURN 1;
  END IF;

  -- Calculate weeks elapsed since start (simplified calculation)
  v_weeks_elapsed := FLOOR((CURRENT_DATE - v_start_date) / 7.0) + 1;

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

GRANT EXECUTE ON FUNCTION get_plan_current_week(uuid) TO authenticated;

-- ============================================================================
-- 2. Fix get_current_week_dates function
-- ============================================================================

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
  -- Get plan start date
  SELECT start_date INTO v_start_date
  FROM public.workout_plans
  WHERE id = p_plan_id;

  -- If no start date, use today
  IF v_start_date IS NULL THEN
    v_start_date := CURRENT_DATE;
  END IF;

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

GRANT EXECUTE ON FUNCTION get_current_week_dates(uuid) TO authenticated;

-- ============================================================================
-- 3. Fix get_week_completion_stats function
-- ============================================================================

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
  -- Get plan start date
  SELECT start_date INTO v_start_date
  FROM public.workout_plans
  WHERE id = p_plan_id;

  -- If no start date, use today
  IF v_start_date IS NULL THEN
    v_start_date := CURRENT_DATE;
  END IF;

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
  INNER JOIN public.workout_progress wp ON wp.exercise_id = we.id
    AND wp.member_id = p_member_id
    AND wp.completed_date BETWEEN v_week_start AND v_week_end
  WHERE we.plan_id = p_plan_id;

  -- Return stats
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

-- ============================================================================
-- 4. Recreate the trigger (to ensure it uses the fixed function)
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_update_plan_current_week ON public.workout_plans;

CREATE OR REPLACE FUNCTION update_plan_current_week()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update current_week if start_date exists
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

-- ============================================================================
-- Success message
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Workout tracking functions fixed successfully!';
  RAISE NOTICE 'Functions updated:';
  RAISE NOTICE '  - get_plan_current_week';
  RAISE NOTICE '  - get_current_week_dates';
  RAISE NOTICE '  - get_week_completion_stats';
  RAISE NOTICE '  - update_plan_current_week trigger';
END $$;
