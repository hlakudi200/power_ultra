# Workout Logging Business Rules Analysis

## Executive Summary

This document provides a comprehensive analysis of the current business rules implemented in the workout logging system and proposes enhancements to improve the feature's effectiveness and user experience.

**Analysis Date:** 2025-12-09
**Analyzed Components:**
- Frontend: WorkoutPlan.tsx, LogWorkoutDialog.tsx
- Database Functions: upsert_workout_progress, get_week_completion_stats, get_plan_current_week
- Database Schema: workout_progress, workout_plans, workout_exercises
- Test Cases: 03_WORKOUT_TRACKING_TESTS.md

---

## Current Business Rules

### 1. Temporal Rules

#### 1.1 Past Day Logging Prevention
- **Location:** [WorkoutPlan.tsx:158-175](src/components/WorkoutPlan.tsx#L158-L175)
- **Rule:** Users CANNOT log workouts for past days
- **Implementation:** Client-side validation comparing selected day to current day
- **User Message:** "You cannot log workouts for past days. Today is {day}. Please log workouts on the day you complete them for accurate tracking."
- **Severity:** Hard block (destructive toast)
- **Rationale:** Ensures accurate real-time tracking

```typescript
const todayIndex = DAYS_OF_WEEK.indexOf(today);
const selectedDayIndex = DAYS_OF_WEEK.indexOf(dayOfWeek);

if (selectedDayIndex < todayIndex) {
  // Prevent logging
}
```

#### 1.2 Week Calculation
- **Location:** [enhance_workout_tracking.sql:46-70](supabase/migrations/enhance_workout_tracking.sql#L46-L70)
- **Rule:** Current week is calculated based on plan start_date, NOT calendar week
- **Formula:** `FLOOR(EXTRACT(EPOCH FROM (CURRENT_DATE - start_date)) / (7 * 24 * 60 * 60)) + 1`
- **Boundary:** Capped at duration_weeks (prevents overflow beyond plan duration)
- **Minimum:** Week 1 (prevents negative weeks for future-dated plans)

#### 1.3 Week Transition
- **Rule:** Progress resets weekly based on plan start_date
- **Implementation:** Each workout_progress record has a week_number field
- **Behavior:** Previous weeks' completions are preserved, new week starts at 0%

### 2. Duplicate Prevention Rules

#### 2.1 One Log Per Exercise Per Day
- **Location:** [enhance_workout_tracking.sql:34-35](supabase/migrations/enhance_workout_tracking.sql#L34-L35)
- **Rule:** UNIQUE constraint prevents multiple logs for same exercise on same day
- **Constraint:** `unique_exercise_completion_per_day ON workout_progress(member_id, exercise_id, completed_date)`
- **Behavior:** Subsequent logs UPDATE existing record (upsert pattern)

#### 2.2 Upsert Logic
- **Location:** [enhance_workout_tracking.sql:259-333](supabase/migrations/enhance_workout_tracking.sql#L259-L333)
- **Rule:** First log creates record, subsequent logs on same day update it
- **Process:**
  1. Try UPDATE WHERE completed_date = today
  2. If no rows updated, INSERT new record
  3. Return progress_id in both cases
- **Test Case:** TC-WORKOUT-007 validates this behavior

### 3. Data Validation Rules

#### 3.1 Required Fields
- **Sets Completed:** Integer (likely required)
- **Reps Completed:** Integer (likely required)
- **Rating:** Integer 1-5 (likely required based on test cases)

#### 3.2 Optional Fields
- **Weight Used:** Text (converted to numeric), can be NULL
- **Duration Minutes:** Integer, can be NULL
- **Notes:** Text, can be NULL

#### 3.3 Weight Handling
- **Location:** [fix_upsert_workout_progress_weight_type.sql:33-39](supabase/migrations/fix_upsert_workout_progress_weight_type.sql#L33-L39)
- **Rule:** Accepts text input ("135", "135 lbs", "60.5 kg"), extracts numeric value
- **Implementation:** `regexp_replace(p_weight_used, '[^0-9.]', '', 'g')`
- **Storage:** numeric(10,2) in database
- **Examples:**
  - "135" → 135.00
  - "135 lbs" → 135.00
  - "60.5 kg" → 60.50
  - "bodyweight" → NULL

#### 3.4 Rating Constraint
- **Rule:** Rating must be between 1 and 5
- **Implementation:** CHECK constraint on workout_progress table
- **Purpose:** Difficulty/effort rating system

### 4. Progress Calculation Rules

#### 4.1 Weekly Completion Percentage
- **Location:** [enhance_workout_tracking.sql:107-158](supabase/migrations/enhance_workout_tracking.sql#L107-L158)
- **Formula:** `(completed_exercises / total_exercises) * 100`
- **Precision:** Rounded to 1 decimal place
- **Week Scope:** Only counts exercises completed within current week's date range
- **Total Count:** All exercises in the plan (regardless of day_of_week)

#### 4.2 Day Progress Indicator
- **Rule:** Shows completion for specific day (e.g., "3/5 exercises" for Monday)
- **Scope:** Filtered by day_of_week
- **Display:** Count + Percentage (TC-WORKOUT-015)

#### 4.3 Exercise Completion Status
- **Rule:** Exercise marked complete if logged TODAY
- **Visual States:**
  - **Incomplete:** White background, blue "Log Workout" button
  - **Completed:** Green background, checkmark, "Done" badge
- **Persistence:** Status persists across sessions (TC-WORKOUT-027)

### 5. Plan Management Rules

#### 5.1 Active Plan Display
- **Rule:** Only plans with status = 'active' are displayed
- **Constraint:** Users should only have ONE active plan per assignment
- **Test Case:** TC-WORKOUT-023 validates this

#### 5.2 Plan Duration
- **Rule:** Plans have a duration_weeks field
- **Current Week:** Cannot exceed duration_weeks
- **Auto-Update:** Trigger automatically updates current_week on plan updates

### 6. Assignment Rules

#### 6.1 Trainer Requirement
- **Rule:** User must have active trainer assignment to have a workout plan
- **Chain:** profile → trainer_assignment (active) → workout_plan (active) → workout_exercises

#### 6.2 One Active Trainer
- **Location:** [create_personal_training_system.sql](database_sql/create_personal_training_system.sql)
- **Rule:** Unique constraint ensures one active trainer per member
- **Impact:** Member can only have one active workout plan at a time

### 7. Historical Data Rules

#### 7.1 Exercise History
- **Function:** get_exercise_history(member_id, exercise_id, limit)
- **Rule:** Returns up to N most recent logs for specific exercise
- **Order:** DESC by completed_at (most recent first)
- **Purpose:** View progress over time (TC-WORKOUT-021)

#### 7.2 Personal Records (PRs)
- **Function:** get_exercise_personal_record(member_id, exercise_id)
- **Tracked Metrics:**
  - Max weight (highest single weight used)
  - Max volume (sets × reps × weight)
  - Total sessions count
  - Last completed date
- **Purpose:** Track personal bests (TC-WORKOUT-022)

### 8. Security Rules

#### 8.1 Row Level Security
- **Rule:** Users can only view/edit their own workout_progress records
- **Implementation:** RLS policies on workout_progress table
- **Scope:** member_id must match auth.uid()

#### 8.2 Function Permissions
- **Rule:** All workout functions granted to 'authenticated' role only
- **Functions:**
  - upsert_workout_progress
  - get_week_completion_stats
  - get_plan_current_week
  - get_exercise_history
  - get_exercise_personal_record

---

## Business Rules NOT Currently Implemented

### 1. Rest Period Enforcement
- No minimum rest between workout sessions
- No prevention of logging same exercise multiple times per day (now protected by unique constraint, but only prevents duplicates, doesn't warn about overtraining)

### 2. Progressive Overload Validation
- No tracking of whether weight/reps are increasing over time
- No warnings if user is consistently decreasing weight (potential injury indicator)

### 3. Streak Tracking
- No tracking of consecutive days/weeks of completion
- No gamification elements (badges, achievements)

### 4. Form Quality/Injury Prevention
- Rating system exists (1-5) but no context for what it measures
- No explicit form quality tracking
- No injury/pain reporting mechanism

### 5. Workout Frequency Limits
- No maximum workouts per week limit
- No prevention of overtraining (e.g., 7 days straight)

### 6. Nutritional Integration
- No tracking of pre/post-workout nutrition
- No hydration tracking

### 7. Recovery Metrics
- No sleep quality tracking
- No soreness/recovery tracking
- No recommended rest days based on intensity

### 8. Exercise Substitution
- No ability to substitute exercises (e.g., injury, equipment unavailable)
- No alternative exercise suggestions

### 9. Plan Adherence Metrics
- No overall adherence percentage across entire plan duration
- No alerts for falling behind on plan

### 10. Future Day Planning
- Cannot pre-plan or schedule workouts for future days
- Cannot mark exercises as "skipped" vs "not yet completed"

---

## Proposed Business Rule Enhancements

### Priority 1: High Impact, Low Complexity

#### 1.1 Streak Tracking
**Benefit:** Increases motivation and engagement

**Implementation:**
```sql
-- Add to profiles or create new table
ALTER TABLE profiles ADD COLUMN current_streak_days integer DEFAULT 0;
ALTER TABLE profiles ADD COLUMN longest_streak_days integer DEFAULT 0;
ALTER TABLE profiles ADD COLUMN last_workout_date date;

-- Function to update streak
CREATE FUNCTION update_workout_streak(p_member_id uuid)
RETURNS void AS $$
DECLARE
  v_last_workout date;
  v_current_streak integer;
BEGIN
  SELECT last_workout_date, current_streak_days
  INTO v_last_workout, v_current_streak
  FROM profiles WHERE id = p_member_id;

  -- If workout logged today and yesterday was last workout
  IF v_last_workout = CURRENT_DATE - 1 THEN
    v_current_streak := v_current_streak + 1;
  -- If workout logged today and last workout was today (same day)
  ELSIF v_last_workout = CURRENT_DATE THEN
    -- Don't change streak
    RETURN;
  -- Streak broken
  ELSE
    v_current_streak := 1;
  END IF;

  UPDATE profiles
  SET
    current_streak_days = v_current_streak,
    longest_streak_days = GREATEST(longest_streak_days, v_current_streak),
    last_workout_date = CURRENT_DATE
  WHERE id = p_member_id;
END;
$$ LANGUAGE plpgsql;

-- Call from upsert_workout_progress
PERFORM update_workout_streak(p_member_id);
```

**UI Changes:**
- Display "🔥 5 Day Streak!" badge in workout plan header
- Show longest streak in profile/stats page

#### 1.2 Personal Record (PR) Detection and Notification
**Benefit:** Immediate feedback and motivation

**Implementation:**
```sql
-- Modify upsert_workout_progress to detect PRs
CREATE FUNCTION check_for_pr(
  p_member_id uuid,
  p_exercise_id uuid,
  p_weight_used numeric,
  p_sets integer,
  p_reps integer
)
RETURNS TABLE (
  is_weight_pr boolean,
  is_volume_pr boolean,
  previous_max_weight numeric,
  previous_max_volume numeric
) AS $$
DECLARE
  v_prev_max_weight numeric;
  v_prev_max_volume numeric;
  v_new_volume numeric;
BEGIN
  -- Get previous PRs
  SELECT max_weight, max_volume
  INTO v_prev_max_weight, v_prev_max_volume
  FROM get_exercise_personal_record(p_member_id, p_exercise_id);

  v_new_volume := p_sets * p_reps * COALESCE(p_weight_used, 0);

  RETURN QUERY SELECT
    (p_weight_used > COALESCE(v_prev_max_weight, 0)),
    (v_new_volume > COALESCE(v_prev_max_volume, 0)),
    v_prev_max_weight,
    v_prev_max_volume;
END;
$$ LANGUAGE plpgsql;
```

**UI Changes:**
- Show "🏆 New PR! +10 lbs" toast when weight PR detected
- Show PR badge on exercise card
- Display previous PR values when logging workout

#### 1.3 Weekly Adherence Percentage
**Benefit:** Better visibility into plan compliance

**Implementation:**
```sql
-- Add to workout_plans or create view
CREATE FUNCTION get_overall_plan_adherence(
  p_member_id uuid,
  p_plan_id uuid
)
RETURNS TABLE (
  total_planned_workouts integer,
  completed_workouts integer,
  adherence_percentage numeric,
  weeks_completed integer,
  current_week integer
) AS $$
DECLARE
  v_plan_start date;
  v_current_week integer;
  v_total_exercises integer;
  v_weeks_since_start integer;
BEGIN
  SELECT start_date, duration_weeks INTO v_plan_start, v_current_week
  FROM workout_plans WHERE id = p_plan_id;

  SELECT COUNT(*) INTO v_total_exercises
  FROM workout_exercises WHERE plan_id = p_plan_id;

  v_weeks_since_start := FLOOR(EXTRACT(EPOCH FROM (CURRENT_DATE - v_plan_start)) / (7 * 24 * 60 * 60)) + 1;
  v_weeks_since_start := LEAST(v_weeks_since_start, v_current_week);

  RETURN QUERY
  SELECT
    (v_total_exercises * v_weeks_since_start)::integer,
    (SELECT COUNT(*) FROM workout_progress
     WHERE plan_id = p_plan_id AND member_id = p_member_id)::integer,
    CASE
      WHEN v_total_exercises * v_weeks_since_start > 0
      THEN ROUND(
        (SELECT COUNT(*) FROM workout_progress
         WHERE plan_id = p_plan_id AND member_id = p_member_id)::numeric
        / (v_total_exercises * v_weeks_since_start) * 100, 1
      )
      ELSE 0
    END,
    v_weeks_since_start,
    v_current_week;
END;
$$ LANGUAGE plpgsql;
```

**UI Changes:**
- Display "Overall Adherence: 78%" in plan header
- Color code: Green (>80%), Yellow (60-80%), Red (<60%)

### Priority 2: Medium Impact, Medium Complexity

#### 2.1 Progressive Overload Tracking
**Benefit:** Ensures proper training progression

**Implementation:**
```sql
CREATE FUNCTION check_progressive_overload(
  p_member_id uuid,
  p_exercise_id uuid,
  p_weight_used numeric,
  p_reps integer
)
RETURNS TABLE (
  is_progressing boolean,
  trend text, -- 'increasing', 'plateaued', 'decreasing'
  recommendation text
) AS $$
DECLARE
  v_last_3_workouts record[];
  v_avg_recent numeric;
  v_avg_previous numeric;
BEGIN
  -- Get last 6 workouts, split into recent 3 and previous 3
  -- Compare average weight × reps between the two sets
  -- Determine trend and provide recommendation

  -- Implementation details...
END;
$$ LANGUAGE plpgsql;
```

**UI Changes:**
- Show trend arrow (↑ progressing, → plateau, ↓ decreasing) on exercise card
- Display recommendation: "Try increasing weight by 5 lbs next session"

#### 2.2 Rest Day Enforcement
**Benefit:** Prevents overtraining

**Implementation:**
```typescript
// In WorkoutPlan.tsx, add check for consecutive days
const getConsecutiveDaysWorked = async () => {
  const last7Days = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const hasWorkout = await checkWorkoutOnDate(date);
    if (hasWorkout) last7Days.push(date);
    else break;
  }
  return last7Days.length;
};

// Warning if 6+ consecutive days
if (consecutiveDays >= 6) {
  toast({
    title: "Rest Day Recommended",
    description: `You've worked out ${consecutiveDays} days in a row. Consider taking a rest day to prevent overtraining.`,
    variant: "warning",
  });
}
```

#### 2.3 Exercise Substitution System
**Benefit:** Flexibility for injuries or equipment availability

**Implementation:**
```sql
CREATE TABLE exercise_alternatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_exercise_id uuid REFERENCES workout_exercises(id),
  alternative_exercise_name text NOT NULL,
  alternative_type text,
  reason text, -- 'injury', 'equipment', 'preference'
  same_muscle_groups boolean DEFAULT true,
  difficulty_level text, -- 'easier', 'same', 'harder'
  created_at timestamptz DEFAULT now()
);

CREATE FUNCTION substitute_exercise(
  p_original_exercise_id uuid,
  p_alternative_name text,
  p_reason text
)
RETURNS uuid AS $$ ... $$;
```

**UI Changes:**
- "Can't do this exercise?" button on exercise card
- Dialog showing alternative exercises targeting same muscle groups
- Option to temporarily or permanently substitute

#### 2.4 Soreness/Recovery Tracking
**Benefit:** Injury prevention and recovery monitoring

**Implementation:**
```sql
ALTER TABLE workout_progress
ADD COLUMN soreness_level integer CHECK (soreness_level BETWEEN 1 AND 5),
ADD COLUMN energy_level integer CHECK (energy_level BETWEEN 1 AND 5),
ADD COLUMN pain_reported boolean DEFAULT false,
ADD COLUMN pain_location text;
```

**UI Changes:**
- Add "How do you feel?" section to LogWorkoutDialog
- Soreness: 1 (no soreness) to 5 (very sore)
- Energy: 1 (exhausted) to 5 (energized)
- "Report Pain" checkbox with location input

### Priority 3: High Impact, High Complexity

#### 3.1 Adaptive Plan Difficulty
**Benefit:** Automatic plan adjustment based on performance

**Implementation:**
- Analyze last 4 weeks of ratings, completion rates, and progressive overload
- If consistently rating 1-2 (too hard), reduce intensity
- If consistently rating 4-5 (too easy), increase intensity
- Suggest plan adjustments to trainer

**Requires:**
- Machine learning model or rule-based algorithm
- Trainer approval workflow
- Plan versioning system

#### 3.2 Predictive Rest Day Recommendations
**Benefit:** AI-driven recovery optimization

**Implementation:**
- Track sleep quality (if integrated)
- Track soreness levels over time
- Track consecutive workout days
- Track workout intensity (weight × reps × sets)
- Predict optimal rest days

**Requires:**
- Additional data collection (sleep, nutrition)
- Predictive algorithm
- User consent for data tracking

#### 3.3 Social Features and Accountability
**Benefit:** Community motivation

**Implementation:**
- Workout buddies/partners
- Shared goals and challenges
- Leaderboards (weekly completion %, streaks)
- Social feed of workout completions
- Encouragement/reactions system

**Requires:**
- Social data model
- Privacy controls
- Notification system
- Moderation tools

---

## Immediate Recommendations (Next Sprint)

### 1. Implement Streak Tracking ⭐
- **Effort:** 4 hours
- **Impact:** High
- **Files to modify:**
  - Database migration: Add streak columns to profiles
  - Update upsert_workout_progress function
  - Update WorkoutPlan.tsx to display streak

### 2. Implement PR Detection and Notification ⭐
- **Effort:** 6 hours
- **Impact:** High
- **Files to modify:**
  - Create check_for_pr function
  - Modify upsert_workout_progress to return PR status
  - Update LogWorkoutDialog.tsx to show PR toast
  - Add PR badge to exercise cards

### 3. Add Weekly Adherence Percentage ⭐
- **Effort:** 3 hours
- **Impact:** Medium
- **Files to modify:**
  - Create get_overall_plan_adherence function
  - Update WorkoutPlan.tsx header to display adherence
  - Color code based on percentage

### 4. Implement Soreness/Recovery Tracking
- **Effort:** 5 hours
- **Impact:** Medium-High
- **Files to modify:**
  - Add columns to workout_progress
  - Update LogWorkoutDialog.tsx form
  - Update upsert_workout_progress parameters
  - Add recovery insights to dashboard

### 5. Add Rest Day Warning
- **Effort:** 2 hours
- **Impact:** Medium
- **Files to modify:**
  - Add getConsecutiveDaysWorked function
  - Display warning toast in WorkoutPlan.tsx

---

## Test Cases to Add

Based on proposed enhancements:

### TC-WORKOUT-029: Streak Tracking
- Verify streak increments on consecutive day completions
- Verify streak resets after missed day
- Verify longest streak is preserved

### TC-WORKOUT-030: PR Detection - Weight PR
- Log workout with higher weight than previous max
- Verify PR notification appears
- Verify PR badge displays on exercise

### TC-WORKOUT-031: PR Detection - Volume PR
- Log workout with higher total volume (sets × reps × weight)
- Verify volume PR notification

### TC-WORKOUT-032: Overall Adherence Display
- Complete 15 out of 20 planned workouts (75%)
- Verify adherence percentage displays correctly
- Verify color coding (yellow for 75%)

### TC-WORKOUT-033: Rest Day Warning
- Complete workouts 6 days in a row
- On 7th day, verify warning toast appears

### TC-WORKOUT-034: Soreness Tracking
- Log workout with soreness level
- Verify data saves correctly
- View history with soreness indicators

### TC-WORKOUT-035: Progressive Overload Alert
- Complete same exercise 3 times with same weight
- Verify recommendation to increase weight

---

## Metrics to Track Post-Implementation

1. **Engagement Metrics:**
   - Average streak length
   - Percentage of users with 7+ day streak
   - Workout completion rate (before vs after streak feature)

2. **Performance Metrics:**
   - Percentage of users achieving PRs weekly
   - Average time to PR (weeks)
   - Progressive overload adherence rate

3. **Health Metrics:**
   - Average soreness levels
   - Correlation between soreness and rest days
   - Injury report frequency

4. **Plan Adherence:**
   - Overall adherence percentage distribution
   - Dropout rate at different adherence thresholds
   - Week-by-week retention

---

## Conclusion

The current workout logging system has solid foundational business rules covering:
- ✅ Duplicate prevention (one log per exercise per day)
- ✅ Week-based progress tracking
- ✅ Past day logging prevention
- ✅ Weight format flexibility
- ✅ Basic PR tracking infrastructure
- ✅ Historical data retention

**Key Gaps:**
- ❌ No streak tracking or gamification
- ❌ No progressive overload monitoring
- ❌ No overtraining prevention
- ❌ No recovery/soreness tracking
- ❌ Limited motivational features

**Recommended Priority Order:**
1. Streak Tracking (high impact, low complexity)
2. PR Detection & Notification (high impact, low complexity)
3. Weekly Adherence Display (medium impact, low complexity)
4. Soreness/Recovery Tracking (medium-high impact, medium complexity)
5. Progressive Overload Alerts (high impact, medium complexity)

Implementing the Priority 1 recommendations would significantly enhance user engagement and motivation while building on the existing robust foundation.
