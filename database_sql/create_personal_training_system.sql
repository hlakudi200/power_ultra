-- =====================================================
-- Personal Training System Database Migration
-- =====================================================
-- This migration creates tables and functions for the personal training system
-- Members can be assigned to personal trainers who create custom workout plans

-- =====================================================
-- 1. Extend Instructors Table for Personal Trainers
-- =====================================================

-- Add trainer-specific columns to existing instructors table
ALTER TABLE public.instructors
ADD COLUMN IF NOT EXISTS is_personal_trainer boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS specializations text[],
ADD COLUMN IF NOT EXISTS certifications text[],
ADD COLUMN IF NOT EXISTS max_clients integer DEFAULT 15,
ADD COLUMN IF NOT EXISTS hourly_rate numeric(10,2),
ADD COLUMN IF NOT EXISTS bio text,
ADD COLUMN IF NOT EXISTS years_experience integer;

-- Add comments
COMMENT ON COLUMN public.instructors.is_personal_trainer IS 'Whether this instructor also does personal training';
COMMENT ON COLUMN public.instructors.specializations IS 'Array of specializations (e.g., ["Strength Training", "Weight Loss", "Sports Performance"])';
COMMENT ON COLUMN public.instructors.certifications IS 'Array of certifications (e.g., ["NASM-CPT", "CSCS", "Precision Nutrition"])';
COMMENT ON COLUMN public.instructors.max_clients IS 'Maximum number of personal training clients this trainer can handle';
COMMENT ON COLUMN public.instructors.hourly_rate IS 'Hourly rate for personal training sessions';

-- =====================================================
-- 2. Create Trainer Assignments Table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.trainer_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trainer_id uuid NOT NULL REFERENCES public.instructors(id) ON DELETE CASCADE,
  assigned_at timestamp with time zone DEFAULT now(),
  assigned_by uuid REFERENCES public.profiles(id), -- Admin who made the assignment
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  start_date date DEFAULT CURRENT_DATE,
  end_date date,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create partial unique index to ensure member can only have ONE active trainer
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_assignment_per_member
  ON public.trainer_assignments(member_id)
  WHERE (status = 'active');

-- Add comments
COMMENT ON TABLE public.trainer_assignments IS 'Assignments of members to personal trainers';
COMMENT ON COLUMN public.trainer_assignments.status IS 'active = currently training, paused = temporarily stopped, completed = finished';
COMMENT ON COLUMN public.trainer_assignments.assigned_by IS 'Admin user who created this assignment';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_trainer_assignments_member ON public.trainer_assignments(member_id);
CREATE INDEX IF NOT EXISTS idx_trainer_assignments_trainer ON public.trainer_assignments(trainer_id);
CREATE INDEX IF NOT EXISTS idx_trainer_assignments_status ON public.trainer_assignments(status);

-- =====================================================
-- 3. Create Workout Plans Table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.workout_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.trainer_assignments(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  goals text, -- "Build strength", "Lose weight", "Improve endurance"
  duration_weeks integer DEFAULT 4,
  created_by uuid NOT NULL REFERENCES public.instructors(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived'))
);

-- Create partial unique index to ensure one active plan per assignment
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_plan_per_assignment
  ON public.workout_plans(assignment_id)
  WHERE (status = 'active');

-- Add comments
COMMENT ON TABLE public.workout_plans IS 'Custom workout plans created by trainers for their clients';
COMMENT ON COLUMN public.workout_plans.goals IS 'Client goals for this plan';
COMMENT ON COLUMN public.workout_plans.duration_weeks IS 'Expected duration of the plan in weeks';
COMMENT ON COLUMN public.workout_plans.status IS 'active = current plan, completed = finished, archived = old plan';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_workout_plans_assignment ON public.workout_plans(assignment_id);
CREATE INDEX IF NOT EXISTS idx_workout_plans_trainer ON public.workout_plans(created_by);
CREATE INDEX IF NOT EXISTS idx_workout_plans_status ON public.workout_plans(status);

-- =====================================================
-- 4. Create Workout Exercises Table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.workout_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.workout_plans(id) ON DELETE CASCADE,
  day_of_week text NOT NULL CHECK (day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
  exercise_name text NOT NULL,
  exercise_type text CHECK (exercise_type IN ('strength', 'cardio', 'flexibility', 'sports', 'other')),
  sets integer,
  reps text, -- Can be "8-12", "10", "AMRAP", etc.
  weight text, -- Can be "60% of max", "135 lbs", "bodyweight", etc.
  rest_seconds integer DEFAULT 60,
  notes text,
  order_index integer DEFAULT 0, -- Order within the day
  created_at timestamp with time zone DEFAULT now()
);

-- Add comments
COMMENT ON TABLE public.workout_exercises IS 'Individual exercises within workout plans';
COMMENT ON COLUMN public.workout_exercises.reps IS 'Target reps (can be range like "8-12" or "AMRAP")';
COMMENT ON COLUMN public.workout_exercises.weight IS 'Target weight (can be percentage, fixed weight, or "bodyweight")';
COMMENT ON COLUMN public.workout_exercises.order_index IS 'Order of exercise within the day (lower = first)';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_workout_exercises_plan ON public.workout_exercises(plan_id);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_day ON public.workout_exercises(plan_id, day_of_week);

-- =====================================================
-- 5. Create Workout Progress Table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.workout_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id uuid NOT NULL REFERENCES public.workout_exercises(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  completed_at timestamp with time zone DEFAULT now(),
  sets_completed integer,
  reps_completed integer,
  weight_used numeric(10,2),
  duration_minutes integer, -- For cardio exercises
  notes text,
  rating integer CHECK (rating >= 1 AND rating <= 5), -- Difficulty rating (1 = easy, 5 = very hard)
  created_at timestamp with time zone DEFAULT now()
);

-- Add comments
COMMENT ON TABLE public.workout_progress IS 'Logs of workout completions by members';
COMMENT ON COLUMN public.workout_progress.rating IS 'Difficulty rating: 1 = too easy, 3 = just right, 5 = too hard';
COMMENT ON COLUMN public.workout_progress.duration_minutes IS 'Duration for cardio exercises';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_workout_progress_member ON public.workout_progress(member_id);
CREATE INDEX IF NOT EXISTS idx_workout_progress_exercise ON public.workout_progress(exercise_id);
CREATE INDEX IF NOT EXISTS idx_workout_progress_date ON public.workout_progress(completed_at);

-- =====================================================
-- 6. Create Trainer Notes Table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.trainer_client_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.trainer_assignments(id) ON DELETE CASCADE,
  trainer_id uuid NOT NULL REFERENCES public.instructors(id),
  note text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  is_private boolean DEFAULT true, -- Private to trainer or visible to client
  updated_at timestamp with time zone DEFAULT now()
);

-- Add comments
COMMENT ON TABLE public.trainer_client_notes IS 'Notes that trainers add about their clients';
COMMENT ON COLUMN public.trainer_client_notes.is_private IS 'If true, only trainer and admins can see. If false, client can see too.';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_trainer_notes_assignment ON public.trainer_client_notes(assignment_id);
CREATE INDEX IF NOT EXISTS idx_trainer_notes_trainer ON public.trainer_client_notes(trainer_id);

-- =====================================================
-- 7. Enable Row Level Security
-- =====================================================

ALTER TABLE public.trainer_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainer_client_notes ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 8. RLS Policies for Trainer Assignments
-- =====================================================

-- Members can view their own assignments
CREATE POLICY "Members view own assignments"
  ON public.trainer_assignments FOR SELECT
  USING (auth.uid() = member_id);

-- Trainers can view assignments where they are the trainer
CREATE POLICY "Trainers view their assignments"
  ON public.trainer_assignments FOR SELECT
  USING (
    trainer_id IN (
      SELECT id FROM public.instructors WHERE user_id = auth.uid()
    )
  );

-- Admins can manage all assignments
CREATE POLICY "Admins manage all assignments"
  ON public.trainer_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- =====================================================
-- 9. RLS Policies for Workout Plans
-- =====================================================

-- Members can view plans for their assignments
CREATE POLICY "Members view own plans"
  ON public.workout_plans FOR SELECT
  USING (
    assignment_id IN (
      SELECT id FROM public.trainer_assignments WHERE member_id = auth.uid()
    )
  );

-- Trainers can manage plans for their clients
CREATE POLICY "Trainers manage client plans"
  ON public.workout_plans FOR ALL
  USING (
    assignment_id IN (
      SELECT ta.id FROM public.trainer_assignments ta
      JOIN public.instructors i ON ta.trainer_id = i.id
      WHERE i.user_id = auth.uid()
    )
  );

-- Admins can manage all plans
CREATE POLICY "Admins manage all plans"
  ON public.workout_plans FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true
    )
  );

-- =====================================================
-- 10. RLS Policies for Workout Exercises
-- =====================================================

-- Members can view exercises in their plans
CREATE POLICY "Members view own exercises"
  ON public.workout_exercises FOR SELECT
  USING (
    plan_id IN (
      SELECT wp.id FROM public.workout_plans wp
      JOIN public.trainer_assignments ta ON wp.assignment_id = ta.id
      WHERE ta.member_id = auth.uid()
    )
  );

-- Trainers can manage exercises in their plans
CREATE POLICY "Trainers manage client exercises"
  ON public.workout_exercises FOR ALL
  USING (
    plan_id IN (
      SELECT wp.id FROM public.workout_plans wp
      JOIN public.trainer_assignments ta ON wp.assignment_id = ta.id
      JOIN public.instructors i ON ta.trainer_id = i.id
      WHERE i.user_id = auth.uid()
    )
  );

-- Admins can manage all exercises
CREATE POLICY "Admins manage all exercises"
  ON public.workout_exercises FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true
    )
  );

-- =====================================================
-- 11. RLS Policies for Workout Progress
-- =====================================================

-- Members can manage their own progress
CREATE POLICY "Members manage own progress"
  ON public.workout_progress FOR ALL
  USING (auth.uid() = member_id)
  WITH CHECK (auth.uid() = member_id);

-- Trainers can view client progress
CREATE POLICY "Trainers view client progress"
  ON public.workout_progress FOR SELECT
  USING (
    member_id IN (
      SELECT ta.member_id FROM public.trainer_assignments ta
      JOIN public.instructors i ON ta.trainer_id = i.id
      WHERE i.user_id = auth.uid() AND ta.status = 'active'
    )
  );

-- Admins can view all progress
CREATE POLICY "Admins view all progress"
  ON public.workout_progress FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true
    )
  );

-- =====================================================
-- 12. RLS Policies for Trainer Notes
-- =====================================================

-- Trainers can manage their own notes
CREATE POLICY "Trainers manage own notes"
  ON public.trainer_client_notes FOR ALL
  USING (
    trainer_id IN (
      SELECT id FROM public.instructors WHERE user_id = auth.uid()
    )
  );

-- Members can view non-private notes about them
CREATE POLICY "Members view shared notes"
  ON public.trainer_client_notes FOR SELECT
  USING (
    is_private = false
    AND assignment_id IN (
      SELECT id FROM public.trainer_assignments WHERE member_id = auth.uid()
    )
  );

-- Admins can view all notes
CREATE POLICY "Admins view all notes"
  ON public.trainer_client_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true
    )
  );

-- =====================================================
-- 13. Helper Function: Get Trainer's Client Count
-- =====================================================

CREATE OR REPLACE FUNCTION get_trainer_client_count(p_trainer_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  client_count integer;
BEGIN
  SELECT COUNT(*) INTO client_count
  FROM public.trainer_assignments
  WHERE trainer_id = p_trainer_id
    AND status = 'active';

  RETURN client_count;
END;
$$;

COMMENT ON FUNCTION get_trainer_client_count IS 'Returns the number of active clients for a trainer';

-- =====================================================
-- 14. Helper Function: Check if Trainer is at Capacity
-- =====================================================

CREATE OR REPLACE FUNCTION is_trainer_at_capacity(p_trainer_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  current_count integer;
  max_count integer;
BEGIN
  SELECT max_clients INTO max_count
  FROM public.instructors
  WHERE id = p_trainer_id;

  SELECT COUNT(*) INTO current_count
  FROM public.trainer_assignments
  WHERE trainer_id = p_trainer_id
    AND status = 'active';

  RETURN current_count >= COALESCE(max_count, 15);
END;
$$;

COMMENT ON FUNCTION is_trainer_at_capacity IS 'Checks if a trainer has reached their maximum client capacity';

-- =====================================================
-- 15. Helper Function: Get Member's Active Trainer
-- =====================================================

CREATE OR REPLACE FUNCTION get_member_active_trainer(p_member_id uuid)
RETURNS TABLE (
  assignment_id uuid,
  trainer_id uuid,
  trainer_name text,
  trainer_bio text,
  trainer_specializations text[],
  assigned_at timestamptz
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ta.id,
    ta.trainer_id,
    i.name,
    i.bio,
    i.specializations,
    ta.assigned_at
  FROM public.trainer_assignments ta
  JOIN public.instructors i ON ta.trainer_id = i.id
  WHERE ta.member_id = p_member_id
    AND ta.status = 'active'
  LIMIT 1;
END;
$$;

COMMENT ON FUNCTION get_member_active_trainer IS 'Returns the active trainer assignment for a member';

-- =====================================================
-- 16. Helper Function: Get Workout Completion Stats
-- =====================================================

CREATE OR REPLACE FUNCTION get_workout_completion_stats(
  p_member_id uuid,
  p_plan_id uuid
)
RETURNS TABLE (
  total_exercises integer,
  completed_exercises integer,
  completion_percentage numeric
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT we.id)::integer as total_exercises,
    COUNT(DISTINCT wp.exercise_id)::integer as completed_exercises,
    CASE
      WHEN COUNT(DISTINCT we.id) > 0
      THEN ROUND((COUNT(DISTINCT wp.exercise_id)::numeric / COUNT(DISTINCT we.id)::numeric) * 100, 2)
      ELSE 0
    END as completion_percentage
  FROM public.workout_exercises we
  LEFT JOIN public.workout_progress wp ON we.id = wp.exercise_id AND wp.member_id = p_member_id
  WHERE we.plan_id = p_plan_id;
END;
$$;

COMMENT ON FUNCTION get_workout_completion_stats IS 'Returns workout completion statistics for a member and plan';

-- =====================================================
-- 17. Helper Function: Get Weekly Workout Stats
-- =====================================================

CREATE OR REPLACE FUNCTION get_weekly_workout_stats(
  p_member_id uuid,
  p_weeks_back integer DEFAULT 1
)
RETURNS TABLE (
  week_start date,
  workouts_completed integer,
  total_exercises integer,
  avg_rating numeric
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE_TRUNC('week', wp.completed_at)::date as week_start,
    COUNT(DISTINCT DATE(wp.completed_at))::integer as workouts_completed,
    COUNT(*)::integer as total_exercises,
    ROUND(AVG(wp.rating), 2) as avg_rating
  FROM public.workout_progress wp
  WHERE wp.member_id = p_member_id
    AND wp.completed_at >= CURRENT_DATE - (p_weeks_back * 7)
  GROUP BY DATE_TRUNC('week', wp.completed_at)
  ORDER BY week_start DESC;
END;
$$;

COMMENT ON FUNCTION get_weekly_workout_stats IS 'Returns weekly workout statistics for a member';

-- =====================================================
-- 18. Trigger Function: Prevent Trainer Over-Capacity
-- =====================================================

CREATE OR REPLACE FUNCTION check_trainer_capacity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  current_clients integer;
  max_capacity integer;
BEGIN
  -- Only check for new assignments or reactivations
  IF (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.status = 'active' AND OLD.status != 'active')) THEN
    -- Get trainer's max capacity
    SELECT max_clients INTO max_capacity
    FROM public.instructors
    WHERE id = NEW.trainer_id;

    -- Count active clients (excluding the current assignment if it's an update)
    SELECT COUNT(*) INTO current_clients
    FROM public.trainer_assignments
    WHERE trainer_id = NEW.trainer_id
      AND status = 'active'
      AND (TG_OP = 'INSERT' OR id != NEW.id);

    -- Check if at capacity
    IF current_clients >= COALESCE(max_capacity, 15) THEN
      RAISE EXCEPTION 'Trainer is at full capacity (% / %)', current_clients, COALESCE(max_capacity, 15);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION check_trainer_capacity IS 'Prevents assigning more clients than a trainer can handle';

-- Create trigger
DROP TRIGGER IF EXISTS enforce_trainer_capacity ON public.trainer_assignments;
CREATE TRIGGER enforce_trainer_capacity
  BEFORE INSERT OR UPDATE ON public.trainer_assignments
  FOR EACH ROW
  EXECUTE FUNCTION check_trainer_capacity();

-- =====================================================
-- 19. Trigger Function: Update Timestamps
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create triggers for tables with updated_at
DROP TRIGGER IF EXISTS update_trainer_assignments_updated_at ON public.trainer_assignments;
CREATE TRIGGER update_trainer_assignments_updated_at
  BEFORE UPDATE ON public.trainer_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_workout_plans_updated_at ON public.workout_plans;
CREATE TRIGGER update_workout_plans_updated_at
  BEFORE UPDATE ON public.workout_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_trainer_notes_updated_at ON public.trainer_client_notes;
CREATE TRIGGER update_trainer_notes_updated_at
  BEFORE UPDATE ON public.trainer_client_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 20. Grant Permissions
-- =====================================================

-- Grant execute on functions to authenticated users
GRANT EXECUTE ON FUNCTION get_trainer_client_count TO authenticated;
GRANT EXECUTE ON FUNCTION is_trainer_at_capacity TO authenticated;
GRANT EXECUTE ON FUNCTION get_member_active_trainer TO authenticated;
GRANT EXECUTE ON FUNCTION get_workout_completion_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_weekly_workout_stats TO authenticated;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Personal Training System Migration Complete!';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Tables created:';
  RAISE NOTICE '  - trainer_assignments';
  RAISE NOTICE '  - workout_plans';
  RAISE NOTICE '  - workout_exercises';
  RAISE NOTICE '  - workout_progress';
  RAISE NOTICE '  - trainer_client_notes';
  RAISE NOTICE '';
  RAISE NOTICE 'Instructors table extended with:';
  RAISE NOTICE '  - is_personal_trainer, specializations, certifications';
  RAISE NOTICE '  - max_clients, hourly_rate, bio, years_experience';
  RAISE NOTICE '';
  RAISE NOTICE 'Functions created: 5 helper functions';
  RAISE NOTICE 'Triggers created: 4 triggers';
  RAISE NOTICE 'RLS policies: 17 policies enabled';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Update instructors to set is_personal_trainer = true';
  RAISE NOTICE '  2. Add specializations and certifications';
  RAISE NOTICE '  3. Create frontend components';
  RAISE NOTICE '==============================================';
END $$;
