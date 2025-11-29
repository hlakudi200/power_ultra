# Personal Training System - Implementation Guide

## Overview

The Personal Training System allows gym members to be assigned to personal trainers who can create custom workout plans, track progress, and provide personalized coaching.

**Estimated Time:** 5-7 days
**Priority:** High (Phase 3, Feature 2)

---

## System Architecture

### Key Concepts

1. **Trainers** - Extension of existing instructors (class instructors can also be personal trainers)
2. **Assignments** - One member can have one active trainer at a time
3. **Workout Plans** - Trainers create custom plans for their clients
4. **Progress Tracking** - Members log workout completion, trainers review progress
5. **Capacity Management** - Trainers have max client limits

### User Roles

- **Members** - Get assigned trainers, follow workout plans, track progress
- **Trainers** - Manage clients, create workout plans, track client progress
- **Admins** - Assign members to trainers, manage trainer roster

---

## Database Schema

### 1. Extend Instructors Table

Add trainer-specific fields to existing `instructors` table:

```sql
ALTER TABLE public.instructors
ADD COLUMN IF NOT EXISTS is_personal_trainer boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS specializations text[],
ADD COLUMN IF NOT EXISTS certifications text[],
ADD COLUMN IF NOT EXISTS max_clients integer DEFAULT 15,
ADD COLUMN IF NOT EXISTS hourly_rate numeric(10,2),
ADD COLUMN IF NOT EXISTS bio text,
ADD COLUMN IF NOT EXISTS years_experience integer;
```

**Why extend instructors?**
- Many class instructors also do personal training
- Avoids duplicate data (name, photo, contact info)
- `is_personal_trainer` flag differentiates them

### 2. Trainer Assignments Table

```sql
CREATE TABLE public.trainer_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trainer_id uuid NOT NULL REFERENCES public.instructors(id) ON DELETE CASCADE,
  assigned_at timestamp with time zone DEFAULT now(),
  assigned_by uuid REFERENCES public.profiles(id), -- Admin who made assignment
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  start_date date,
  end_date date,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),

  -- Ensure member can only have ONE active trainer
  CONSTRAINT unique_active_assignment UNIQUE (member_id) WHERE (status = 'active')
);

CREATE INDEX idx_trainer_assignments_member ON trainer_assignments(member_id);
CREATE INDEX idx_trainer_assignments_trainer ON trainer_assignments(trainer_id);
CREATE INDEX idx_trainer_assignments_status ON trainer_assignments(status);
```

### 3. Workout Plans Table

```sql
CREATE TABLE public.workout_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.trainer_assignments(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  goals text, -- "Build strength", "Lose weight", etc.
  duration_weeks integer DEFAULT 4,
  created_by uuid NOT NULL REFERENCES public.instructors(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),

  -- One active plan per assignment
  CONSTRAINT unique_active_plan UNIQUE (assignment_id) WHERE (status = 'active')
);

CREATE INDEX idx_workout_plans_assignment ON workout_plans(assignment_id);
CREATE INDEX idx_workout_plans_trainer ON workout_plans(created_by);
```

### 4. Workout Exercises Table

```sql
CREATE TABLE public.workout_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.workout_plans(id) ON DELETE CASCADE,
  day_of_week text NOT NULL CHECK (day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
  exercise_name text NOT NULL,
  exercise_type text, -- 'strength', 'cardio', 'flexibility'
  sets integer,
  reps text, -- "8-12", "10", "AMRAP"
  weight text, -- "60% of max", "135 lbs", "bodyweight"
  rest_seconds integer DEFAULT 60,
  notes text,
  order_index integer DEFAULT 0, -- Order within the day
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_workout_exercises_plan ON workout_exercises(plan_id);
CREATE INDEX idx_workout_exercises_day ON workout_exercises(plan_id, day_of_week);
```

### 5. Workout Progress Table

```sql
CREATE TABLE public.workout_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id uuid NOT NULL REFERENCES public.workout_exercises(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  completed_at timestamp with time zone DEFAULT now(),
  sets_completed integer,
  reps_completed integer,
  weight_used numeric(10,2),
  duration_minutes integer, -- For cardio
  notes text,
  rating integer CHECK (rating >= 1 AND rating <= 5), -- How hard was it?

  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_workout_progress_member ON workout_progress(member_id);
CREATE INDEX idx_workout_progress_exercise ON workout_progress(exercise_id);
CREATE INDEX idx_workout_progress_date ON workout_progress(completed_at);
```

### 6. Trainer Notes Table

```sql
CREATE TABLE public.trainer_client_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.trainer_assignments(id) ON DELETE CASCADE,
  trainer_id uuid NOT NULL REFERENCES public.instructors(id),
  note text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  is_private boolean DEFAULT true, -- Private to trainer or visible to client

  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_trainer_notes_assignment ON trainer_client_notes(assignment_id);
CREATE INDEX idx_trainer_notes_trainer ON trainer_client_notes(trainer_id);
```

---

## RLS (Row Level Security) Policies

### Trainer Assignments

```sql
ALTER TABLE trainer_assignments ENABLE ROW LEVEL SECURITY;

-- Members can view their own assignments
CREATE POLICY "Members view own assignments"
  ON trainer_assignments FOR SELECT
  USING (auth.uid() = member_id);

-- Trainers can view assignments where they are the trainer
CREATE POLICY "Trainers view their assignments"
  ON trainer_assignments FOR SELECT
  USING (
    trainer_id IN (
      SELECT id FROM instructors WHERE user_id = auth.uid()
    )
  );

-- Admins can manage all assignments
CREATE POLICY "Admins manage all assignments"
  ON trainer_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );
```

### Workout Plans

```sql
ALTER TABLE workout_plans ENABLE ROW LEVEL SECURITY;

-- Members can view plans for their assignments
CREATE POLICY "Members view own plans"
  ON workout_plans FOR SELECT
  USING (
    assignment_id IN (
      SELECT id FROM trainer_assignments WHERE member_id = auth.uid()
    )
  );

-- Trainers can manage plans for their clients
CREATE POLICY "Trainers manage client plans"
  ON workout_plans FOR ALL
  USING (
    assignment_id IN (
      SELECT ta.id FROM trainer_assignments ta
      JOIN instructors i ON ta.trainer_id = i.id
      WHERE i.user_id = auth.uid()
    )
  );

-- Admins see all
CREATE POLICY "Admins manage all plans"
  ON workout_plans FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
    )
  );
```

### Workout Exercises

```sql
ALTER TABLE workout_exercises ENABLE ROW LEVEL SECURITY;

-- Members can view exercises in their plans
CREATE POLICY "Members view own exercises"
  ON workout_exercises FOR SELECT
  USING (
    plan_id IN (
      SELECT wp.id FROM workout_plans wp
      JOIN trainer_assignments ta ON wp.assignment_id = ta.id
      WHERE ta.member_id = auth.uid()
    )
  );

-- Trainers can manage exercises in their plans
CREATE POLICY "Trainers manage client exercises"
  ON workout_exercises FOR ALL
  USING (
    plan_id IN (
      SELECT wp.id FROM workout_plans wp
      JOIN trainer_assignments ta ON wp.assignment_id = ta.id
      JOIN instructors i ON ta.trainer_id = i.id
      WHERE i.user_id = auth.uid()
    )
  );
```

### Workout Progress

```sql
ALTER TABLE workout_progress ENABLE ROW LEVEL SECURITY;

-- Members can manage their own progress
CREATE POLICY "Members manage own progress"
  ON workout_progress FOR ALL
  USING (auth.uid() = member_id);

-- Trainers can view client progress
CREATE POLICY "Trainers view client progress"
  ON workout_progress FOR SELECT
  USING (
    member_id IN (
      SELECT ta.member_id FROM trainer_assignments ta
      JOIN instructors i ON ta.trainer_id = i.id
      WHERE i.user_id = auth.uid() AND ta.status = 'active'
    )
  );

-- Admins see all
CREATE POLICY "Admins view all progress"
  ON workout_progress FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
    )
  );
```

### Trainer Notes

```sql
ALTER TABLE trainer_client_notes ENABLE ROW LEVEL SECURITY;

-- Trainers can manage their own notes
CREATE POLICY "Trainers manage own notes"
  ON trainer_client_notes FOR ALL
  USING (
    trainer_id IN (
      SELECT id FROM instructors WHERE user_id = auth.uid()
    )
  );

-- Members can view non-private notes about them
CREATE POLICY "Members view shared notes"
  ON trainer_client_notes FOR SELECT
  USING (
    is_private = false
    AND assignment_id IN (
      SELECT id FROM trainer_assignments WHERE member_id = auth.uid()
    )
  );

-- Admins see all
CREATE POLICY "Admins view all notes"
  ON trainer_client_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
    )
  );
```

---

## Helper Functions

### 1. Get Trainer's Client Count

```sql
CREATE OR REPLACE FUNCTION get_trainer_client_count(p_trainer_id uuid)
RETURNS integer AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM trainer_assignments
    WHERE trainer_id = p_trainer_id
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql STABLE;
```

### 2. Check if Trainer is at Capacity

```sql
CREATE OR REPLACE FUNCTION is_trainer_at_capacity(p_trainer_id uuid)
RETURNS boolean AS $$
DECLARE
  current_count integer;
  max_count integer;
BEGIN
  SELECT max_clients INTO max_count
  FROM instructors
  WHERE id = p_trainer_id;

  SELECT COUNT(*) INTO current_count
  FROM trainer_assignments
  WHERE trainer_id = p_trainer_id
    AND status = 'active';

  RETURN current_count >= max_count;
END;
$$ LANGUAGE plpgsql STABLE;
```

### 3. Get Member's Active Trainer

```sql
CREATE OR REPLACE FUNCTION get_member_active_trainer(p_member_id uuid)
RETURNS TABLE (
  assignment_id uuid,
  trainer_id uuid,
  trainer_name text,
  assigned_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ta.id,
    ta.trainer_id,
    i.name,
    ta.assigned_at
  FROM trainer_assignments ta
  JOIN instructors i ON ta.trainer_id = i.id
  WHERE ta.member_id = p_member_id
    AND ta.status = 'active'
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;
```

### 4. Get Workout Completion Stats

```sql
CREATE OR REPLACE FUNCTION get_workout_completion_stats(
  p_member_id uuid,
  p_plan_id uuid
)
RETURNS TABLE (
  total_exercises integer,
  completed_exercises integer,
  completion_percentage numeric
) AS $$
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
  FROM workout_exercises we
  LEFT JOIN workout_progress wp ON we.id = wp.exercise_id AND wp.member_id = p_member_id
  WHERE we.plan_id = p_plan_id;
END;
$$ LANGUAGE plpgsql STABLE;
```

---

## Implementation Steps

### Day 1: Database Setup

**Tasks:**
- [ ] Create `create_personal_training_system.sql` migration file
- [ ] Add columns to `instructors` table
- [ ] Create all 5 new tables
- [ ] Create indexes
- [ ] Add RLS policies
- [ ] Create helper functions
- [ ] Test migration on staging
- [ ] Run migration on production

**Deliverable:** Complete database schema with RLS

### Day 2: Backend Functions & Validation

**Tasks:**
- [ ] Create trigger to prevent trainer over-capacity
- [ ] Add validation for assignment creation
- [ ] Create function to auto-complete old plans
- [ ] Add notification when assigned to trainer
- [ ] Test all helper functions
- [ ] Add comments to all functions

**Deliverable:** Validated database layer

### Day 3-4: Frontend Components (Member Side)

**Tasks:**
- [ ] Create `MyTrainer.tsx` component (Dashboard widget)
- [ ] Create `TrainerCard.tsx` component
- [ ] Create `WorkoutPlan.tsx` component
- [ ] Create `ExerciseCard.tsx` component
- [ ] Create `LogWorkout.tsx` dialog
- [ ] Create `ProgressChart.tsx` component
- [ ] Add to member Dashboard
- [ ] Test member workflows

**Deliverable:** Member can view trainer, plans, and log progress

### Day 5: Frontend Components (Trainer Side)

**Tasks:**
- [ ] Create Trainer Dashboard page
- [ ] Create `ClientList.tsx` component
- [ ] Create `ClientDetails.tsx` component
- [ ] Create `CreateWorkoutPlan.tsx` form
- [ ] Create `AddExercise.tsx` form
- [ ] Create `ClientNotes.tsx` component
- [ ] Test trainer workflows

**Deliverable:** Trainers can manage clients and plans

### Day 6: Admin Interface

**Tasks:**
- [ ] Add "Personal Trainers" section to Instructors page
- [ ] Create `AssignTrainer.tsx` dialog
- [ ] Create trainer capacity dashboard
- [ ] Add bulk assignment feature
- [ ] Show trainer-to-member ratios
- [ ] Test admin workflows

**Deliverable:** Admins can assign members to trainers

### Day 7: Testing & Polish

**Tasks:**
- [ ] End-to-end testing
- [ ] Fix bugs
- [ ] Add loading states
- [ ] Add error handling
- [ ] Create documentation
- [ ] Update PHASE_3_PLAN.md

**Deliverable:** Production-ready personal training system

---

## User Flows

### Flow 1: Admin Assigns Member to Trainer

1. Admin goes to Members page
2. Clicks "Assign Trainer" for a member
3. Dialog shows list of trainers (with capacity info)
4. Admin selects trainer
5. System checks capacity
6. Assignment created
7. Member gets notification
8. Trainer sees new client in dashboard

### Flow 2: Trainer Creates Workout Plan

1. Trainer logs in, goes to dashboard
2. Views client list
3. Clicks client name
4. Clicks "Create Workout Plan"
5. Fills in: title, goals, duration
6. Adds exercises day by day
7. For each exercise: name, sets, reps, weight, rest
8. Saves plan
9. Member sees new plan in dashboard

### Flow 3: Member Completes Workout

1. Member logs in, sees workout plan
2. Clicks on today's workout
3. Sees list of exercises
4. For each exercise, clicks "Log"
5. Enters: sets completed, reps, weight used
6. Adds notes (optional)
7. Rates difficulty 1-5
8. Progress saved
9. Trainer can view progress

### Flow 4: Trainer Reviews Progress

1. Trainer views client details
2. Sees progress chart
3. Filters by date range
4. Views individual workout logs
5. Adds notes for client
6. Adjusts future workout plan based on progress

---

## UI Mockups

### Member Dashboard - "My Trainer" Widget

```
┌─────────────────────────────────────┐
│ 👤 My Trainer                       │
├─────────────────────────────────────┤
│  [Photo]  John Smith                │
│           Strength & Conditioning    │
│           NASM-CPT, CSCS            │
│                                     │
│  📊 This Week                       │
│     3/5 workouts completed          │
│                                     │
│  [View Workout Plan] [Message]      │
└─────────────────────────────────────┘
```

### Workout Plan Page

```
┌─────────────────────────────────────┐
│ 🏋️ 12-Week Strength Program        │
│ Created by: John Smith              │
│ Goal: Build overall strength        │
├─────────────────────────────────────┤
│  Mon  Tue  Wed  Thu  Fri  Sat  Sun │
│  [✓]  [ ]  [✓]  [ ]  [✓]  [ ]  [ ] │
├─────────────────────────────────────┤
│ Monday - Upper Body Push            │
│  • Bench Press      4x8   135lbs    │
│  • Overhead Press   3x10  95lbs     │
│  • Tricep Dips      3x12  BW        │
│                                     │
│  [Log Workout]                      │
└─────────────────────────────────────┘
```

### Trainer Dashboard - Client List

```
┌─────────────────────────────────────┐
│ 👥 My Clients (12/15)               │
├─────────────────────────────────────┤
│  Sarah Johnson                      │
│  Last workout: 2 days ago           │
│  Compliance: 85%                    │
│  [View Details]                     │
├─────────────────────────────────────┤
│  Mike Davis                         │
│  Last workout: Today                │
│  Compliance: 100%                   │
│  [View Details]                     │
├─────────────────────────────────────┤
│  [+ Assign New Client]              │
└─────────────────────────────────────┘
```

---

## Next Steps

1. Review this implementation plan
2. Confirm database schema design
3. Begin Day 1: Database setup
4. Create migration SQL file
5. Test on staging environment

**Ready to start?** Let me know if you want to proceed with creating the database migration!

---

**Document Version:** 1.0
**Date:** November 27, 2025
**Status:** Planning Complete - Ready for Implementation
