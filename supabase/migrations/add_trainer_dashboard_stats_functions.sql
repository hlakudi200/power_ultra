-- ============================================================================
-- Trainer Dashboard Statistics Functions
-- ============================================================================
-- This migration adds all the RPC functions needed for the trainer dashboard
-- to display real statistics for clients and plans

-- ============================================================================
-- 1. Get batch client stats (fixes N+1 query issue in ClientList)
-- ============================================================================
-- Returns compliance and workout stats for multiple clients at once
CREATE OR REPLACE FUNCTION get_batch_client_stats(p_assignment_ids uuid[])
RETURNS TABLE (
  assignment_id uuid,
  compliance_percentage numeric,
  workouts_logged integer,
  has_active_plan boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ta.id AS assignment_id,
    COALESCE(
      CASE
        WHEN COUNT(DISTINCT we.id) > 0 THEN
          ROUND((COUNT(DISTINCT wp.exercise_id)::numeric / COUNT(DISTINCT we.id)) * 100, 1)
        ELSE 0
      END,
      0
    ) AS compliance_percentage,
    COALESCE(COUNT(DISTINCT wp.completed_date), 0)::integer AS workouts_logged,
    EXISTS(
      SELECT 1 FROM workout_plans wpl
      WHERE wpl.assignment_id = ta.id AND wpl.status = 'active'
    ) AS has_active_plan
  FROM
    unnest(p_assignment_ids) AS ta(id)
    LEFT JOIN workout_plans wpl ON wpl.assignment_id = ta.id AND wpl.status = 'active'
    LEFT JOIN workout_exercises we ON we.plan_id = wpl.id
    LEFT JOIN workout_progress wp ON wp.exercise_id = we.id
      AND wp.member_id = (SELECT member_id FROM trainer_assignments WHERE id = ta.id)
      AND wp.completed_date >= CURRENT_DATE - INTERVAL '7 days'
  GROUP BY ta.id;
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION get_batch_client_stats(uuid[]) TO authenticated;

COMMENT ON FUNCTION get_batch_client_stats IS 'Returns compliance and workout stats for multiple clients at once. Compliance is based on last 7 days.';

-- ============================================================================
-- 2. Get trainer dashboard overview stats
-- ============================================================================
-- Returns total active plans, average compliance across all clients
CREATE OR REPLACE FUNCTION get_trainer_dashboard_stats(p_trainer_id uuid)
RETURNS TABLE (
  total_active_clients integer,
  total_active_plans integer,
  avg_compliance_percentage numeric,
  total_workouts_this_week integer
) AS $$
DECLARE
  v_active_clients integer;
  v_active_plans integer;
  v_avg_compliance numeric;
  v_workouts_this_week integer;
BEGIN
  -- Count active clients
  SELECT COUNT(*)::integer INTO v_active_clients
  FROM trainer_assignments
  WHERE trainer_id = p_trainer_id AND status = 'active';

  -- Count active workout plans
  SELECT COUNT(*)::integer INTO v_active_plans
  FROM workout_plans wpl
  INNER JOIN trainer_assignments ta ON ta.id = wpl.assignment_id
  WHERE ta.trainer_id = p_trainer_id
    AND wpl.status = 'active';

  -- Calculate average compliance (last 7 days)
  WITH client_compliance AS (
    SELECT
      ta.id AS assignment_id,
      ta.member_id,
      wpl.id AS plan_id,
      COUNT(DISTINCT we.id) AS total_exercises,
      COUNT(DISTINCT wp.exercise_id) AS completed_exercises
    FROM trainer_assignments ta
    LEFT JOIN workout_plans wpl ON wpl.assignment_id = ta.id AND wpl.status = 'active'
    LEFT JOIN workout_exercises we ON we.plan_id = wpl.id
    LEFT JOIN workout_progress wp ON wp.exercise_id = we.id
      AND wp.member_id = ta.member_id
      AND wp.completed_date >= CURRENT_DATE - INTERVAL '7 days'
    WHERE ta.trainer_id = p_trainer_id
      AND ta.status = 'active'
      AND wpl.id IS NOT NULL
    GROUP BY ta.id, ta.member_id, wpl.id
  )
  SELECT
    COALESCE(
      ROUND(
        AVG(
          CASE WHEN total_exercises > 0
            THEN (completed_exercises::numeric / total_exercises) * 100
            ELSE 0
          END
        ),
        1
      ),
      0
    )
  INTO v_avg_compliance
  FROM client_compliance;

  -- Count workouts logged this week (Monday to today)
  SELECT COUNT(DISTINCT wp.id)::integer INTO v_workouts_this_week
  FROM workout_progress wp
  INNER JOIN workout_plans wpl ON wpl.id = wp.plan_id
  INNER JOIN trainer_assignments ta ON ta.id = wpl.assignment_id
  WHERE ta.trainer_id = p_trainer_id
    AND wp.completed_date >= date_trunc('week', CURRENT_DATE); -- Start of current week

  -- Return all stats
  RETURN QUERY
  SELECT
    v_active_clients,
    v_active_plans,
    v_avg_compliance,
    v_workouts_this_week;
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION get_trainer_dashboard_stats(uuid) TO authenticated;

COMMENT ON FUNCTION get_trainer_dashboard_stats IS 'Returns overview statistics for trainer dashboard: active clients, active plans, average compliance, and workouts this week.';

-- ============================================================================
-- 3. Get individual client stats (enhanced version of existing function)
-- ============================================================================
-- This is an improved version that handles edge cases better
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
  v_streak integer := 0;
  v_check_date date;
  v_has_workout boolean;
BEGIN
  -- Get active plan ID
  SELECT id INTO v_plan_id
  FROM workout_plans
  WHERE assignment_id = p_assignment_id AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;

  -- If no active plan, return zeros
  IF v_plan_id IS NULL THEN
    RETURN QUERY SELECT 0::numeric, 0::integer, 0::integer;
    RETURN;
  END IF;

  -- Count total exercises in plan
  SELECT COUNT(DISTINCT id)::integer INTO v_total_exercises
  FROM workout_exercises
  WHERE plan_id = v_plan_id;

  -- Count completed exercises in last 7 days
  SELECT COUNT(DISTINCT we.id)::integer INTO v_completed_exercises
  FROM workout_exercises we
  INNER JOIN workout_progress wp ON we.id = wp.exercise_id
    AND wp.member_id = p_member_id
    AND wp.completed_date >= CURRENT_DATE - INTERVAL '7 days'
  WHERE we.plan_id = v_plan_id;

  -- Count total unique workout days (sessions)
  SELECT COUNT(DISTINCT completed_date)::integer INTO v_workouts_count
  FROM workout_progress
  WHERE member_id = p_member_id AND plan_id = v_plan_id;

  -- Calculate consecutive day streak (starting from today going backwards)
  v_check_date := CURRENT_DATE;
  LOOP
    -- Check if there's any workout logged on this date
    SELECT EXISTS(
      SELECT 1 FROM workout_progress
      WHERE member_id = p_member_id
        AND plan_id = v_plan_id
        AND completed_date = v_check_date
    ) INTO v_has_workout;

    EXIT WHEN NOT v_has_workout; -- Stop when we find a day without workout

    v_streak := v_streak + 1;
    v_check_date := v_check_date - INTERVAL '1 day';

    -- Safety limit: don't check more than 365 days back
    EXIT WHEN v_streak >= 365;
  END LOOP;

  -- Return compliance percentage, total workouts, and streak
  RETURN QUERY
  SELECT
    CASE WHEN v_total_exercises > 0
      THEN ROUND((v_completed_exercises::numeric / v_total_exercises) * 100, 1)
      ELSE 0::numeric
    END,
    COALESCE(v_workouts_count, 0),
    v_streak;
END;
$$ LANGUAGE plpgsql STABLE;

-- Note: GRANT already exists from previous migration, but adding for safety
GRANT EXECUTE ON FUNCTION get_client_stats(uuid, uuid) TO authenticated;

COMMENT ON FUNCTION get_client_stats IS 'Returns detailed stats for a single client: compliance (last 7 days), total workouts logged, and current consecutive day streak.';
