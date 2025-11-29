# Testing Guide: Enhanced Workout Tracking System

## 📋 Overview

This guide walks you through testing all the new workout tracking features:
1. ✅ Weekly tracking (Week X of Y)
2. ✅ Duplicate prevention (one log per exercise per day)
3. ✅ Historical tracking (all data preserved)
4. ✅ Progress visualization (weekly progress bar)

---

## 🎯 Test Case 1: Setup and Initial Data

### Prerequisites
You need to have:
- At least one instructor in the database
- At least one member (non-admin user)

### Steps

**1.1 Mark Instructor as Personal Trainer**

```sql
-- Check existing instructors
SELECT id, name, user_id, is_personal_trainer
FROM instructors
LIMIT 5;

-- Update one to be personal trainer (use actual instructor name/id)
UPDATE instructors SET
  is_personal_trainer = true,
  specializations = ARRAY['Strength Training', 'Weight Loss'],
  certifications = ARRAY['NASM-CPT', 'CSCS'],
  max_clients = 15,
  bio = 'Certified personal trainer with 10+ years experience.'
WHERE name = 'YOUR_INSTRUCTOR_NAME';  -- Replace with actual name

-- Verify
SELECT name, is_personal_trainer, specializations
FROM instructors
WHERE is_personal_trainer = true;
```

**Expected Result:** ✅ Instructor now shows `is_personal_trainer = true`

---

**1.2 Login as Trainer**

- Navigate to: `http://localhost:5173/trainer-dashboard`
- Login with the user account linked to that instructor
- You should see: "Trainer Dashboard" page

**Expected Result:**
- ✅ Dashboard shows "Active Clients: 0 / 15"
- ✅ Message: "No clients assigned yet"

---

## 🎯 Test Case 2: Admin Assigns Member to Trainer

**2.1 Login as Admin**

- Navigate to: `http://localhost:5173/admin/members`
- Find a member (non-admin user)
- Click the "Users" icon (Assign Trainer button)

**Expected Result:**
- ✅ Dialog opens showing "Assign Trainer to [Member Name]"
- ✅ Shows list of personal trainers
- ✅ Shows capacity: "0 / 15 clients"
- ✅ Shows "Available" badge

**2.2 Assign Trainer**

- Select the trainer (click radio button)
- Click "Assign Trainer"

**Expected Result:**
- ✅ Success toast: "Trainer Assigned Successfully"
- ✅ Dialog closes
- ✅ Member received notification

**2.3 Verify Assignment**

```sql
-- Check assignment was created
SELECT
  ta.id,
  ta.status,
  p.email as member_email,
  i.name as trainer_name
FROM trainer_assignments ta
JOIN profiles p ON p.id = ta.member_id
JOIN instructors i ON i.id = ta.trainer_id
WHERE ta.status = 'active';
```

**Expected Result:** ✅ Shows the new assignment

---

## 🎯 Test Case 3: Trainer Creates Workout Plan

**3.1 Login as Trainer**

- Navigate to: `http://localhost:5173/trainer-dashboard`

**Expected Result:**
- ✅ Shows "Active Clients: 1 / 15"
- ✅ Client card displays with member's name
- ✅ Orange badge: "No Plan"
- ✅ "Create Plan" button visible

**3.2 Create Workout Plan - Step 1**

- Click "Create Plan" button
- Enter plan details:
  - **Title:** "12-Week Strength Building"
  - **Description:** "Progressive strength program"
  - **Goals:** "Build muscle, increase strength"
  - **Duration:** 12 weeks
- Click "Next: Add Exercises"

**Expected Result:**
- ✅ Step 2 appears (Add Exercises form)

**3.3 Create Workout Plan - Step 2: Add Exercises**

Add Monday exercises:
```
Exercise 1:
- Day: Monday
- Exercise Name: Bench Press
- Type: Strength
- Sets: 4, Reps: 10, Weight: 135 lbs, Rest: 120 sec
- Notes: "Focus on controlled descent"

Exercise 2:
- Day: Monday
- Exercise Name: Squats
- Type: Strength
- Sets: 4, Reps: 10, Weight: 185 lbs, Rest: 120 sec

Exercise 3:
- Day: Monday
- Exercise Name: Deadlift
- Type: Strength
- Sets: 3, Reps: 8, Weight: 225 lbs, Rest: 180 sec
```

Add Wednesday exercises:
```
Exercise 4:
- Day: Wednesday
- Exercise Name: Pull-ups
- Type: Strength
- Sets: 4, Reps: 10, Weight: bodyweight, Rest: 90 sec

Exercise 5:
- Day: Wednesday
- Exercise Name: Barbell Row
- Type: Strength
- Sets: 4, Reps: 10, Weight: 115 lbs, Rest: 90 sec
```

**Expected Result:**
- ✅ After each "Add Exercise", exercise appears in summary
- ✅ Summary shows exercises grouped by day
- ✅ "Create Plan (5 exercises)" button updates count

**3.4 Submit Plan**

- Click "Create Plan (5 exercises)"

**Expected Result:**
- ✅ Success toast: "Workout Plan Created!"
- ✅ Shows: "12-Week Strength Building has been created with 5 exercises"
- ✅ Dialog closes
- ✅ Client card now shows green badge: "Active Plan"
- ✅ "Create Plan" button disappears

**3.5 Verify in Database**

```sql
-- Check plan was created
SELECT id, title, duration_weeks, start_date, current_week, status
FROM workout_plans
WHERE status = 'active'
ORDER BY created_at DESC
LIMIT 1;

-- Check exercises were created
SELECT day_of_week, exercise_name, sets, reps, weight
FROM workout_exercises
WHERE plan_id = '[PLAN_ID_FROM_ABOVE]'
ORDER BY day_of_week, order_index;

-- Check start_date and current_week
SELECT
  title,
  start_date,
  current_week,
  duration_weeks,
  get_plan_current_week(id) as calculated_week
FROM workout_plans
WHERE status = 'active';
```

**Expected Result:**
- ✅ Plan exists with `start_date = today`
- ✅ `current_week = 1`
- ✅ All 5 exercises created
- ✅ Exercises have `plan_id` set

---

## 🎯 Test Case 4: Member Views Workout Plan

**4.1 Login as Member**

- Navigate to: `http://localhost:5173/dashboard`

**Expected Result:**
- ✅ "MyTrainer" widget visible in sidebar
- ✅ Shows trainer name and avatar
- ✅ Shows specializations
- ✅ "View Workout Plan" button visible

**4.2 View Workout Plan**

- Click "View Workout Plan"
- Navigate to: `http://localhost:5173/workout-plan`

**Expected Result:**
```
✅ Plan header shows:
   - Title: "12-Week Strength Building"
   - Badge: "Week 1 of 12"
   - Date range: "[Today's Date] - [6 days from now]"

✅ Progress card shows:
   - "This Week's Progress"
   - "0%"
   - "0 of 5 exercises completed"
   - Empty progress bar

✅ Weekly Schedule section:
   - Tab for each day of week
   - Monday tab is active (or current day)
   - Shows 3 exercises for Monday
   - Each exercise shows:
     * Exercise name
     * Sets × Reps (e.g., "4 × 10")
     * Weight (e.g., "135 lbs")
     * Rest period
     * Notes (if any)
     * "Log" button
     * No checkmark (incomplete)
```

---

## 🎯 Test Case 5: Log First Workout

**5.1 Log Bench Press**

- Click Monday tab
- Find "Bench Press"
- Click "Log" button

**Expected Result:**
- ✅ Dialog opens: "Log Workout"
- ✅ Title shows exercise name
- ✅ Form shows pre-filled sets: 4

**5.2 Enter Workout Data**

```
Sets Completed: 4
Reps Completed: 10
Weight Used: 135
Duration: (leave empty)
Difficulty Rating: 4 stars (click 4th star)
Notes: "Felt strong today!"
```

- Click "Log Workout"

**Expected Result:**
- ✅ Success toast: "Workout Logged! Great job completing Bench Press! (135 lbs)"
- ✅ Dialog closes
- ✅ Bench Press now shows green checkmark ✅
- ✅ "Completed" badge appears
- ✅ Progress updates to "1 of 5 exercises (20%)"
- ✅ Progress bar fills to 20%

**5.3 Verify in Database**

```sql
-- Check workout was logged
SELECT
  wp.completed_at,
  wp.completed_date,
  wp.sets_completed,
  wp.reps_completed,
  wp.weight_used,
  wp.rating,
  wp.week_number,
  we.exercise_name
FROM workout_progress wp
JOIN workout_exercises we ON we.id = wp.exercise_id
WHERE wp.completed_date = CURRENT_DATE
ORDER BY wp.completed_at DESC;
```

**Expected Result:**
- ✅ One row for Bench Press
- ✅ `completed_date = today`
- ✅ `week_number = 1`
- ✅ `sets_completed = 4`
- ✅ `weight_used = '135 lbs'`
- ✅ `rating = 4`

---

## 🎯 Test Case 6: Test Duplicate Prevention

**6.1 Log Same Exercise Again**

- Click "Log" on Bench Press again (same day)

**Expected Result:**
- ✅ Dialog opens
- ✅ Form is empty (fresh form)

**6.2 Enter Different Data**

```
Sets Completed: 4
Reps Completed: 12  ← Changed
Weight Used: 140    ← Changed
Rating: 5 stars     ← Changed
Notes: "Added weight and reps!"
```

- Click "Log Workout"

**Expected Result:**
- ✅ Success toast appears
- ✅ Bench Press still shows checkmark (not duplicate)
- ✅ Progress still shows "1 of 5" (not 2 of 5)

**6.3 Verify No Duplicate**

```sql
-- Should only have ONE entry for Bench Press today
SELECT
  COUNT(*) as count,
  exercise_id,
  completed_date
FROM workout_progress
WHERE completed_date = CURRENT_DATE
GROUP BY exercise_id, completed_date
HAVING COUNT(*) > 1;
```

**Expected Result:**
- ✅ Query returns 0 rows (no duplicates)

```sql
-- Check the updated data
SELECT
  sets_completed,
  reps_completed,
  weight_used,
  rating,
  notes
FROM workout_progress wp
JOIN workout_exercises we ON we.id = wp.exercise_id
WHERE we.exercise_name = 'Bench Press'
  AND wp.completed_date = CURRENT_DATE;
```

**Expected Result:**
- ✅ Shows updated values: reps=12, weight='140 lbs', rating=5
- ✅ Only ONE row returned

---

## 🎯 Test Case 7: Log More Exercises

**7.1 Log Squats**

- Click "Log" on Squats
- Enter: 4 sets, 10 reps, 185 lbs, rating: 4
- Click "Log Workout"

**Expected Result:**
- ✅ Squats shows checkmark
- ✅ Progress: "2 of 5 exercises (40%)"

**7.2 Log Wednesday Exercise**

- Click "Wednesday" tab
- Click "Log" on Pull-ups
- Enter: 4 sets, 8 reps, bodyweight, rating: 5
- Click "Log Workout"

**Expected Result:**
- ✅ Pull-ups shows checkmark
- ✅ Progress: "3 of 5 exercises (60%)"
- ✅ Progress bar at 60%

---

## 🎯 Test Case 8: Test Daily vs Weekly Tracking

**8.1 Check Status Tomorrow**

Option A - Wait until tomorrow, then:
- Login as member
- Go to `/workout-plan`

Option B - Simulate tomorrow with SQL:
```sql
-- Temporarily change completion date to yesterday
UPDATE workout_progress
SET completed_date = CURRENT_DATE - INTERVAL '1 day',
    completed_at = NOW() - INTERVAL '1 day'
WHERE completed_date = CURRENT_DATE;

-- Refresh the workout plan page
```

**Expected Result:**
- ✅ Bench Press STILL shows checkmark ✅
- ✅ Squats STILL shows checkmark ✅
- ✅ Pull-ups STILL shows checkmark ✅
- ✅ Progress still shows "3 of 5 (60%)"
- ✅ Date range still shows same week

**Why?** Because we changed to WEEKLY tracking, not daily!

**Reset if you used SQL:**
```sql
UPDATE workout_progress
SET completed_date = CURRENT_DATE,
    completed_at = NOW()
WHERE completed_date = CURRENT_DATE - INTERVAL '1 day';
```

---

## 🎯 Test Case 9: Test Week Transition

**9.1 Simulate Next Week**

```sql
-- Change plan start date to 8 days ago (forces Week 2)
UPDATE workout_plans
SET start_date = CURRENT_DATE - INTERVAL '8 days'
WHERE status = 'active';

-- Verify week calculation
SELECT
  title,
  start_date,
  current_week,
  get_plan_current_week(id) as calculated_week,
  duration_weeks
FROM workout_plans
WHERE status = 'active';
```

**Expected Result:**
- ✅ `calculated_week = 2`

**9.2 View Plan in UI**

- Refresh `/workout-plan` page

**Expected Result:**
```
✅ Badge now shows: "Week 2 of 12"
✅ Date range updated to Week 2 dates
✅ Progress: "0 of 5 exercises (0%)"  ← Reset!
✅ All checkmarks cleared (fresh week)
✅ Progress bar empty
```

**Why?** New week = fresh start!

**9.3 Verify Previous Week Data Preserved**

```sql
-- Check that Week 1 data still exists
SELECT
  we.exercise_name,
  wp.week_number,
  wp.completed_date,
  wp.weight_used
FROM workout_progress wp
JOIN workout_exercises we ON we.id = wp.exercise_id
ORDER BY wp.week_number, wp.completed_date;
```

**Expected Result:**
- ✅ Shows all Week 1 logs with `week_number = 1`
- ✅ Data is preserved (not deleted)

**9.4 Log New Week 2 Workout**

- Click "Log" on Bench Press
- Enter: 4 sets, 10 reps, 145 lbs (increased weight!)
- Click "Log Workout"

**Expected Result:**
- ✅ Logged successfully
- ✅ Progress: "1 of 5 (20%)"
- ✅ Bench Press shows checkmark

```sql
-- Check both weeks exist
SELECT
  we.exercise_name,
  wp.week_number,
  wp.weight_used,
  wp.completed_date
FROM workout_progress wp
JOIN workout_exercises we ON we.id = wp.exercise_id
WHERE we.exercise_name = 'Bench Press'
ORDER BY wp.week_number;
```

**Expected Result:**
```
✅ Two rows:
   Row 1: Bench Press, week_number=1, weight='140 lbs'
   Row 2: Bench Press, week_number=2, weight='145 lbs'
```

**9.5 Reset for Continued Testing**

```sql
-- Reset plan back to Week 1 if needed
UPDATE workout_plans
SET start_date = CURRENT_DATE
WHERE status = 'active';
```

---

## 🎯 Test Case 10: Test Database Functions

**10.1 Get Current Week**

```sql
SELECT get_plan_current_week('[YOUR_PLAN_ID]');
```

**Expected:** Returns `1` (or current week number)

**10.2 Get Week Dates**

```sql
SELECT * FROM get_current_week_dates('[YOUR_PLAN_ID]');
```

**Expected:**
```
week_number | week_start  | week_end
------------+-------------+------------
     1      | 2025-11-28  | 2025-12-04
```

**10.3 Get Week Stats**

```sql
SELECT * FROM get_week_completion_stats(
  '[MEMBER_ID]',
  '[PLAN_ID]',
  1  -- Week number
);
```

**Expected:**
```
total_exercises | completed_exercises | completion_percentage | week_start | week_end
----------------+--------------------+----------------------+------------+-----------
       5        |          3         |        60.0          | 2025-11-28 | 2025-12-04
```

**10.4 Get Exercise History**

```sql
SELECT * FROM get_exercise_history(
  '[MEMBER_ID]',
  '[BENCH_PRESS_EXERCISE_ID]',
  10  -- Last 10 completions
);
```

**Expected:** Returns all times Bench Press was logged (up to 10)

**10.5 Get Personal Record**

```sql
SELECT * FROM get_exercise_personal_record(
  '[MEMBER_ID]',
  '[BENCH_PRESS_EXERCISE_ID]'
);
```

**Expected:**
```
max_weight | max_weight_date      | max_volume | total_sessions | last_completed
-----------+---------------------+------------+----------------+-------------------
   145     | 2025-11-28 10:30:00 |    5800    |       2        | 2025-11-28 10:30:00
```

---

## 🎯 Test Case 11: Edge Cases

**11.1 Create Plan with Long Duration**

- Create plan with 52 weeks duration
- Verify UI shows "Week 1 of 52"

**11.2 Test Empty Week**

- Don't log any workouts
- Check progress shows "0 of 5 (0%)"

**11.3 Test All Exercises Completed**

- Log all 5 exercises
- Verify progress shows "5 of 5 (100%)"
- Verify progress bar is full

**11.4 Test Exercise with No Weight**

- Create cardio exercise (e.g., Running)
- Log without weight
- Verify saves correctly

---

## ✅ Success Criteria Checklist

### Database
- [ ] Migration ran without errors
- [ ] `workout_plans` has `start_date` and `current_week` columns
- [ ] `workout_progress` has `week_number`, `plan_id`, `completed_date` columns
- [ ] Unique index prevents duplicate daily logs
- [ ] All functions created successfully

### Admin Flow
- [ ] Can assign member to trainer
- [ ] Capacity indicators show correctly
- [ ] Assignment creates notification

### Trainer Flow
- [ ] Trainer dashboard shows client count
- [ ] Can create workout plan
- [ ] Can add multiple exercises
- [ ] Plan creation sends notification

### Member Flow
- [ ] MyTrainer widget displays
- [ ] Can view workout plan
- [ ] Shows "Week X of Y" badge
- [ ] Shows week date range
- [ ] Shows week progress percentage
- [ ] Can log workouts
- [ ] Exercises show checkmarks when completed
- [ ] Progress bar updates in real-time

### Weekly Tracking
- [ ] Completion persists throughout the week
- [ ] New week resets progress to 0%
- [ ] Week number auto-calculates correctly
- [ ] Old week data is preserved

### Duplicate Prevention
- [ ] Can log same exercise once per day
- [ ] Logging again updates (doesn't duplicate)
- [ ] Database has only one entry per exercise per day

### Data Integrity
- [ ] Exercise history is preserved
- [ ] Can query past workouts
- [ ] Week numbers are assigned correctly
- [ ] Personal records can be calculated

---

## 🐛 Common Issues

### Issue: "Week 1 of 12" not showing
**Fix:** Check `start_date` is set:
```sql
UPDATE workout_plans SET start_date = CURRENT_DATE WHERE start_date IS NULL;
```

### Issue: Progress not updating
**Fix:** Check `plan_id` is set in exercises:
```sql
UPDATE workout_progress wp
SET plan_id = we.plan_id
FROM workout_exercises we
WHERE wp.exercise_id = we.id AND wp.plan_id IS NULL;
```

### Issue: Duplicate error when logging
**Fix:** This means unique constraint is working! The upsert function should handle it.

### Issue: Wrong week number
**Fix:** Recalculate:
```sql
UPDATE workout_plans
SET current_week = get_plan_current_week(id);
```

---

## 📊 Sample Test Data Summary

After completing all tests, you should have:

```
✅ 1 Personal Trainer
✅ 1 Active Assignment
✅ 1 Workout Plan (12 weeks, Week 1)
✅ 5 Exercises (3 Monday, 2 Wednesday)
✅ 3+ Workout Logs
✅ Week progress showing 60%+
✅ Historical data for multiple exercises
```

---

**That's it! If all tests pass, the enhanced workout tracking system is working perfectly!** 🎉
