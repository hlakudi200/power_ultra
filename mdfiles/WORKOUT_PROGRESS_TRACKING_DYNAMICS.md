# Workout Progress Tracking Dynamics - Complete System Flow

## Executive Summary

This document provides a detailed breakdown of how workout progress tracking works across the entire application, from database schema to UI rendering. Understanding this is critical before writing comprehensive tests.

**Date:** 2025-12-09
**Purpose:** Document the complete flow of workout progress tracking to enable accurate test writing

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         DATA FLOW DIAGRAM                                │
└─────────────────────────────────────────────────────────────────────────┘

User (Member) Session
       │
       ├──► 1. Has Active Trainer Assignment (trainer_assignments)
       │         │
       │         └──► 2. Has Active Workout Plan (workout_plans)
       │                   │
       │                   ├──► 3. Contains Exercises (workout_exercises)
       │                   │          │
       │                   │          └──► Organized by day_of_week
       │                   │                (Monday - Sunday)
       │                   │
       │                   └──► 4. Tracks Current Week (current_week field)
       │                            │
       │                            └──► Calculated from start_date
       │
       └──► 5. Logs Workout Completion (workout_progress)
                 │
                 ├──► Links to exercise_id
                 ├──► Records week_number
                 ├──► Records completed_date (for duplicate prevention)
                 └──► Triggers Progress Recalculation
```

---

## Database Schema Relationships

### 1. The Assignment Chain

```sql
profiles (member)
    ↓ (1:1 active)
trainer_assignments (status = 'active')
    ↓ (1:1 active)
workout_plans (status = 'active')
    ↓ (1:many)
workout_exercises (grouped by day_of_week)
    ↓ (many:many via workout_progress)
workout_progress (logs of completions)
```

**Key Constraints:**

1. **One Active Trainer per Member**
   ```sql
   CREATE UNIQUE INDEX unique_active_assignment_per_member
     ON trainer_assignments(member_id)
     WHERE (status = 'active');
   ```

2. **One Active Plan per Assignment**
   ```sql
   CREATE UNIQUE INDEX unique_active_plan_per_assignment
     ON workout_plans(assignment_id)
     WHERE (status = 'active');
   ```

3. **One Log per Exercise per Day**
   ```sql
   CREATE UNIQUE INDEX unique_exercise_completion_per_day
     ON workout_progress(member_id, exercise_id, completed_date);
   ```

### 2. Workout Progress Table Structure

```sql
CREATE TABLE workout_progress (
  id uuid PRIMARY KEY,
  exercise_id uuid NOT NULL,              -- Links to specific exercise
  member_id uuid NOT NULL,                -- Who completed it
  plan_id uuid,                           -- Which plan it belongs to
  completed_at timestamptz DEFAULT now(), -- Exact timestamp
  completed_date date,                    -- Date only (for duplicate check)
  week_number integer,                    -- Which week of the plan
  sets_completed integer,                 -- Actual sets performed
  reps_completed integer,                 -- Actual reps performed
  weight_used numeric(10,2),              -- Weight in numeric format
  duration_minutes integer,               -- For cardio
  rating integer CHECK (rating 1-5),      -- Difficulty rating
  notes text,
  created_at timestamptz DEFAULT now()
);
```

**Critical Fields for Tracking:**
- `completed_date` - Used for duplicate prevention and weekly filtering
- `week_number` - Populated automatically from `get_plan_current_week()`
- `plan_id` - Enables filtering progress by plan

---

## Week Calculation Mechanics

### How Current Week is Determined

**Function:** `get_plan_current_week(plan_id)`

```sql
-- Formula:
weeks_elapsed = FLOOR((CURRENT_DATE - start_date) / 7) + 1

-- Example:
Plan start_date: 2024-11-25 (Monday)
Current date:    2024-12-09 (Monday)
Days elapsed:    14
Weeks elapsed:   FLOOR(14 / 7) + 1 = 2 + 1 = 3
Current Week:    Week 3

-- Boundaries:
IF weeks_elapsed > duration_weeks THEN
  RETURN duration_weeks  -- Cap at plan duration
ELSIF weeks_elapsed < 1 THEN
  RETURN 1  -- Minimum week 1
END IF
```

### Week Date Ranges

**Function:** `get_current_week_dates(plan_id)`

Returns:
```json
{
  "week_number": 3,
  "week_start": "2024-12-09",
  "week_end": "2024-12-15"
}
```

**Calculation:**
```sql
week_start = start_date + ((current_week - 1) * 7)
week_end   = week_start + 6
```

**Example Timeline:**
```
Plan Start: 2024-11-25 (Week 1 starts)

Week 1: Nov 25 - Dec 1  (Days 0-6)
Week 2: Dec 2  - Dec 8  (Days 7-13)
Week 3: Dec 9  - Dec 15 (Days 14-20) ← Current
Week 4: Dec 16 - Dec 22 (Days 21-27)
...
Week 12: Feb 10 - Feb 16 (End of 12-week plan)
```

**Important:** Weeks are **NOT calendar weeks** (Sunday-Saturday). They are **plan-based** weeks starting from the plan's start_date.

---

## Progress Completion Tracking Flow

### Step-by-Step: When User Logs a Workout

#### 1. User Action (Frontend)
```typescript
// WorkoutPlan.tsx - User clicks "Log Workout" button
handleLogWorkout(exercise, "Monday")
  ↓
// Validation: Check if past day
if (selectedDayIndex < todayIndex) {
  // Block logging - show error toast
  return;
}
  ↓
// Open LogWorkoutDialog
setSelectedExercise(exercise);
setLogDialogOpen(true);
```

#### 2. User Fills Form (LogWorkoutDialog.tsx)
```typescript
{
  sets_completed: 3,
  reps_completed: 12,
  weight_used: "135",  // Text input
  duration_minutes: 15,
  rating: 4,
  notes: "Felt strong today"
}
```

#### 3. Submit to Database (RPC Call)
```typescript
const { data, error } = await supabase.rpc("upsert_workout_progress", {
  p_member_id: session.user.id,
  p_exercise_id: exercise.id,
  p_plan_id: exercise.plan_id,
  p_sets_completed: 3,
  p_reps_completed: 12,
  p_weight_used: "135",  // Sent as text
  p_duration_minutes: 15,
  p_rating: 4,
  p_notes: "Felt strong today"
});
```

#### 4. Database Processing (upsert_workout_progress function)

```sql
-- Step 1: Extract numeric weight
v_weight_numeric := CAST(regexp_replace("135", '[^0-9.]', '', 'g') AS numeric)
-- Result: 135.00

-- Step 2: Get current week number
v_week_number := get_plan_current_week(p_plan_id)
-- Result: 3 (based on plan start_date)

-- Step 3: Set today's date
v_today := CURRENT_DATE
-- Result: 2024-12-09

-- Step 4: Try to UPDATE existing record for today
UPDATE workout_progress
SET
  sets_completed = 3,
  reps_completed = 12,
  weight_used = 135.00,
  duration_minutes = 15,
  rating = 4,
  notes = "Felt strong today",
  completed_at = NOW(),
  completed_date = '2024-12-09',
  week_number = 3,
  plan_id = plan_id
WHERE member_id = user_id
  AND exercise_id = exercise_id
  AND completed_date = '2024-12-09'
RETURNING id INTO v_progress_id;

-- Step 5: If no existing record (v_progress_id IS NULL), INSERT
IF v_progress_id IS NULL THEN
  INSERT INTO workout_progress (
    member_id, exercise_id, plan_id,
    sets_completed, reps_completed, weight_used,
    duration_minutes, rating, notes,
    week_number, completed_at, completed_date
  ) VALUES (
    user_id, exercise_id, plan_id,
    3, 12, 135.00,
    15, 4, "Felt strong today",
    3, NOW(), '2024-12-09'
  )
  RETURNING id INTO v_progress_id;
END IF;

-- Return: v_progress_id (uuid of inserted/updated record)
```

**Result:**
- First log today: Creates new record
- Second log today: Updates existing record (no duplicates)

#### 5. UI Updates (WorkoutPlan.tsx)

```typescript
// After successful log:
handleWorkoutLogged() {
  setLogDialogOpen(false);
  fetchWorkoutPlan();  // Refresh entire plan
}

// fetchWorkoutPlan() does:
// 1. Get week stats
// 2. Get all exercises
// 3. Get completed exercise IDs for THIS WEEK
// 4. Mark exercises as completed
```

---

## Progress Calculation Mechanics

### Weekly Completion Stats

**Function:** `get_week_completion_stats(member_id, plan_id, week_number)`

#### Input Example:
```sql
p_member_id: 'user-uuid-123'
p_plan_id: 'plan-uuid-456'
p_week_number: 3
```

#### Processing Logic:

**Step 1: Calculate Week Boundaries**
```sql
-- Get plan start date
SELECT start_date FROM workout_plans WHERE id = 'plan-uuid-456';
-- Result: 2024-11-25

-- Calculate this week's range
v_week_start := '2024-11-25' + ((3 - 1) * 7) = '2024-12-09'
v_week_end   := '2024-12-09' + 6 = '2024-12-15'
```

**Step 2: Count Total Exercises in Plan**
```sql
SELECT COUNT(*)
FROM workout_exercises
WHERE plan_id = 'plan-uuid-456';
-- Result: 15 exercises across all days
```

**Step 3: Count Completed Exercises THIS WEEK**
```sql
SELECT COUNT(DISTINCT we.id)
FROM workout_exercises we
LEFT JOIN workout_progress wp
  ON wp.exercise_id = we.id
  AND wp.member_id = 'user-uuid-123'
  AND wp.completed_date BETWEEN '2024-12-09' AND '2024-12-15'
WHERE we.plan_id = 'plan-uuid-456'
  AND wp.id IS NOT NULL;  -- Only count if progress exists
-- Result: 10 exercises completed
```

**Step 4: Calculate Percentage**
```sql
completion_percentage = (10 / 15) * 100 = 66.67%
-- Rounded to 1 decimal: 66.7%
```

#### Output:
```json
{
  "total_exercises": 15,
  "completed_exercises": 10,
  "completion_percentage": 66.7,
  "week_start": "2024-12-09",
  "week_end": "2024-12-15"
}
```

### Exercise Completion Status (Per Day)

**In WorkoutPlan.tsx:**

```typescript
// Step 1: Get ALL exercises for the plan
const exercisesData = [
  { id: 'ex1', day_of_week: 'Monday', exercise_name: 'Bench Press', ... },
  { id: 'ex2', day_of_week: 'Monday', exercise_name: 'Squats', ... },
  { id: 'ex3', day_of_week: 'Wednesday', exercise_name: 'Deadlift', ... },
  // ... 15 total exercises
];

// Step 2: Get completed exercises THIS WEEK ONLY
const progressData = await supabase
  .from("workout_progress")
  .select("exercise_id, completed_at")
  .eq("member_id", session.user.id)
  .gte("completed_at", "2024-12-09T00:00:00")  // Week start
  .lte("completed_at", "2024-12-15T23:59:59"); // Week end

// Result:
[
  { exercise_id: 'ex1', completed_at: '2024-12-09T10:30:00' },
  { exercise_id: 'ex2', completed_at: '2024-12-09T11:00:00' },
  // ... 10 total completions
]

// Step 3: Create Set of completed IDs
const completedExerciseIds = new Set(['ex1', 'ex2', ...]);

// Step 4: Mark exercises as completed
const exercisesWithCompletion = exercisesData.map(ex => ({
  ...ex,
  is_completed: completedExerciseIds.has(ex.id)  // true/false
}));

// Result:
[
  { id: 'ex1', exercise_name: 'Bench Press', is_completed: true },
  { id: 'ex2', exercise_name: 'Squats', is_completed: true },
  { id: 'ex3', exercise_name: 'Deadlift', is_completed: false },
  // ...
]
```

### Day-Specific Progress

```typescript
// Filter exercises for selected day
const exercisesForDay = exercises.filter(ex => ex.day_of_week === "Monday");
// Result: [ex1, ex2, ex5] (3 exercises on Monday)

// Count completed exercises for this day
const completedToday = exercisesForDay.filter(ex => ex.is_completed).length;
// Result: 2 (ex1 and ex2 are completed)

// Display: "Progress: 2/3 exercises (67%)"
```

---

## Critical Timing and Date Logic

### 1. Past Day Prevention

**Location:** WorkoutPlan.tsx:158-175

```typescript
const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// Get today's day name
const today = DAYS_OF_WEEK[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
// JavaScript: Sunday = 0, Monday = 1, ..., Saturday = 6
// Converted: Monday = 0, Tuesday = 1, ..., Sunday = 6

// Example: Today is Wednesday (new Date().getDay() = 3)
// Result: DAYS_OF_WEEK[3 - 1] = DAYS_OF_WEEK[2] = "Wednesday"

// Check if selected day is in the past
const todayIndex = DAYS_OF_WEEK.indexOf("Wednesday"); // 2
const selectedDayIndex = DAYS_OF_WEEK.indexOf("Monday"); // 0

if (selectedDayIndex < todayIndex) {
  // 0 < 2 = true → Block logging for Monday
  toast.error("Cannot log past workouts");
}
```

**Edge Case:** This **ONLY prevents logging within the current week**. It does NOT prevent:
- Logging future days in the same week (Wednesday → Friday is allowed)
- Logging exercises from previous weeks

### 2. Week Transition Behavior

**Scenario:** Plan starts Monday Nov 25, 2024

```
Week 1: Nov 25 - Dec 1
- User completes 10/15 exercises
- Week completion: 66.7%

Week 2: Dec 2 - Dec 8
- New week starts automatically (based on date calculation)
- Completion resets to 0/15 (0%)
- Previous week's data is PRESERVED in workout_progress

Week 3: Dec 9 - Dec 15 (Current)
- New week, fresh start
- get_week_completion_stats only counts exercises completed Dec 9-15
```

**Key Point:** Week transition is **automatic** and **date-based**, not triggered by any user action.

### 3. Completion Persistence

**Database:**
```sql
-- Week 1 completions (preserved forever)
SELECT * FROM workout_progress
WHERE member_id = 'user-123'
  AND week_number = 1;

-- Returns all logs from Week 1, even though we're now in Week 3
```

**UI:**
```typescript
// WorkoutPlan.tsx filters by CURRENT week only
.gte("completed_at", "2024-12-09T00:00:00")  // This week's start
.lte("completed_at", "2024-12-15T23:59:59")  // This week's end

// Result: Only shows THIS week's completions in UI
// Previous weeks' data exists but is not displayed
```

---

## Progress Visual States

### Exercise Card States

**Incomplete Exercise:**
```tsx
<div className="bg-card">  {/* White/default background */}
  <Circle className="h-5 w-5 text-muted-foreground" />  {/* Empty circle */}
  <Button className="bg-primary">Log Workout</Button>  {/* Blue button */}
</div>
```

**Completed Exercise:**
```tsx
<div className="bg-green-50 dark:bg-green-900/20">  {/* Green tint */}
  <CheckCircle2 className="h-5 w-5 text-green-500" />  {/* Green checkmark */}
  <Badge className="bg-green-500">Done</Badge>  {/* Green badge */}
  <Button variant="outline">Update</Button>  {/* Update instead of Log */}
</div>
```

### Progress Bar Display

```tsx
// Weekly progress
<Progress value={66.7} />  {/* 66.7% filled */}
<span>10 of 15 exercises completed</span>

// Color coding (typical pattern):
// 0-30%:   Red/destructive
// 31-70%:  Yellow/warning
// 71-100%: Green/success
```

---

## Data Refresh Patterns

### When is Progress Recalculated?

**1. On Page Load**
```typescript
useEffect(() => {
  if (session?.user?.id) {
    fetchWorkoutPlan();  // Fetches everything fresh
  }
}, [session?.user?.id]);
```

**2. After Logging Workout**
```typescript
handleWorkoutLogged() {
  setLogDialogOpen(false);
  fetchWorkoutPlan();  // Refresh to show new completion
}
```

**3. NOT on Tab Change**
```typescript
// When user switches from Monday to Tuesday tab:
// NO database query - uses already loaded exercises array
setSelectedDay("Tuesday");
```

### What Gets Fetched Each Time?

```typescript
fetchWorkoutPlan() {
  // 1. Get active assignment (1 query)
  // 2. Get active workout plan (1 query)
  // 3. Get week completion stats (1 RPC call)
  // 4. Get all exercises for plan (1 query)
  // 5. Get completed exercises for this week (1 query)
  // Total: 5 database operations
}
```

---

## Test Scenarios Based on Dynamics

### Scenario 1: Fresh Week Start

**Setup:**
```sql
-- Plan started Nov 25, current date is Dec 9 (Week 3 start)
-- No exercises logged yet this week

INSERT INTO workout_plans (start_date, current_week, duration_weeks)
VALUES ('2024-11-25', 3, 12);

INSERT INTO workout_exercises (plan_id, day_of_week, ...)
VALUES
  ('plan-1', 'Monday', ...),    -- Exercise 1
  ('plan-1', 'Monday', ...),    -- Exercise 2
  ('plan-1', 'Wednesday', ...); -- Exercise 3
-- Total: 3 exercises
```

**Expected Results:**
- `get_plan_current_week()` returns `3`
- `get_week_completion_stats()` returns:
  ```json
  {
    "total_exercises": 3,
    "completed_exercises": 0,
    "completion_percentage": 0,
    "week_start": "2024-12-09",
    "week_end": "2024-12-15"
  }
  ```
- All exercises show `is_completed: false`
- UI shows "Progress: 0/3 exercises (0%)"

### Scenario 2: Partial Week Completion

**Setup:**
```sql
-- Same plan as above
-- User logs Monday Exercise 1 on Dec 9

INSERT INTO workout_progress (
  member_id, exercise_id, plan_id,
  completed_date, week_number, ...
) VALUES (
  'user-123', 'exercise-1', 'plan-1',
  '2024-12-09', 3, ...
);
```

**Expected Results:**
- `get_week_completion_stats()` returns:
  ```json
  {
    "total_exercises": 3,
    "completed_exercises": 1,
    "completion_percentage": 33.3,
    "week_start": "2024-12-09",
    "week_end": "2024-12-15"
  }
  ```
- Exercise 1: `is_completed: true`
- Exercise 2, 3: `is_completed: false`
- UI shows "Progress: 1/3 exercises (33%)"

### Scenario 3: Duplicate Log Same Day

**Setup:**
```sql
-- User already logged Exercise 1 today
-- User tries to log it again with different values

-- First log:
INSERT INTO workout_progress (..., weight_used, completed_date)
VALUES (..., 135.00, '2024-12-09');

-- Second log (same exercise, same day):
-- Triggers UPDATE, not INSERT
```

**Expected Results:**
- Database contains **ONLY 1 RECORD** for exercise-1 on 2024-12-09
- Record has updated values (most recent log)
- `get_week_completion_stats()` still shows:
  ```json
  { "completed_exercises": 1 }  // NOT 2
  ```
- UI toast: "Workout updated successfully"

### Scenario 4: Week Transition

**Setup:**
```sql
-- Week 2: Dec 2-8
-- User completed 3/3 exercises in Week 2

INSERT INTO workout_progress (week_number, completed_date, ...)
VALUES
  (2, '2024-12-02', ...),  -- Mon Exercise 1
  (2, '2024-12-04', ...),  -- Wed Exercise 2
  (2, '2024-12-06', ...);  -- Fri Exercise 3

-- Now it's Week 3: Dec 9-15
-- No logs yet for Week 3
```

**Expected Results:**
- `get_plan_current_week()` returns `3` (based on date)
- `get_week_completion_stats(week_number: 3)` returns:
  ```json
  {
    "completed_exercises": 0,  // Fresh start
    "completion_percentage": 0
  }
  ```
- All exercises show `is_completed: false` in UI
- Week 2 data still exists in database but is not displayed
- User must log exercises again for Week 3

### Scenario 5: Past Day Blocking

**Setup:**
```typescript
// Today is Wednesday (Dec 11)
// User tries to log Monday's exercise
```

**Expected Results:**
- `handleLogWorkout(exercise, "Monday")` is called
- Index check: Monday (0) < Wednesday (2) = true
- Toast error: "Cannot Log Past Workouts"
- Dialog does NOT open
- No database call made

### Scenario 6: 100% Week Completion

**Setup:**
```sql
-- Plan has 3 exercises
-- User logs all 3 in Week 3

INSERT INTO workout_progress (...)
VALUES
  (..., 'exercise-1', '2024-12-09', 3, ...),
  (..., 'exercise-2', '2024-12-09', 3, ...),
  (..., 'exercise-3', '2024-12-11', 3, ...);
```

**Expected Results:**
- `get_week_completion_stats()` returns:
  ```json
  {
    "total_exercises": 3,
    "completed_exercises": 3,
    "completion_percentage": 100.0
  }
  ```
- All exercises show green background + checkmark
- Progress bar is fully filled
- UI shows "Progress: 3/3 exercises (100%)"

---

## Key Testing Insights

### 1. Week Boundaries are Critical
- Tests must use **exact date calculations** based on plan start_date
- Cannot use calendar weeks (Sunday-Saturday)
- Must account for week transition at midnight

### 2. Duplicate Prevention is Database-Level
- Tests should verify UNIQUE constraint works
- Should test upsert behavior (UPDATE vs INSERT)
- Should check that only 1 record exists after multiple logs

### 3. Completion Status is Week-Scoped
- Logging an exercise in Week 2 does NOT mark it complete in Week 3
- Tests must verify completion is reset each week
- Historical data must be preserved

### 4. Progress Calculation is Real-Time
- Every `get_week_completion_stats()` call recounts from workout_progress
- No cached values (unless implemented in frontend)
- Tests should verify calculations are accurate

### 5. UI State Depends on Date Ranges
- Frontend filters progress by `completed_at` timestamp
- Must use correct week_start and week_end boundaries
- Tests should verify filtering logic

---

## Recommended Test Structure

```
1. Database Function Tests (SQL)
   ├── get_plan_current_week()
   │   ├── Test: Plan started 14 days ago → Returns week 3
   │   ├── Test: Plan starts tomorrow → Returns week 1 (minimum)
   │   └── Test: Plan exceeded duration → Returns duration_weeks (cap)
   │
   ├── get_week_completion_stats()
   │   ├── Test: No completions → Returns 0%
   │   ├── Test: Partial completions → Returns correct %
   │   ├── Test: 100% completion → Returns 100%
   │   └── Test: Only counts current week → Ignores previous weeks
   │
   └── upsert_workout_progress()
       ├── Test: First log → INSERT new record
       ├── Test: Second log same day → UPDATE existing record
       ├── Test: Weight text conversion → Stores as numeric
       └── Test: Week number auto-populated → Correct value

2. API/RPC Integration Tests (TypeScript)
   ├── Test: Call upsert_workout_progress → Returns progress_id
   ├── Test: Duplicate call → No error, returns same id
   └── Test: Invalid data → Returns error

3. UI Component Tests (React Testing Library)
   ├── Test: Fresh week → Shows 0% progress
   ├── Test: After logging → Updates progress display
   ├── Test: Completed exercise → Shows green background
   ├── Test: Past day → Blocks logging, shows toast
   └── Test: Tab switching → Filters exercises by day

4. End-to-End Tests (Playwright/Cypress)
   ├── Test: Complete workout flow (login → log → verify UI)
   ├── Test: Week transition → Verify reset
   └── Test: Multiple users → Isolation of progress
```

---

## Questions to Answer with Tests

1. **Does week calculation work correctly across month boundaries?**
   - Plan starts Nov 25, week 3 should be Dec 9-15

2. **Is duplicate prevention bulletproof?**
   - Log same exercise twice in 1 second → Only 1 record

3. **Do deleted exercises affect progress calculation?**
   - If exercise is deleted, does progress query fail?

4. **What happens if plan start_date is modified?**
   - Does current_week recalculate automatically?

5. **Can users log workouts for future days in the same week?**
   - Today is Monday, can I log Wednesday's exercise?

6. **Is progress isolated between members?**
   - User A logs exercise → User B should not see it as completed

7. **Does week_number match get_plan_current_week() consistently?**
   - All logs should have correct week_number

8. **What happens at exactly midnight during week transition?**
   - Edge case: Log at 11:59 PM vs 12:01 AM

---

## Conclusion

The workout progress tracking system is **highly date-dependent** and relies on:

1. **Accurate week calculations** from plan start_date
2. **Database-level duplicate prevention** via unique constraints
3. **Week-scoped filtering** for completion status
4. **Real-time recalculation** of progress stats
5. **Frontend date validation** to prevent past-day logging

**Critical for Testing:**
- Use **fixed dates** in test data (not CURRENT_DATE)
- Test **week boundaries** explicitly (edge of week)
- Verify **duplicate prevention** at database level
- Check **week transition** behavior (reset to 0%)
- Validate **date filtering** logic in queries

**Next Step:** Use this document to write comprehensive test cases that cover all scenarios, edge cases, and potential failure points.
