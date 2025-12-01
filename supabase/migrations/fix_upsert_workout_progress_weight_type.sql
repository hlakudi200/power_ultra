-- ============================================================================
-- Fix upsert_workout_progress function - Handle weight_used type mismatch
-- ============================================================================
-- The workout_progress.weight_used column is numeric(10,2)
-- But the function parameter was text, causing 400 errors
-- This updates the function to properly cast text weight to numeric

DROP FUNCTION IF EXISTS upsert_workout_progress(uuid, uuid, uuid, integer, integer, text, integer, integer, text);

CREATE OR REPLACE FUNCTION upsert_workout_progress(
  p_member_id uuid,
  p_exercise_id uuid,
  p_plan_id uuid,
  p_sets_completed integer,
  p_reps_completed integer,
  p_weight_used text,  -- Accepts text like "135" or "135 lbs"
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

  -- Get current week number for this plan
  v_week_number := get_plan_current_week(p_plan_id);

  -- Extract numeric value from weight text (remove "lbs", "kg", etc.)
  IF p_weight_used IS NOT NULL AND p_weight_used != '' THEN
    -- Extract numbers and decimal point only
    v_weight_numeric := CAST(regexp_replace(p_weight_used, '[^0-9.]', '', 'g') AS numeric);
  ELSE
    v_weight_numeric := NULL;
  END IF;

  -- Try to update existing log for today
  UPDATE public.workout_progress
  SET
    sets_completed = p_sets_completed,
    reps_completed = p_reps_completed,
    weight_used = v_weight_numeric,  -- Use numeric value
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
      v_weight_numeric,  -- Use numeric value
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION upsert_workout_progress(uuid, uuid, uuid, integer, integer, text, integer, integer, text) TO authenticated;

-- Add comment
COMMENT ON FUNCTION upsert_workout_progress IS 'Inserts or updates workout progress for today. Accepts weight as text and converts to numeric. Prevents duplicate logs per exercise per day.';
