# Enhanced Workout Tracking System 🎯

## Overview

The workout tracking system now includes a **combination of features** that provides:
1. ✅ **Weekly Tracking** - Know which week of your program you're on
2. ✅ **Duplicate Prevention** - One log per exercise per day (updates existing)
3. ✅ **Historical Tracking** - All workout data preserved forever
4. ✅ **Better Progress Visualization** - See daily AND weekly progress

---

## 🆕 What Changed

### Before vs After

| Feature | Before | After |
|---------|--------|-------|
| **Completion Tracking** | Daily only (resets each day) | Weekly tracking (resets each week) |
| **Multiple Logs** | Could log same exercise many times per day | One log per exercise per day (updates existing) |
| **Week Awareness** | No concept of weeks | Shows "Week 1 of 12" |
| **Progress Display** | Only showed rolling 7-day stats | Shows current week progress with dates |
| **Historical Data** | Saved but not visible | Saved and queryable |

---

## 🎯 How It Works Now

### 1. Weekly Tracking

Every workout plan now tracks:
- **Start Date** - When the plan began
- **Current Week** - Which week of the program you're on (auto-calculated)
- **Week Boundaries** - Start and end dates of current week

```
Example:
Plan: "12-Week Strength Program"
Started: November 25, 2025
Current Week: Week 2 of 12
This Week: Nov 25 - Dec 1
```

#### How Weeks are Calculated

```sql
-- Automatically calculated based on start date
weeks_elapsed = FLOOR((TODAY - start_date) / 7) + 1

-- Examples:
Start Date: Nov 25
- Nov 25 (Day 0-6) = Week 1
- Dec 2 (Day 7-13) = Week 2
- Dec 9 (Day 14-20) = Week 3
```

---

### 2. Duplicate Prevention

**Old Behavior:**
- Log Bench Press at 10 AM → Saved
- Log Bench Press at 2 PM → Saved again (duplicate)
- Database has 2 entries for same exercise same day

**New Behavior:**
- Log Bench Press at 10 AM → Saved
- Log Bench Press at 2 PM → **Updates** the 10 AM entry
- Database has 1 entry with latest data

#### Technical Implementation

Uses `upsert_workout_progress()` function:
1. Check if exercise was logged today
2. If YES → Update existing log
3. If NO → Insert new log

**Constraint:**
```sql
UNIQUE INDEX unique_exercise_completion_per_day
ON workout_progress(member_id, exercise_id, DATE(completed_at))
```

This ensures one log per member, per exercise, per day.

---

### 3. Historical Tracking

All workout logs are **preserved forever** with:
- Exact timestamp of completion
- Sets, reps, weight used
- Difficulty rating (1-5 stars)
- Week number when completed
- Personal notes

**Database Functions Available:**

```sql
-- Get last 10 completions of an exercise
SELECT * FROM get_exercise_history(
  member_id,
  exercise_id,
  limit := 10
);

-- Get personal records for an exercise
SELECT * FROM get_exercise_personal_record(
  member_id,
  exercise_id
);
-- Returns: max_weight, max_volume, total_sessions, etc.
```

---

### 4. Progress Visualization

#### A. Week-Level Progress

Shows in the plan header:

```
┌─────────────────────────────────────────────┐
│ 12-Week Strength Program   [Week 2 of 12]  │
├─────────────────────────────────────────────┤
│ Nov 25 - Dec 1                              │
│                                             │
│ This Week's Progress           73%         │
│ ████████████████████░░░░░░                 │
│ 11 of 15 exercises completed                │
└─────────────────────────────────────────────┘
```

**What it shows:**
- Current week number (e.g., "Week 2 of 12")
- Week date range (e.g., "Nov 25 - Dec 1")
- Completion percentage for THIS WEEK only
- Progress bar with gradient
- Count of completed vs total exercises

#### B. Day-Level Completion

Exercise list shows checkmarks for completed exercises:

```
Monday
✅ Bench Press - 4×10 @ 135 lbs
✅ Squats - 3×12 @ 185 lbs
❌ Deadlift - 4×8 @ 225 lbs

Tuesday
❌ Overhead Press - 3×10 @ 95 lbs
```

**Completion logic:**
- Checkmark (✅) = Completed THIS WEEK
- No checkmark (❌) = Not completed this week

---

## 📅 Real-World Example Walkthrough

### Scenario: 12-Week Program Starting Nov 25

**Week 1 (Nov 25 - Dec 1)**

**Monday, Nov 25:**
- View plan: Shows "Week 1 of 12"
- Log Bench Press: Saved with `week_number = 1`
- Log Squats: Saved with `week_number = 1`
- Progress: 2/15 exercises (13%)

**Tuesday, Nov 26:**
- View plan: Still shows "Week 1 of 12"
- Monday's exercises STILL show checkmarks ✅
- Progress: 2/15 exercises (13%)
- Log Tuesday exercises
- Progress updates to 5/15 (33%)

**Saturday, Nov 30:**
- View plan: "Week 1 of 12"
- All week's exercises show checkmarks
- Progress: 15/15 exercises (100%)

---

**Week 2 (Dec 2 - Dec 8)**

**Monday, Dec 2:**
- View plan: NOW shows "Week 2 of 12" ← Auto-updated!
- Progress: 0/15 exercises (0%) ← Reset for new week
- All exercises show no checkmarks (fresh start)
- But last week's data is still in database!

**Log Bench Press:**
- Saved with `week_number = 2`
- Shows checkmark ✅
- Progress: 1/15 (7%)

---

**Week 12 (Feb 17 - Feb 23)**

**Final week:**
- View plan: "Week 12 of 12"
- Complete all exercises
- Plan can be marked as "completed" by trainer
- All 12 weeks of data preserved in database

---

## 🔍 Database Schema Changes

### Added Columns

**workout_plans table:**
```sql
start_date        date    DEFAULT CURRENT_DATE
current_week      integer DEFAULT 1
```

**workout_progress table:**
```sql
week_number  integer  -- Automatically set when logging
plan_id      uuid     -- Link to plan (for stats)
```

### New Functions

1. **get_plan_current_week(plan_id)**
   - Returns current week number (1-12)
   - Based on start_date and today's date

2. **get_current_week_dates(plan_id)**
   - Returns week_number, week_start, week_end
   - Example: `(2, '2025-12-02', '2025-12-08')`

3. **get_week_completion_stats(member_id, plan_id, week_number)**
   - Returns total_exercises, completed_exercises, percentage
   - Plus week_start and week_end dates

4. **upsert_workout_progress(...)**
   - Insert new log OR update existing log for today
   - Automatically sets week_number
   - Prevents duplicates

5. **get_exercise_history(member_id, exercise_id, limit)**
   - Get last N completions of an exercise
   - Shows progress over time

6. **get_exercise_personal_record(member_id, exercise_id)**
   - Max weight ever lifted
   - Max volume (sets × reps × weight)
   - Total sessions
   - Last completed date

---

## 🎮 User Experience

### For Members

**Monday Morning:**
```
1. Open /workout-plan
2. See: "Week 2 of 12 (Nov 25 - Dec 1)"
3. See: "This Week's Progress: 40%"
4. Click Monday tab
5. See exercises with completion status
6. Click "Log" on Bench Press
7. Enter: 4 sets, 10 reps, 140 lbs, difficulty: 4 stars
8. Click "Save Workout"
9. See green checkmark ✅ appear
10. Progress updates to 47%
```

**Monday Evening (forgot to log weight):**
```
1. Click "Log" on Bench Press again
2. System shows: Form with previously entered data
3. Update weight to 145 lbs
4. Click "Save Workout"
5. Previous log is UPDATED (not duplicated)
```

**Tuesday:**
```
1. Open /workout-plan
2. Monday's exercises still show checkmarks ✅
3. Tuesday's exercises show incomplete ❌
4. Weekly progress still shows Monday's work
```

**Next Monday (Dec 2):**
```
1. Open /workout-plan
2. See: "Week 3 of 12 (Dec 2 - Dec 8)"
3. All checkmarks cleared (new week)
4. Progress shows 0%
5. But last week's data is preserved in history
```

---

### For Trainers

**Creating Plans:**
```
1. Create plan: "12-Week Strength"
2. Set duration: 12 weeks
3. System automatically sets start_date = today
4. Client's plan starts at Week 1
```

**Viewing Progress (Future Feature):**
```
- See client's current week
- See week-by-week completion history
- View personal records
- Track weight progression
```

---

## 📊 Data Examples

### workout_progress Table

| id | member_id | exercise_id | sets | reps | weight | completed_at | week_number | plan_id |
|----|-----------|-------------|------|------|--------|--------------|-------------|---------|
| 1 | user-123 | bench-mon | 4 | 10 | 135 lbs | 2025-11-25 10:00 | 1 | plan-abc |
| 2 | user-123 | bench-mon | 4 | 10 | 140 lbs | 2025-12-02 10:30 | 2 | plan-abc |
| 3 | user-123 | bench-mon | 4 | 10 | 145 lbs | 2025-12-09 09:45 | 3 | plan-abc |

**Notice:**
- Same exercise logged in Week 1, Week 2, Week 3
- Weight progressing: 135 → 140 → 145 lbs
- Each entry is preserved (historical data)
- Week numbers automatically assigned

---

## 🎯 Key Benefits

### 1. Clear Progress Tracking
- Members know exactly which week they're on
- Can see week-by-week improvement
- Motivation from seeing progress percentage

### 2. Data Integrity
- No duplicate logs cluttering database
- One source of truth per day
- But can update if made mistake

### 3. Historical Analysis (Future)
- Track strength gains over time
- See personal records
- Compare Week 1 vs Week 12 performance

### 4. Better UX
- Week progress doesn't "disappear" after 7 days
- Clear visual feedback
- Dates shown for context

---

## 🔮 Future Enhancements (Not Yet Built)

These functions exist but don't have UI yet:

### 1. Exercise History View
```
Bench Press History:
┌────────────┬──────┬──────┬────────┬────────┐
│ Date       │ Sets │ Reps │ Weight │ Rating │
├────────────┼──────┼──────┼────────┼────────┤
│ Dec 9 (W3) │ 4    │ 10   │ 145lbs │ ★★★★☆  │
│ Dec 2 (W2) │ 4    │ 10   │ 140lbs │ ★★★★☆  │
│ Nov 25 (W1)│ 4    │ 10   │ 135lbs │ ★★★☆☆  │
└────────────┴──────┴──────┴────────┴────────┘
```

### 2. Personal Records Display
```
Bench Press PRs:
- Max Weight: 185 lbs (Week 8, Jan 20)
- Max Volume: 7,400 lbs (Week 10, Feb 3)
- Total Sessions: 12
- Last Completed: 2 days ago
```

### 3. Progress Charts
- Weight progression graph
- Volume over time
- Compliance percentage per week

---

## 🧪 Testing the New Features

### Test 1: Weekly Tracking

```sql
-- Create a plan that started 8 days ago
INSERT INTO workout_plans (
  assignment_id, title, duration_weeks, start_date
) VALUES (
  '[ASSIGNMENT_ID]',
  'Test Plan',
  12,
  CURRENT_DATE - INTERVAL '8 days'
);

-- Check current week (should be 2)
SELECT get_plan_current_week('[PLAN_ID]');
-- Expected: 2

-- Get week dates
SELECT * FROM get_current_week_dates('[PLAN_ID]');
-- Expected: week 2 dates
```

### Test 2: Duplicate Prevention

```sql
-- Log exercise
SELECT upsert_workout_progress(
  '[MEMBER_ID]', '[EXERCISE_ID]', '[PLAN_ID]',
  4, 10, '135 lbs', NULL, 4, 'Felt good'
);

-- Log same exercise again today
SELECT upsert_workout_progress(
  '[MEMBER_ID]', '[EXERCISE_ID]', '[PLAN_ID]',
  4, 12, '140 lbs', NULL, 5, 'Increased weight!'
);

-- Check: Should only have ONE entry for today
SELECT * FROM workout_progress
WHERE member_id = '[MEMBER_ID]'
  AND exercise_id = '[EXERCISE_ID]'
  AND DATE(completed_at) = CURRENT_DATE;
-- Expected: 1 row with weight='140 lbs'
```

### Test 3: Week Completion Stats

```sql
-- Get week stats
SELECT * FROM get_week_completion_stats(
  '[MEMBER_ID]', '[PLAN_ID]', 1
);

-- Expected output:
-- total_exercises: 15
-- completed_exercises: 5
-- completion_percentage: 33.3
-- week_start: 2025-11-25
-- week_end: 2025-12-01
```

---

## 📝 Migration Instructions

1. **Run the migration:**
   ```bash
   # Apply enhance_workout_tracking.sql
   supabase/migrations/enhance_workout_tracking.sql
   ```

2. **Verify functions created:**
   ```sql
   SELECT routine_name FROM information_schema.routines
   WHERE routine_name LIKE '%week%' OR routine_name LIKE '%upsert%';
   ```

3. **Existing plans will auto-set:**
   - `start_date = CURRENT_DATE`
   - `current_week = 1`

4. **Existing workout_progress entries:**
   - `plan_id` will be backfilled
   - `week_number` will be NULL (can calculate if needed)

---

## 🎉 Summary

The enhanced workout tracking system now provides:

✅ **Weekly Organization** - Clear week tracking with auto-calculated week numbers
✅ **Smart Logging** - Prevents duplicates, updates existing logs
✅ **Complete History** - All data preserved for analysis
✅ **Better UX** - Week progress, date ranges, visual feedback
✅ **Future-Ready** - Functions for PRs, history, analytics

**Members get:**
- Clear visibility into their program
- Week-by-week progress tracking
- No confusion about "lost" progress

**Trainers get (future):**
- Client progress monitoring
- Historical performance data
- Ability to adjust plans based on data

**System gets:**
- Clean data (no duplicates)
- Rich historical data
- Scalable for advanced features

---

**Database Migration:** `enhance_workout_tracking.sql`
**Updated Components:** `LogWorkoutDialog.tsx`, `WorkoutPlan.tsx`
**Date:** November 28, 2025
