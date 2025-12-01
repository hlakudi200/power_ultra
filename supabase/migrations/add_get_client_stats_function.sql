-- ============================================================================
-- Add get_client_stats RPC Function
-- ============================================================================
-- This function returns statistics for a specific client assignment
-- Used in trainer dashboard to show client compliance and workout metrics

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
