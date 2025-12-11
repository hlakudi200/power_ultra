# Workout Tracking - Database Function Tests

## Overview
Test cases for database functions that power the workout tracking system. These tests validate the core business logic at the database level.

**Priority:** Critical
**Test Environment:** Supabase SQL Editor or psql
**Dependencies:**
- `enhance_workout_tracking.sql` migration applied
- `fix_upsert_workout_progress_weight_type.sql` migration applied

---

## Test Data Setup

Run this script before executing tests:

```sql
-- Clean up existing test data
DELETE FROM workout_progress WHERE member_id IN (
  SELECT id FROM profiles WHERE email LIKE 'test-workout-%'
);
DELETE FROM workout_exercises WHERE plan_id IN (
  SELECT id FROM workout_plans WHERE title LIKE 'TEST:%'
);
DELETE FROM workout_plans WHERE title LIKE 'TEST:%';
DELETE FROM trainer_assignments WHERE member_id IN (
  SELECT id FROM profiles WHERE email LIKE 'test-workout-%'
);

-- Create test member
INSERT INTO profiles (id, email, full_name)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'test-workout-member@example.com',
  'Test Member'
) ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

-- Create test trainer
INSERT INTO instructors (id, name, is_personal_trainer, is_active)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  'Test Trainer',
  true,
  true
) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Create test trainer assignment
INSERT INTO trainer_assignments (id, member_id, trainer_id, status, start_date)
VALUES (
  '33333333-3333-3333-3333-333333333333',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'active',
  '2024-11-01'
) ON CONFLICT (id) DO UPDATE SET status = 'active';

-- Create test workout plan (12-week plan starting Nov 25, 2024)
INSERT INTO workout_plans (
  id,
  assignment_id,
  title,
  description,
  goals,
  duration_weeks,
  start_date,
  current_week,
  status,
  created_by
)
VALUES (
  '44444444-4444-4444-4444-444444444444',
  '33333333-3333-3333-3333-333333333333',
  'TEST: 12-Week Strength Plan',
  'Test plan for validation',
  'Build strength and muscle',
  12,
  '2024-11-25',  -- Monday, Week 1 starts here
  1,
  'active',
  '22222222-2222-2222-2222-222222222222'
) ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title;

-- Create test exercises (3 exercises per week across different days)
INSERT INTO workout_exercises (id, plan_id, day_of_week, exercise_name, exercise_type, sets, reps, weight, rest_seconds, order_index)
VALUES
  -- Monday exercises
  ('55555555-5555-5555-5555-555555555555', '44444444-4444-4444-4444-444444444444', 'Monday', 'Bench Press', 'strength', 3, '12', '135 lbs', 90, 0),
  ('55555555-5555-5555-5555-555555555556', '44444444-4444-4444-4444-444444444444', 'Monday', 'Squats', 'strength', 4, '10', '185 lbs', 120, 1),

  -- Wednesday exercises
  ('55555555-5555-5555-5555-555555555557', '44444444-4444-4444-4444-444444444444', 'Wednesday', 'Deadlifts', 'strength', 3, '8', '225 lbs', 180, 0),
  ('55555555-5555-5555-5555-555555555558', '44444444-4444-4444-4444-444444444444', 'Wednesday', 'Rows', 'strength', 3, '12', '115 lbs', 90, 1),

  -- Friday exercises
  ('55555555-5555-5555-5555-555555555559', '44444444-4444-4444-4444-444444444444', 'Friday', 'Shoulder Press', 'strength', 3, '10', '95 lbs', 90, 0)
ON CONFLICT (id) DO UPDATE SET exercise_name = EXCLUDED.exercise_name;

-- Total: 5 exercises per week
```

---

## TC-DB-001: get_plan_current_week() - Plan Started 14 Days Ago
**Priority:** High
**Type:** Database Function
**Category:** Week Calculation

### Preconditions
- Test plan exists with start_date = '2024-11-25'
- Current test date simulated as '2024-12-09' (14 days later)

### Test Steps
```sql
-- Execute function
SELECT get_plan_current_week('44444444-4444-4444-4444-444444444444') as current_week;
```

### Expected Results
```
current_week: 3
```

**Calculation:**
- Days elapsed: Dec 9 - Nov 25 = 14 days
- Weeks elapsed: FLOOR(14 / 7) + 1 = FLOOR(2) + 1 = 3
- Result: Week 3

### Verification Query
```sql
SELECT
  start_date,
  CURRENT_DATE as today,
  CURRENT_DATE - start_date as days_elapsed,
  FLOOR(EXTRACT(EPOCH FROM (CURRENT_DATE - start_date)) / (7 * 24 * 60 * 60)) + 1 as calculated_week,
  get_plan_current_week(id) as function_result
FROM workout_plans
WHERE id = '44444444-4444-4444-4444-444444444444';
```

### Pass Criteria
- ✅ Function returns `3`
- ✅ Calculation matches manual formula

---

## TC-DB-002: get_plan_current_week() - Plan Starts in Future
**Priority:** High
**Type:** Database Function - Boundary Test
**Category:** Week Calculation

### Test Data
```sql
-- Create plan starting tomorrow
INSERT INTO workout_plans (
  id, assignment_id, title, duration_weeks, start_date, status, created_by
)
VALUES (
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
  '33333333-3333-3333-3333-333333333333',
  'TEST: Future Plan',
  8,
  CURRENT_DATE + 1,  -- Starts tomorrow
  'active',
  '22222222-2222-2222-2222-222222222222'
) ON CONFLICT (id) DO UPDATE SET start_date = CURRENT_DATE + 1;
```

### Test Steps
```sql
SELECT get_plan_current_week('ffffffff-ffff-ffff-ffff-ffffffffffff') as current_week;
```

### Expected Results
```
current_week: 1
```

**Reasoning:**
- Weeks elapsed would be negative (-1/7 = -0.14)
- Function has minimum boundary: `IF weeks_elapsed < 1 THEN RETURN 1`
- Result: Week 1 (minimum enforced)

### Pass Criteria
- ✅ Function returns `1` (not 0 or negative)

---

## TC-DB-003: get_plan_current_week() - Weeks Exceed Duration
**Priority:** High
**Type:** Database Function - Boundary Test
**Category:** Week Calculation

### Test Data
```sql
-- Create 4-week plan that started 5 weeks ago (35 days)
INSERT INTO workout_plans (
  id, assignment_id, title, duration_weeks, start_date, status, created_by
)
VALUES (
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  '33333333-3333-3333-3333-333333333333',
  'TEST: Expired Plan',
  4,
  CURRENT_DATE - 35,  -- 5 weeks ago
  'active',
  '22222222-2222-2222-2222-222222222222'
) ON CONFLICT (id) DO UPDATE SET start_date = CURRENT_DATE - 35;
```

### Test Steps
```sql
SELECT
  duration_weeks,
  FLOOR(EXTRACT(EPOCH FROM (CURRENT_DATE - start_date)) / (7 * 24 * 60 * 60)) + 1 as calculated,
  get_plan_current_week(id) as capped_week
FROM workout_plans
WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
```

### Expected Results
```
duration_weeks: 4
calculated: 6  (would exceed)
capped_week: 4  (capped at duration)
```

**Reasoning:**
- Function has maximum boundary: `IF weeks_elapsed > duration_weeks THEN RETURN duration_weeks`
- Result: Week 4 (capped)

### Pass Criteria
- ✅ Function returns `4` (duration_weeks), not `6`

---

## TC-DB-004: get_plan_current_week() - Month Boundary Transition
**Priority:** Medium
**Type:** Database Function - Edge Case
**Category:** Week Calculation

### Test Data
```sql
-- Plan starts Nov 28 (Thursday), week transition crosses into December
INSERT INTO workout_plans (
  id, assignment_id, title, duration_weeks, start_date, status, created_by
)
VALUES (
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  '33333333-3333-3333-3333-333333333333',
  'TEST: Month Boundary Plan',
  8,
  '2024-11-28',  -- Thursday near end of November
  'active',
  '22222222-2222-2222-2222-222222222222'
) ON CONFLICT (id) DO UPDATE SET start_date = '2024-11-28';
```

### Test Steps
```sql
-- Simulate checking on Dec 5 (8 days later, should be Week 2)
-- Note: In real test, use actual current date or mock date
SELECT get_plan_current_week('dddddddd-dddd-dddd-dddd-dddddddddddd') as current_week;
```

### Expected Results
```
current_week: 2
```

**Week Breakdown:**
- Week 1: Nov 28 - Dec 4 (crosses month boundary)
- Week 2: Dec 5 - Dec 11

### Pass Criteria
- ✅ Month boundary doesn't affect calculation
- ✅ Week increments correctly across months

---

## TC-DB-005: get_week_completion_stats() - 0% Completion
**Priority:** High
**Type:** Database Function
**Category:** Progress Calculation

### Preconditions
- Test plan has 5 exercises
- No workout_progress records exist for current week

### Setup
```sql
-- Clean any existing progress for test user
DELETE FROM workout_progress
WHERE member_id = '11111111-1111-1111-1111-111111111111';
```

### Test Steps
```sql
SELECT * FROM get_week_completion_stats(
  '11111111-1111-1111-1111-111111111111',  -- member_id
  '44444444-4444-4444-4444-444444444444',  -- plan_id
  3  -- week_number (simulating Week 3)
);
```

### Expected Results
```json
{
  "total_exercises": 5,
  "completed_exercises": 0,
  "completion_percentage": 0.0,
  "week_start": "2024-12-09",
  "week_end": "2024-12-15"
}
```

### Verification Query
```sql
-- Verify no progress exists in date range
SELECT COUNT(*) as should_be_zero
FROM workout_progress
WHERE member_id = '11111111-1111-1111-1111-111111111111'
  AND plan_id = '44444444-4444-4444-4444-444444444444'
  AND completed_date BETWEEN '2024-12-09' AND '2024-12-15';
```

### Pass Criteria
- ✅ `total_exercises` = 5
- ✅ `completed_exercises` = 0
- ✅ `completion_percentage` = 0.0
- ✅ Week dates match plan calculation

---

## TC-DB-006: get_week_completion_stats() - Partial Completion (40%)
**Priority:** High
**Type:** Database Function
**Category:** Progress Calculation

### Setup
```sql
-- Log 2 out of 5 exercises for Week 3 (Dec 9-15)
INSERT INTO workout_progress (
  member_id, exercise_id, plan_id,
  completed_date, week_number,
  sets_completed, reps_completed, weight_used, rating
)
VALUES
  -- Monday: Bench Press (completed)
  (
    '11111111-1111-1111-1111-111111111111',
    '55555555-5555-5555-5555-555555555555',
    '44444444-4444-4444-4444-444444444444',
    '2024-12-09',  -- Monday of Week 3
    3,
    3, 12, 135.00, 4
  ),
  -- Monday: Squats (completed)
  (
    '11111111-1111-1111-1111-111111111111',
    '55555555-5555-5555-5555-555555555556',
    '44444444-4444-4444-4444-444444444444',
    '2024-12-09',  -- Same day
    3,
    4, 10, 185.00, 3
  );
```

### Test Steps
```sql
SELECT * FROM get_week_completion_stats(
  '11111111-1111-1111-1111-111111111111',
  '44444444-4444-4444-4444-444444444444',
  3
);
```

### Expected Results
```json
{
  "total_exercises": 5,
  "completed_exercises": 2,
  "completion_percentage": 40.0,
  "week_start": "2024-12-09",
  "week_end": "2024-12-15"
}
```

**Calculation:** (2 / 5) * 100 = 40.0%

### Pass Criteria
- ✅ `completed_exercises` = 2
- ✅ `completion_percentage` = 40.0

---

## TC-DB-007: get_week_completion_stats() - 100% Completion
**Priority:** High
**Type:** Database Function
**Category:** Progress Calculation

### Setup
```sql
-- Log all 5 exercises for Week 3
INSERT INTO workout_progress (
  member_id, exercise_id, plan_id, completed_date, week_number,
  sets_completed, reps_completed, rating
)
VALUES
  ('11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', '44444444-4444-4444-4444-444444444444', '2024-12-09', 3, 3, 12, 4),
  ('11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555556', '44444444-4444-4444-4444-444444444444', '2024-12-09', 3, 4, 10, 4),
  ('11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555557', '44444444-4444-4444-4444-444444444444', '2024-12-11', 3, 3, 8, 5),
  ('11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555558', '44444444-4444-4444-4444-444444444444', '2024-12-11', 3, 3, 12, 3),
  ('11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555559', '44444444-4444-4444-4444-444444444444', '2024-12-13', 3, 3, 10, 4)
ON CONFLICT (member_id, exercise_id, completed_date) DO NOTHING;
```

### Test Steps
```sql
SELECT * FROM get_week_completion_stats(
  '11111111-1111-1111-1111-111111111111',
  '44444444-4444-4444-4444-444444444444',
  3
);
```

### Expected Results
```json
{
  "total_exercises": 5,
  "completed_exercises": 5,
  "completion_percentage": 100.0,
  "week_start": "2024-12-09",
  "week_end": "2024-12-15"
}
```

### Pass Criteria
- ✅ `completed_exercises` = 5 (all exercises)
- ✅ `completion_percentage` = 100.0

---

## TC-DB-008: get_week_completion_stats() - Only Counts Current Week
**Priority:** Critical
**Type:** Database Function - Isolation Test
**Category:** Progress Calculation

### Setup
```sql
-- Clean existing data
DELETE FROM workout_progress
WHERE member_id = '11111111-1111-1111-1111-111111111111';

-- Log exercises in Week 2 (Dec 2-8)
INSERT INTO workout_progress (
  member_id, exercise_id, plan_id, completed_date, week_number,
  sets_completed, reps_completed, rating
)
VALUES
  -- Week 2 completions (should NOT count in Week 3 stats)
  ('11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', '44444444-4444-4444-4444-444444444444', '2024-12-02', 2, 3, 12, 4),
  ('11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555556', '44444444-4444-4444-4444-444444444444', '2024-12-04', 2, 4, 10, 3);

-- Log 1 exercise in Week 3 (Dec 9-15)
INSERT INTO workout_progress (
  member_id, exercise_id, plan_id, completed_date, week_number,
  sets_completed, reps_completed, rating
)
VALUES
  ('11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555557', '44444444-4444-4444-4444-444444444444', '2024-12-10', 3, 3, 8, 4);
```

### Test Steps
```sql
-- Check Week 3 stats (should only count the 1 exercise from Week 3)
SELECT * FROM get_week_completion_stats(
  '11111111-1111-1111-1111-111111111111',
  '44444444-4444-4444-4444-444444444444',
  3  -- Week 3
);
```

### Expected Results
```json
{
  "total_exercises": 5,
  "completed_exercises": 1,  // Only Week 3 exercise
  "completion_percentage": 20.0,
  "week_start": "2024-12-09",
  "week_end": "2024-12-15"
}
```

### Verification Query
```sql
-- Verify Week 2 exercises exist but aren't counted
SELECT
  week_number,
  COUNT(*) as count,
  MIN(completed_date) as first_date,
  MAX(completed_date) as last_date
FROM workout_progress
WHERE member_id = '11111111-1111-1111-1111-111111111111'
GROUP BY week_number
ORDER BY week_number;

-- Expected output:
-- week_number | count | first_date | last_date
-- 2           | 2     | 2024-12-02 | 2024-12-04
-- 3           | 1     | 2024-12-10 | 2024-12-10
```

### Pass Criteria
- ✅ `completed_exercises` = 1 (not 3)
- ✅ Week 2 data exists in database but doesn't affect Week 3 stats
- ✅ Function properly filters by date range

---

## TC-DB-009: get_week_completion_stats() - Multiple Weeks Data Isolation
**Priority:** High
**Type:** Database Function - Data Isolation
**Category:** Progress Calculation

### Setup
```sql
DELETE FROM workout_progress WHERE member_id = '11111111-1111-1111-1111-111111111111';

-- Create progress across 3 different weeks
INSERT INTO workout_progress (
  member_id, exercise_id, plan_id, completed_date, week_number,
  sets_completed, reps_completed, rating
)
VALUES
  -- Week 1 (Nov 25-Dec 1): 5/5 completed
  ('11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', '44444444-4444-4444-4444-444444444444', '2024-11-25', 1, 3, 12, 4),
  ('11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555556', '44444444-4444-4444-4444-444444444444', '2024-11-25', 1, 4, 10, 4),
  ('11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555557', '44444444-4444-4444-4444-444444444444', '2024-11-27', 1, 3, 8, 5),
  ('11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555558', '44444444-4444-4444-4444-444444444444', '2024-11-27', 1, 3, 12, 3),
  ('11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555559', '44444444-4444-4444-4444-444444444444', '2024-11-29', 1, 3, 10, 4),

  -- Week 2 (Dec 2-8): 3/5 completed
  ('11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', '44444444-4444-4444-4444-444444444444', '2024-12-02', 2, 3, 12, 3),
  ('11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555556', '44444444-4444-4444-4444-444444444444', '2024-12-02', 2, 4, 10, 4),
  ('11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555557', '44444444-4444-4444-4444-444444444444', '2024-12-04', 2, 3, 8, 4),

  -- Week 3 (Dec 9-15): 2/5 completed
  ('11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', '44444444-4444-4444-4444-444444444444', '2024-12-09', 3, 3, 12, 4),
  ('11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555556', '44444444-4444-4444-4444-444444444444', '2024-12-09', 3, 4, 10, 3);
```

### Test Steps
```sql
-- Test Week 1 stats
SELECT 1 as week, * FROM get_week_completion_stats('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 1)
UNION ALL
-- Test Week 2 stats
SELECT 2 as week, * FROM get_week_completion_stats('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 2)
UNION ALL
-- Test Week 3 stats
SELECT 3 as week, * FROM get_week_completion_stats('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 3);
```

### Expected Results
```
Week | total_exercises | completed_exercises | completion_percentage | week_start  | week_end
-----|-----------------|---------------------|----------------------|-------------|------------
1    | 5               | 5                   | 100.0                | 2024-11-25  | 2024-12-01
2    | 5               | 3                   | 60.0                 | 2024-12-02  | 2024-12-08
3    | 5               | 2                   | 40.0                 | 2024-12-09  | 2024-12-15
```

### Pass Criteria
- ✅ Each week shows independent completion counts
- ✅ Week 1: 100%, Week 2: 60%, Week 3: 40%
- ✅ No cross-contamination between weeks

---

## TC-DB-010: upsert_workout_progress() - First Log Creates New Record
**Priority:** Critical
**Type:** Database Function
**Category:** Upsert Behavior

### Preconditions
```sql
-- Ensure no existing progress for this exercise today
DELETE FROM workout_progress
WHERE member_id = '11111111-1111-1111-1111-111111111111'
  AND exercise_id = '55555555-5555-5555-5555-555555555555'
  AND completed_date = CURRENT_DATE;
```

### Test Steps
```sql
-- Call upsert function (first time today)
SELECT upsert_workout_progress(
  '11111111-1111-1111-1111-111111111111',  -- member_id
  '55555555-5555-5555-5555-555555555555',  -- exercise_id (Bench Press)
  '44444444-4444-4444-4444-444444444444',  -- plan_id
  3,        -- sets_completed
  12,       -- reps_completed
  '135',    -- weight_used (text)
  15,       -- duration_minutes
  4,        -- rating
  'Felt strong today'  -- notes
) as progress_id;
```

### Expected Results
- Function returns a UUID (new progress_id)
- One new record inserted into workout_progress

### Verification Query
```sql
SELECT
  id,
  exercise_id,
  member_id,
  sets_completed,
  reps_completed,
  weight_used,
  duration_minutes,
  rating,
  notes,
  week_number,
  completed_date,
  plan_id
FROM workout_progress
WHERE member_id = '11111111-1111-1111-1111-111111111111'
  AND exercise_id = '55555555-5555-5555-5555-555555555555'
  AND completed_date = CURRENT_DATE;
```

### Expected Record
```
sets_completed: 3
reps_completed: 12
weight_used: 135.00  (converted from "135")
duration_minutes: 15
rating: 4
notes: "Felt strong today"
week_number: 3  (auto-calculated)
completed_date: CURRENT_DATE
plan_id: 44444444-4444-4444-4444-444444444444
```

### Pass Criteria
- ✅ Function returns UUID
- ✅ Exactly 1 record exists
- ✅ All fields match input
- ✅ `weight_used` is numeric 135.00
- ✅ `week_number` auto-populated correctly

---

## TC-DB-011: upsert_workout_progress() - Second Log Same Day Updates Record
**Priority:** Critical
**Type:** Database Function - Upsert Test
**Category:** Duplicate Prevention

### Setup
```sql
-- First log (morning workout)
SELECT upsert_workout_progress(
  '11111111-1111-1111-1111-111111111111',
  '55555555-5555-5555-5555-555555555555',
  '44444444-4444-4444-4444-444444444444',
  3, 10, '135', 15, 3, 'Morning session'
) as first_log_id;
```

### Test Steps
```sql
-- Second log same day (evening workout, better performance)
SELECT upsert_workout_progress(
  '11111111-1111-1111-1111-111111111111',
  '55555555-5555-5555-5555-555555555555',  -- Same exercise
  '44444444-4444-4444-4444-444444444444',
  4,    -- sets_completed (was 3)
  12,   -- reps_completed (was 10)
  '145', -- weight_used (was 135)
  20,   -- duration_minutes (was 15)
  4,    -- rating (was 3)
  'Evening session - felt better'
) as second_log_id;
```

### Verification Query
```sql
-- Check total count (should still be 1)
SELECT COUNT(*) as record_count
FROM workout_progress
WHERE member_id = '11111111-1111-1111-1111-111111111111'
  AND exercise_id = '55555555-5555-5555-5555-555555555555'
  AND completed_date = CURRENT_DATE;

-- Check updated values
SELECT
  sets_completed,
  reps_completed,
  weight_used,
  duration_minutes,
  rating,
  notes
FROM workout_progress
WHERE member_id = '11111111-1111-1111-1111-111111111111'
  AND exercise_id = '55555555-5555-5555-5555-555555555555'
  AND completed_date = CURRENT_DATE;
```

### Expected Results
```
record_count: 1  (NOT 2)

Updated values:
sets_completed: 4
reps_completed: 12
weight_used: 145.00
duration_minutes: 20
rating: 4
notes: "Evening session - felt better"
```

### Pass Criteria
- ✅ Only 1 record exists (not duplicated)
- ✅ Record has latest values (updated, not inserted)
- ✅ `first_log_id` = `second_log_id` (same record)

---

## TC-DB-012: upsert_workout_progress() - Unique Constraint Enforcement
**Priority:** Critical
**Type:** Database Constraint
**Category:** Data Integrity

### Test Steps
```sql
-- Try to INSERT duplicate directly (bypassing upsert function)
INSERT INTO workout_progress (
  member_id, exercise_id, plan_id, completed_date, week_number,
  sets_completed, reps_completed, rating
)
VALUES
  ('11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', '44444444-4444-4444-4444-444444444444', CURRENT_DATE, 3, 3, 12, 4),
  ('11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', '44444444-4444-4444-4444-444444444444', CURRENT_DATE, 3, 4, 10, 5);  -- Duplicate
```

### Expected Results
```
ERROR: duplicate key value violates unique constraint "unique_exercise_completion_per_day"
DETAIL: Key (member_id, exercise_id, completed_date)=(11111111-1111-1111-1111-111111111111, 55555555-5555-5555-5555-555555555555, 2024-12-09) already exists.
```

### Pass Criteria
- ✅ INSERT fails with unique constraint error
- ✅ Constraint name is `unique_exercise_completion_per_day`
- ✅ No duplicate records created

---

## TC-DB-013: upsert_workout_progress() - Weight Text to Numeric Conversion
**Priority:** High
**Type:** Database Function - Data Transformation
**Category:** Weight Handling

### Test Steps
Test various weight input formats:

```sql
-- Test 1: Plain number
SELECT upsert_workout_progress(
  '11111111-1111-1111-1111-111111111111',
  '55555555-5555-5555-5555-555555555555',
  '44444444-4444-4444-4444-444444444444',
  3, 12, '135', NULL, 4, 'Test 1: Plain number'
);

-- Test 2: Number with "lbs"
DELETE FROM workout_progress WHERE member_id = '11111111-1111-1111-1111-111111111111' AND completed_date = CURRENT_DATE;
SELECT upsert_workout_progress(
  '11111111-1111-1111-1111-111111111111',
  '55555555-5555-5555-5555-555555555555',
  '44444444-4444-4444-4444-444444444444',
  3, 12, '135 lbs', NULL, 4, 'Test 2: With lbs'
);

-- Test 3: Decimal number
DELETE FROM workout_progress WHERE member_id = '11111111-1111-1111-1111-111111111111' AND completed_date = CURRENT_DATE;
SELECT upsert_workout_progress(
  '11111111-1111-1111-1111-111111111111',
  '55555555-5555-5555-5555-555555555555',
  '44444444-4444-4444-4444-444444444444',
  3, 12, '60.5', NULL, 4, 'Test 3: Decimal'
);

-- Test 4: Number with "kg"
DELETE FROM workout_progress WHERE member_id = '11111111-1111-1111-1111-111111111111' AND completed_date = CURRENT_DATE;
SELECT upsert_workout_progress(
  '11111111-1111-1111-1111-111111111111',
  '55555555-5555-5555-5555-555555555555',
  '44444444-4444-4444-4444-444444444444',
  3, 12, '60 kg', NULL, 4, 'Test 4: With kg'
);

-- Test 5: Bodyweight (no numeric)
DELETE FROM workout_progress WHERE member_id = '11111111-1111-1111-1111-111111111111' AND completed_date = CURRENT_DATE;
SELECT upsert_workout_progress(
  '11111111-1111-1111-1111-111111111111',
  '55555555-5555-5555-5555-555555555555',
  '44444444-4444-4444-4444-444444444444',
  3, 12, 'bodyweight', NULL, 4, 'Test 5: Bodyweight'
);

-- Test 6: Empty string
DELETE FROM workout_progress WHERE member_id = '11111111-1111-1111-1111-111111111111' AND completed_date = CURRENT_DATE;
SELECT upsert_workout_progress(
  '11111111-1111-1111-1111-111111111111',
  '55555555-5555-5555-5555-555555555555',
  '44444444-4444-4444-4444-444444444444',
  3, 12, '', NULL, 4, 'Test 6: Empty'
);
```

### Verification Query
```sql
SELECT
  notes,
  weight_used
FROM workout_progress
WHERE notes LIKE 'Test%'
ORDER BY notes;
```

### Expected Results
```
notes                  | weight_used
-----------------------|------------
Test 1: Plain number   | 135.00
Test 2: With lbs       | 135.00
Test 3: Decimal        | 60.50
Test 4: With kg        | 60.00
Test 5: Bodyweight     | NULL
Test 6: Empty          | NULL
```

### Pass Criteria
- ✅ "135" → 135.00
- ✅ "135 lbs" → 135.00 (text stripped)
- ✅ "60.5" → 60.50 (decimal preserved)
- ✅ "60 kg" → 60.00 (unit stripped)
- ✅ "bodyweight" → NULL (no numeric found)
- ✅ "" → NULL (empty string)

---

## TC-DB-014: upsert_workout_progress() - Week Number Auto-Population
**Priority:** High
**Type:** Database Function
**Category:** Auto-Calculation

### Test Steps
```sql
-- Log workout without specifying week_number
-- Function should auto-calculate based on plan start_date
SELECT upsert_workout_progress(
  '11111111-1111-1111-1111-111111111111',
  '55555555-5555-5555-5555-555555555555',
  '44444444-4444-4444-4444-444444444444',
  3, 12, '135', NULL, 4, 'Auto week test'
) as progress_id;
```

### Verification Query
```sql
SELECT
  week_number,
  completed_date,
  (SELECT get_plan_current_week('44444444-4444-4444-4444-444444444444')) as expected_week
FROM workout_progress
WHERE notes = 'Auto week test';
```

### Expected Results
```
week_number: 3
completed_date: 2024-12-09
expected_week: 3
```

### Pass Criteria
- ✅ `week_number` matches `get_plan_current_week()` result
- ✅ Week number calculated automatically (not NULL or 0)

---

## TC-DB-015: upsert_workout_progress() - Handles NULL Optional Fields
**Priority:** Medium
**Type:** Database Function
**Category:** Data Validation

### Test Steps
```sql
-- Log workout with minimal required fields only
SELECT upsert_workout_progress(
  '11111111-1111-1111-1111-111111111111',
  '55555555-5555-5555-5555-555555555557',  -- Deadlifts (different exercise)
  '44444444-4444-4444-4444-444444444444',
  3,      -- sets_completed (required)
  8,      -- reps_completed (required)
  NULL,   -- weight_used (optional)
  NULL,   -- duration_minutes (optional)
  3,      -- rating (required)
  NULL    -- notes (optional)
);
```

### Verification Query
```sql
SELECT
  sets_completed,
  reps_completed,
  weight_used,
  duration_minutes,
  notes
FROM workout_progress
WHERE exercise_id = '55555555-5555-5555-5555-555555555557'
  AND completed_date = CURRENT_DATE;
```

### Expected Results
```
sets_completed: 3
reps_completed: 8
weight_used: NULL
duration_minutes: NULL
notes: NULL
```

### Pass Criteria
- ✅ Record created successfully
- ✅ NULL values stored for optional fields
- ✅ No database errors
- ✅ Required fields populated

---

## Test Execution Checklist

### Pre-Execution
- [ ] Run test data setup script
- [ ] Verify test plan exists with correct start_date
- [ ] Verify 5 test exercises exist
- [ ] Clear any existing progress data

### Execution Order
1. [ ] TC-DB-001 to TC-DB-004: Week calculation tests
2. [ ] TC-DB-005 to TC-DB-009: Progress stats tests
3. [ ] TC-DB-010 to TC-DB-015: Upsert function tests

### Post-Execution
- [ ] Document any failures with error messages
- [ ] Clean up test data
- [ ] Report results summary

---

## Success Criteria

**All tests pass if:**
- ✅ All 15 test cases return expected results
- ✅ No database errors occur
- ✅ Calculations match manual formulas
- ✅ Duplicate prevention works correctly
- ✅ Week isolation is maintained
- ✅ Data transformations work as expected

---

## Cleanup Script

Run after all tests complete:

```sql
-- Remove test data
DELETE FROM workout_progress
WHERE member_id = '11111111-1111-1111-1111-111111111111';

DELETE FROM workout_exercises
WHERE plan_id IN (
  SELECT id FROM workout_plans WHERE title LIKE 'TEST:%'
);

DELETE FROM workout_plans
WHERE title LIKE 'TEST:%';

DELETE FROM trainer_assignments
WHERE id = '33333333-3333-3333-3333-333333333333';

DELETE FROM instructors
WHERE id = '22222222-2222-2222-2222-222222222222';

DELETE FROM profiles
WHERE id = '11111111-1111-1111-1111-111111111111';
```

---

## Notes for Testers

1. **Date Dependency:** Tests assume execution around Dec 9, 2024 (Week 3). Adjust dates if running at different time.

2. **UUID Consistency:** Test uses fixed UUIDs for reproducibility. In production, use `gen_random_uuid()`.

3. **Week Calculation:** Week boundaries are plan-based (starting from start_date), NOT calendar weeks.

4. **Duplicate Prevention:** The UNIQUE constraint is critical - test both upsert function AND direct INSERT.

5. **Performance:** All queries should complete in <100ms. If slower, check indexes on:
   - `workout_progress(member_id, exercise_id, completed_date)`
   - `workout_progress(plan_id, completed_date)`
   - `workout_exercises(plan_id)`

6. **Error Messages:** Database errors should be descriptive and include constraint names for debugging.
