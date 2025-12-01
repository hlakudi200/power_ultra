-- ============================================================================
-- Fix get_client_stats RPC Function
-- ============================================================================
-- This fixes the EXTRACT error by using proper date arithmetic

DROP FUNCTION IF EXISTS get_client_stats(uuid, uuid);

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
  INNER JOIN workout_progress wp ON we.id = wp.exercise_id
    AND wp.member_id = p_member_id
    AND wp.completed_date >= CURRENT_DATE - INTERVAL '7 days'
  WHERE we.plan_id = v_plan_id;

  -- Count total unique workout sessions logged (all time)
  SELECT COUNT(DISTINCT completed_date) INTO v_workouts_count
  FROM workout_progress
  WHERE member_id = p_member_id
    AND plan_id = v_plan_id;

  -- Calculate current streak (consecutive days with at least 1 workout)
  -- Simplified streak calculation
  WITH daily_workouts AS (
    SELECT DISTINCT completed_date
    FROM workout_progress
    WHERE member_id = p_member_id
      AND completed_date IS NOT NULL
    ORDER BY completed_date DESC
  ),
  streak_days AS (
    SELECT
      completed_date,
      completed_date - (ROW_NUMBER() OVER (ORDER BY completed_date DESC))::integer AS streak_group
    FROM daily_workouts
    WHERE completed_date >= CURRENT_DATE - INTERVAL '365 days'
  ),
  current_streak AS (
    SELECT COUNT(*)::integer AS days
    FROM streak_days
    WHERE streak_group = (
      SELECT streak_group
      FROM streak_days
      WHERE completed_date = (
        SELECT MAX(completed_date)
        FROM daily_workouts
      )
      LIMIT 1
    )
    AND completed_date <= CURRENT_DATE
  )
  SELECT COALESCE(days, 0) INTO v_streak
  FROM current_streak;

  -- If no streak found, set to 0
  v_streak := COALESCE(v_streak, 0);

  -- Calculate compliance percentage
  RETURN QUERY
  SELECT
    CASE
      WHEN v_total_exercises > 0
      THEN ROUND((v_completed_exercises::numeric / v_total_exercises) * 100, 1)
      ELSE 0::numeric
    END as compliance_percentage,
    COALESCE(v_workouts_count, 0) as workouts_logged,
    v_streak as current_streak;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_client_stats(uuid, uuid) TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_client_stats IS 'Returns client statistics: compliance percentage (last 7 days), total workouts logged, and current workout streak';
