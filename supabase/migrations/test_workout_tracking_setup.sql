-- ============================================================================
-- Test Data Setup for Enhanced Workout Tracking
-- ============================================================================
-- Run this to create test data for testing the workout tracking system

-- IMPORTANT: Replace the IDs below with actual IDs from your database
-- Get these by running: SELECT id, email FROM profiles LIMIT 5;

-- ============================================================================
-- Step 1: Mark an instructor as personal trainer
-- ============================================================================

-- First, check existing instructors
SELECT id, name, user_id, is_personal_trainer FROM instructors LIMIT 5;

-- Update one to be a personal trainer (replace 'INSTRUCTOR_NAME' or use ID)
UPDATE instructors SET
  is_personal_trainer = true,
  specializations = ARRAY['Strength Training', 'Weight Loss', 'Muscle Building'],
  certifications = ARRAY['NASM-CPT', 'CSCS'],
  max_clients = 15,
  bio = 'Certified personal trainer with 10+ years of experience in strength training and nutrition coaching.'
WHERE name = 'YOUR_INSTRUCTOR_NAME';  -- Or use: WHERE id = 'instructor-uuid'

-- Verify it worked
SELECT id, name, is_personal_trainer, specializations FROM instructors WHERE is_personal_trainer = true;

-- ============================================================================
-- Step 2: Verify you have a member to assign
-- ============================================================================

-- Check available members (non-admin users)
SELECT id, email, first_name, last_name
FROM profiles
WHERE is_admin = false
LIMIT 5;

-- ============================================================================
-- Step 3: Test the new weekly tracking features
-- ============================================================================

-- After admin assigns member to trainer via UI and trainer creates plan via UI,
-- you can test these queries:

-- Check current week of a plan
SELECT
  id,
  title,
  start_date,
  current_week,
  duration_weeks,
  get_plan_current_week(id) as calculated_week
FROM workout_plans
WHERE status = 'active';

-- Get week dates for a plan
SELECT * FROM get_current_week_dates('[YOUR_PLAN_ID]');

-- Get week completion stats
SELECT * FROM get_week_completion_stats(
  '[MEMBER_ID]',
  '[PLAN_ID]',
  1  -- week number
);

-- ============================================================================
-- Step 4: Manually create test plan and exercises (optional - or use UI)
-- ============================================================================

-- If you want to manually create test data instead of using the UI:

/*
-- Get assignment ID first
SELECT id FROM trainer_assignments
WHERE member_id = '[MEMBER_ID]'
  AND trainer_id = '[TRAINER_ID]'
  AND status = 'active';

-- Create a test workout plan
INSERT INTO workout_plans (
  assignment_id,
  title,
  description,
  goals,
  duration_weeks,
  created_by,
  status,
  start_date
) VALUES (
  '[ASSIGNMENT_ID]',
  '12-Week Strength Building Program',
  'Progressive overload program focusing on compound movements',
  'Increase overall strength, build lean muscle mass, improve form and technique',
  12,
  '[TRAINER_ID]',
  'active',
  CURRENT_DATE  -- Plan starts today
) RETURNING id;

-- Create exercises for Monday
INSERT INTO workout_exercises (
  plan_id,
  day_of_week,
  exercise_name,
  exercise_type,
  sets,
  reps,
  weight,
  rest_seconds,
  notes,
  order_index
) VALUES
  ('[PLAN_ID]', 'Monday', 'Barbell Bench Press', 'strength', 4, '8-10', '135 lbs', 120, 'Focus on controlled descent', 0),
  ('[PLAN_ID]', 'Monday', 'Barbell Squat', 'strength', 4, '8-10', '185 lbs', 120, 'Depth to parallel or below', 1),
  ('[PLAN_ID]', 'Monday', 'Barbell Deadlift', 'strength', 3, '6-8', '225 lbs', 180, 'Keep back straight', 2),
  ('[PLAN_ID]', 'Monday', 'Dumbbell Shoulder Press', 'strength', 3, '10-12', '35 lbs', 90, 'Full range of motion', 3);

-- Create exercises for Wednesday
INSERT INTO workout_exercises (
  plan_id,
  day_of_week,
  exercise_name,
  exercise_type,
  sets,
  reps,
  weight,
  rest_seconds,
  notes,
  order_index
) VALUES
  ('[PLAN_ID]', 'Wednesday', 'Pull-ups', 'strength', 4, '8-10', 'bodyweight', 90, 'Use assistance if needed', 0),
  ('[PLAN_ID]', 'Wednesday', 'Barbell Row', 'strength', 4, '8-10', '115 lbs', 90, 'Pull to lower chest', 1),
  ('[PLAN_ID]', 'Wednesday', 'Dumbbell Bicep Curl', 'strength', 3, '10-12', '25 lbs', 60, 'No swinging', 2);

-- Create exercises for Friday
INSERT INTO workout_exercises (
  plan_id,
  day_of_week,
  exercise_name,
  exercise_type,
  sets,
  reps,
  weight,
  rest_seconds,
  notes,
  order_index
) VALUES
  ('[PLAN_ID]', 'Friday', 'Incline Dumbbell Press', 'strength', 4, '10-12', '45 lbs', 90, '30-45 degree incline', 0),
  ('[PLAN_ID]', 'Friday', 'Romanian Deadlift', 'strength', 3, '10-12', '135 lbs', 90, 'Focus on hamstrings', 1),
  ('[PLAN_ID]', 'Friday', 'Running', 'cardio', 1, '20 min', NULL, 0, 'Moderate pace', 2);
*/

-- ============================================================================
-- Step 5: Test duplicate prevention
-- ============================================================================

-- After logging a workout via UI, try this query to verify uniqueness:
SELECT
  member_id,
  exercise_id,
  completed_date,
  sets_completed,
  reps_completed,
  weight_used,
  completed_at,
  COUNT(*) as count
FROM workout_progress
WHERE completed_date = CURRENT_DATE
GROUP BY member_id, exercise_id, completed_date, sets_completed, reps_completed, weight_used, completed_at
HAVING COUNT(*) > 1;
-- Should return 0 rows (no duplicates)

-- ============================================================================
-- Step 6: Test week tracking
-- ============================================================================

-- Simulate plan that started 8 days ago (should be in Week 2)
UPDATE workout_plans
SET start_date = CURRENT_DATE - INTERVAL '8 days'
WHERE id = '[YOUR_PLAN_ID]';

-- Check current week (should show 2)
SELECT
  title,
  start_date,
  get_plan_current_week(id) as current_week
FROM workout_plans
WHERE id = '[YOUR_PLAN_ID]';

-- Get week dates for Week 2
SELECT * FROM get_current_week_dates('[YOUR_PLAN_ID]');

-- Reset to today if needed
UPDATE workout_plans
SET start_date = CURRENT_DATE
WHERE id = '[YOUR_PLAN_ID]';

-- ============================================================================
-- Summary of what to check
-- ============================================================================

/*
CHECKLIST:
□ Instructor marked as personal trainer
□ Member assigned to trainer (via admin UI)
□ Workout plan created (via trainer UI)
□ Exercises added to plan
□ Plan shows "Week X of Y" in UI
□ Week progress bar displays correctly
□ Member can log workout
□ Exercise shows checkmark after logging
□ Logging same exercise again updates (doesn't duplicate)
□ Next week, progress resets to 0%
*/
