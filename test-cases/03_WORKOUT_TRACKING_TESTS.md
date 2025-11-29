# Workout Tracking Test Cases

## Overview
Test cases for workout plan viewing, exercise logging, progress tracking, and weekly completion stats.

---

## TC-WORKOUT-001: View Active Workout Plan
**Priority:** High
**Type:** Functional

### Preconditions
- User is logged in as member
- User has active trainer assignment
- Trainer has created a workout plan for user
- Plan status is "active"

### Test Steps
1. Login as member
2. Navigate to dashboard
3. Scroll to "My Workout Plan" section
4. Observe workout plan display

### Expected Results
- Workout plan card displays
- Shows plan title
- Shows plan description
- Displays "Week X of Y" badge
- Shows current week number correctly
- Week progress bar visible
- Weekly schedule tabs visible

### Test Data
```
Plan: "12-Week Strength Building"
Current Week: 2
Duration: 12 weeks
```

---

## TC-WORKOUT-002: No Active Workout Plan
**Priority:** High
**Type:** Functional

### Preconditions
- User is logged in as member
- User has NO active workout plan

### Test Steps
1. Login as member
2. Navigate to dashboard
3. Scroll to workout plan section

### Expected Results
- Info message displays
- Message: "No active workout plan found. Your trainer will create a personalized plan for you soon!"
- No error shown
- UI is clean and informative

---

## TC-WORKOUT-003: View Weekly Schedule Tabs
**Priority:** High
**Type:** Functional

### Preconditions
- User has active workout plan
- Plan has exercises assigned to different days

### Test Steps
1. View workout plan
2. Observe weekly schedule tabs
3. Click on each day of week

### Expected Results
- 7 day tabs visible (Mon-Sun)
- Current day is highlighted/selected by default
- Each tab shows number of exercises for that day
- Clicking tab switches to that day's exercises
- Smooth tab transition

---

## TC-WORKOUT-004: View Rest Day
**Priority:** Medium
**Type:** Functional

### Preconditions
- User has active workout plan
- A specific day has NO exercises assigned (rest day)

### Test Steps
1. View workout plan
2. Click on a rest day tab (e.g., Sunday)

### Expected Results
- Info message displays
- Message: "Rest day - No exercises scheduled for [Day]"
- No exercises shown
- Clean, clear UI

---

## TC-WORKOUT-005: View Day's Exercises
**Priority:** High
**Type:** Functional

### Preconditions
- User has active workout plan
- Selected day has exercises assigned

### Test Steps
1. View workout plan
2. Select a day with exercises
3. Observe exercise list

### Expected Results
- All exercises for that day display
- Each exercise shows:
  - Exercise name
  - Exercise type badge
  - Number of sets
  - Number of reps
  - Weight (if specified)
  - Rest time between sets
  - Notes (if any)
- Exercise order index (1, 2, 3...)
- "Log Workout" button visible

---

## TC-WORKOUT-006: Log Workout - First Time
**Priority:** High
**Type:** Functional

### Preconditions
- User has active workout plan
- Exercise has NOT been logged today

### Test Steps
1. View workout plan exercises
2. Click "Log Workout" button on an exercise
3. Dialog opens
4. Fill in workout data:
   - Sets completed: 3
   - Reps completed: 12
   - Weight used: 50 lbs
   - Duration: 15 minutes
   - Rating: 4 stars
   - Notes: "Felt good"
5. Click "Log Workout" button

### Expected Results
- Dialog opens successfully
- All fields accept input
- Rating stars are interactive
- Workout logged successfully
- Success toast: "Workout logged successfully!"
- Dialog closes
- Exercise marked as completed (green background)
- Completion badge appears
- Weekly progress updates
- Day progress updates

### Test Data
```
Sets: 3
Reps: 12
Weight: 50
Duration: 15
Rating: 4
Notes: "Felt good"
```

---

## TC-WORKOUT-007: Log Workout - Duplicate Same Day (Update)
**Priority:** High
**Type:** Functional

### Preconditions
- User already logged this exercise TODAY
- Existing log has different values

### Test Steps
1. View exercise that was logged earlier today
2. Click "Log Workout" button
3. Enter different values:
   - Sets: 4 (was 3)
   - Reps: 10 (was 12)
   - Weight: 55 (was 50)
4. Click "Log Workout"

### Expected Results
- Dialog opens (may show previous values)
- Can update values
- Workout updated successfully (NOT duplicated)
- Success toast: "Workout updated successfully!" or similar
- Only ONE log entry exists for today
- Progress stats reflect updated values

### Test Data
```sql
-- Database should have only 1 record:
SELECT COUNT(*) FROM workout_progress
WHERE member_id = 'user_id'
  AND exercise_id = 'exercise_id'
  AND completed_date = CURRENT_DATE;
-- Expected: 1 (not 2)
```

---

## TC-WORKOUT-008: Log Workout - Minimal Data
**Priority:** Medium
**Type:** Functional

### Test Steps
1. Open log workout dialog
2. Enter only required fields (if any)
3. Leave optional fields empty
4. Submit

### Expected Results
- Workout logged successfully
- Optional fields saved as NULL
- No validation errors
- Success toast appears

### Test Data
```
Sets: 3
Reps: 10
Weight: (empty)
Duration: (empty)
Rating: 3
Notes: (empty)
```

---

## TC-WORKOUT-009: Log Workout - Invalid Data
**Priority:** Medium
**Type:** Negative

### Test Steps
1. Open log workout dialog
2. Enter invalid data:
   - Sets: -5 (negative)
   - Reps: 0
   - Weight: "abc" (non-numeric)
3. Try to submit

### Expected Results
- Validation errors appear
- Cannot submit form
- Error messages shown for each invalid field
- Dialog remains open

---

## TC-WORKOUT-010: Weekly Progress Calculation
**Priority:** High
**Type:** Functional

### Preconditions
- Week has 15 total exercises
- User has completed 10 exercises this week

### Test Steps
1. View workout plan
2. Observe "This Week's Progress" section

### Expected Results
- Shows completed/total: "10 of 15 exercises completed"
- Progress bar shows 67% (10/15 = 66.67%)
- Percentage displayed: "67%"
- Progress bar visual is accurate
- Week date range shown: "Nov 25 - Dec 1"

---

## TC-WORKOUT-011: Week Completion - 100%
**Priority:** Medium
**Type:** Functional

### Preconditions
- User has completed ALL exercises for current week

### Test Steps
1. Log final exercise of the week
2. View workout plan progress

### Expected Results
- Progress shows 100%
- Progress bar is full
- Text: "X of X exercises completed"
- Celebratory message or animation (if implemented)

---

## TC-WORKOUT-012: Week Completion - 0%
**Priority:** Medium
**Type:** Functional

### Preconditions
- New week started
- User has not completed any exercises this week

### Test Steps
1. View workout plan at start of new week

### Expected Results
- Progress shows 0%
- Progress bar is empty
- Text: "0 of X exercises completed"
- No exercises marked as completed
- Clean slate for new week

---

## TC-WORKOUT-013: Week Transition
**Priority:** High
**Type:** Functional

### Preconditions
- User completed exercises in Week 1
- Week 2 just started (based on plan start_date)

### Test Steps
1. View workout plan after week transition
2. Check week number
3. Check completed exercises status

### Expected Results
- Week badge shows "Week 2 of 12"
- Previous week's completions are preserved in database
- Current week shows 0% progress (fresh start)
- No exercises marked as completed for new week
- Can still view history of previous weeks

---

## TC-WORKOUT-014: Exercise Completion Visual States
**Priority:** High
**Type:** UI/UX

### Test Steps
1. View exercise list
2. Observe visual differences between completed and incomplete exercises

### Expected Results

**Incomplete Exercise:**
- White/card background
- "Log Workout" button is blue/primary color
- No completion badge

**Completed Exercise:**
- Green background tint
- Green checkmark icon
- "Done" or "Completed" badge visible
- "Log Workout" button may be disabled or show "Update"

---

## TC-WORKOUT-015: Day Progress Indicator
**Priority:** Medium
**Type:** Functional

### Preconditions
- Monday has 5 exercises
- User completed 3 of them

### Test Steps
1. Select Monday tab
2. Observe day progress indicator at top

### Expected Results
- Shows "Progress: 3/5 exercises"
- Shows percentage: "60%"
- Visual progress indicator visible
- Updates when exercise logged

---

## TC-WORKOUT-016: Exercise Details Display
**Priority:** High
**Type:** Functional

### Test Steps
1. View an exercise card
2. Verify all details are visible

### Expected Results
Each exercise card shows:
- ✓ Exercise number (1, 2, 3...)
- ✓ Exercise name (e.g., "Bench Press")
- ✓ Exercise type badge (e.g., "Strength")
- ✓ Sets (e.g., "3 sets")
- ✓ Reps (e.g., "12 reps")
- ✓ Weight (e.g., "135 lbs") - if applicable
- ✓ Rest time (e.g., "60s rest")
- ✓ Notes (e.g., "Note: Keep core tight") - if any
- ✓ Completion status
- ✓ Action button

---

## TC-WORKOUT-017: Plan Goals Display
**Priority:** Medium
**Type:** Functional

### Preconditions
- Workout plan has goals defined

### Test Steps
1. View workout plan
2. Check goals section

### Expected Results
- Goals section visible
- Trending up icon shown
- Goals text displays correctly
- Formatted nicely in card/box

### Test Data
```
Goals: "Build muscle mass, increase strength by 20%, improve endurance"
```

---

## TC-WORKOUT-018: Plan Description Display
**Priority:** Medium
**Type:** Functional

### Preconditions
- Workout plan has description

### Test Steps
1. View workout plan header
2. Check description

### Expected Results
- Description visible below title
- Text is readable
- Properly formatted

### Test Data
```
Description: "A comprehensive 12-week program focused on building strength and muscle mass through progressive overload."
```

---

## TC-WORKOUT-019: No Description or Goals
**Priority:** Low
**Type:** Functional

### Preconditions
- Workout plan has NULL description and NULL goals

### Test Steps
1. View workout plan

### Expected Results
- No description shown (or shows nothing, not "null")
- Goals section not rendered
- Layout still looks clean
- No broken UI elements

---

## TC-WORKOUT-020: Rating Stars Interaction
**Priority:** Medium
**Type:** UI/UX

### Test Steps
1. Open log workout dialog
2. Hover over rating stars
3. Click different star ratings

### Expected Results
- Hovering highlights stars up to hovered star
- Clicking selects rating (1-5)
- Selected stars are filled/highlighted
- Unselected stars are outlined/muted
- Visual feedback on interaction
- Can change rating by clicking different star

---

## TC-WORKOUT-021: Exercise History (If Implemented)
**Priority:** Low
**Type:** Functional

### Preconditions
- User has logged same exercise multiple times in past

### Test Steps
1. View exercise
2. Look for history/past logs option
3. Access history

### Expected Results
- Can view previous logs for this exercise
- Shows dates, weights, reps, etc.
- Sorted by date (most recent first)
- Can see progress over time

---

## TC-WORKOUT-022: Personal Records (If Implemented)
**Priority:** Low
**Type:** Functional

### Test Steps
1. Log a workout with highest weight ever for that exercise
2. Check for PR notification or badge

### Expected Results
- PR (Personal Record) notification appears
- Badge or special indicator shown
- Celebratory message
- Record saved in database

---

## TC-WORKOUT-023: Multiple Plans - Only Active Shows
**Priority:** Medium
**Type:** Functional

### Preconditions
- User has multiple workout plans in database
- Only one is status "active"
- Others are "completed" or "draft"

### Test Steps
1. View workout plan section
2. Observe which plan displays

### Expected Results
- Only the ACTIVE plan displays
- Other plans don't show
- No confusion with multiple plans

---

## TC-WORKOUT-024: Loading State
**Priority:** Medium
**Type:** UI/UX

### Test Steps
1. Navigate to dashboard (with slow network simulation)
2. Observe workout plan section while loading

### Expected Results
- Skeleton loaders appear
- No broken layout
- Smooth transition when data loads
- No flash of incorrect content

---

## TC-WORKOUT-025: Error State - Failed to Load
**Priority:** Medium
**Type:** Error Handling

### Preconditions
- Simulate database error or network failure

### Test Steps
1. Try to load workout plan
2. Database returns error

### Expected Results
- Error message displays
- Not a blank screen or crash
- User-friendly error text
- Option to retry (if available)

---

## TC-WORKOUT-026: Week Date Range Display
**Priority:** Low
**Type:** Functional

### Test Steps
1. View workout plan
2. Check week date range under title

### Expected Results
- Shows current week range
- Format: "Nov 25 - Dec 1" or similar
- Dates are correct based on plan start_date
- Updates when week changes

---

## TC-WORKOUT-027: Completion Persistence
**Priority:** High
**Type:** Functional

### Test Steps
1. Log a workout (mark as complete)
2. Logout
3. Login again
4. View same workout

### Expected Results
- Workout still marked as completed
- Data persists in database
- Completion status visible
- Progress stats still accurate

---

## TC-WORKOUT-028: Log Workout - Close Dialog Without Saving
**Priority:** Low
**Type:** Functional

### Test Steps
1. Open log workout dialog
2. Enter some data
3. Click outside dialog or press ESC or click X
4. Confirm close if prompted

### Expected Results
- Dialog closes
- No data saved
- Exercise remains incomplete
- No error messages

---

## Test Summary

| Category | Total Tests | Priority High | Priority Medium | Priority Low |
|----------|-------------|---------------|-----------------|--------------|
| Workout Tracking | 28 | 12 | 11 | 5 |

## Test Data Setup

```sql
-- Create test workout plan
INSERT INTO trainer_assignments (member_id, trainer_id, status)
VALUES ('member_user_id', 'trainer_user_id', 'active');

INSERT INTO workout_plans (
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
  'assignment_id',
  '12-Week Strength Building',
  'A comprehensive program for building strength',
  'Build muscle mass, increase strength by 20%',
  12,
  '2024-11-25', -- Start of current week
  2,
  'active',
  'trainer_user_id'
);

-- Create exercises for different days
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
)
VALUES
  -- Monday
  ('plan_id', 'Monday', 'Bench Press', 'Strength', 3, '12', '135 lbs', 90, 'Keep core tight', 0),
  ('plan_id', 'Monday', 'Incline Dumbbell Press', 'Strength', 3, '10', '50 lbs', 60, NULL, 1),
  ('plan_id', 'Monday', 'Cable Flyes', 'Isolation', 3, '15', '30 lbs', 45, NULL, 2),

  -- Wednesday
  ('plan_id', 'Wednesday', 'Squats', 'Strength', 4, '10', '185 lbs', 120, 'Full depth', 0),
  ('plan_id', 'Wednesday', 'Leg Press', 'Strength', 3, '12', '270 lbs', 90, NULL, 1),

  -- Friday
  ('plan_id', 'Friday', 'Deadlifts', 'Strength', 3, '8', '225 lbs', 180, 'Use mixed grip', 0),
  ('plan_id', 'Friday', 'Barbell Rows', 'Strength', 3, '10', '115 lbs', 90, NULL, 1);

-- Sunday is a rest day (no exercises)
```

## Notes for Tester

### Key Features to Validate
1. **Duplicate Prevention:** Cannot log same exercise twice in one day
2. **Upsert Behavior:** Logging again updates existing record
3. **Weekly Reset:** New week = fresh completion status
4. **Week Calculation:** Based on plan start_date, not calendar week

### Database Functions Used
- `get_plan_current_week(plan_id)` - Calculate current week
- `get_week_completion_stats(member_id, plan_id, week_number)` - Get weekly stats
- `upsert_workout_progress(...)` - Log or update workout

### Common Issues
- Week not incrementing properly
- Duplicate logs created instead of updating
- Progress percentage incorrect
- Completion status not updating in real-time
- Date calculations off by timezone

### Browser/Device Testing
- Desktop (Chrome, Firefox, Safari, Edge)
- Mobile (iOS Safari, Chrome Mobile)
- Tablet (iPad, Android tablet)
- Test touch interactions on mobile
