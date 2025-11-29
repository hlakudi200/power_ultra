# Phase 3 Implementation Plan

## Overview

Phase 3 focuses on two major features:
1. **Waitlist System** - For full classes
2. **Personal Training System** - Member-to-trainer assignments

**Note:** Attendance tracking is for scheduled classes only (tracked via class check-in), NOT general gym access (tracked via gym card system).

---

## 🎯 Feature 1: Waitlist System for Full Classes

### User Story
> "As a member, when a class I want is full, I want to join a waitlist so I can automatically get notified if a spot opens up."

### Requirements

#### Member Features:
- ✅ See "Join Waitlist" button when class is full
- ✅ View their position in waitlist (e.g., "You are #3 in line")
- ✅ Receive notification when spot becomes available
- ✅ Time-limited booking window (24 hours to claim spot)
- ✅ Automatically removed from waitlist if they don't book in time
- ✅ Can leave waitlist manually
- ✅ View all their waitlist entries in dashboard

#### Admin Features:
- ✅ View waitlist for each class
- ✅ See member count on waitlist
- ✅ Manually promote member from waitlist to booking
- ✅ Clear/manage waitlist entries
- ✅ Notification when waitlist is processed

### Database Schema

```sql
-- Waitlist table
CREATE TABLE public.waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES public.schedule(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  position integer NOT NULL,
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'notified', 'converted', 'expired', 'cancelled')),
  notified_at timestamp with time zone,
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT unique_waitlist_entry UNIQUE (schedule_id, user_id)
);

-- Indexes for performance
CREATE INDEX idx_waitlist_schedule_id ON public.waitlist(schedule_id);
CREATE INDEX idx_waitlist_user_id ON public.waitlist(user_id);
CREATE INDEX idx_waitlist_status ON public.waitlist(status);
CREATE INDEX idx_waitlist_position ON public.waitlist(schedule_id, position);

-- RLS Policies
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own waitlist entries"
  ON public.waitlist FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own waitlist entries"
  ON public.waitlist FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own waitlist entries"
  ON public.waitlist FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own waitlist entries"
  ON public.waitlist FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all waitlist entries"
  ON public.waitlist FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Function to get next waitlist position
CREATE OR REPLACE FUNCTION get_next_waitlist_position(p_schedule_id uuid)
RETURNS integer AS $$
DECLARE
  next_position integer;
BEGIN
  SELECT COALESCE(MAX(position), 0) + 1
  INTO next_position
  FROM public.waitlist
  WHERE schedule_id = p_schedule_id
    AND status = 'waiting';

  RETURN next_position;
END;
$$ LANGUAGE plpgsql;

-- Function to update waitlist positions when someone leaves
CREATE OR REPLACE FUNCTION update_waitlist_positions()
RETURNS TRIGGER AS $$
BEGIN
  -- When a waitlist entry is deleted or status changed from 'waiting'
  IF (TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND NEW.status != 'waiting' AND OLD.status = 'waiting')) THEN
    UPDATE public.waitlist
    SET position = position - 1,
        updated_at = now()
    WHERE schedule_id = OLD.schedule_id
      AND position > OLD.position
      AND status = 'waiting';
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to maintain waitlist positions
CREATE TRIGGER maintain_waitlist_positions
AFTER DELETE OR UPDATE ON public.waitlist
FOR EACH ROW
EXECUTE FUNCTION update_waitlist_positions();
```

### Edge Function: Process Waitlist

**File:** `supabase/functions/process-waitlist/index.ts`

**Purpose:** Called when a booking is cancelled to notify next person on waitlist

**Logic:**
1. Get the cancelled booking's schedule_id
2. Find first person on waitlist (position = 1, status = 'waiting')
3. Update their status to 'notified'
4. Set expires_at to 24 hours from now
5. Send notification (in-app + email)
6. Return notification count

### UI Components

#### 1. **WaitlistButton.tsx**
- Shows "Join Waitlist" button when class is full
- Shows position and "Leave Waitlist" when already on waitlist
- Handles join/leave actions

#### 2. **WaitlistDialog.tsx**
- Confirmation dialog for joining waitlist
- Shows estimated wait time based on position
- Terms and conditions (24-hour booking window)

#### 3. **WaitlistPanel (Admin)**
- List of all members on waitlist for a class
- Position, member name, join date
- Actions: promote to booking, remove from waitlist

#### 4. **MyWaitlists (Member Dashboard)**
- Card showing all active waitlist entries
- Position, class details, join date
- Action to leave waitlist

### User Flows

#### Flow 1: Member Joins Waitlist
1. Member tries to book a full class
2. Sees "CLASS FULL" with "Join Waitlist" button
3. Clicks "Join Waitlist"
4. Dialog appears: "You'll be #5 in line. You'll have 24 hours to book if a spot opens up."
5. Member confirms
6. Toast: "Added to waitlist! You are #5 in line."
7. Waitlist card appears in dashboard

#### Flow 2: Spot Opens Up
1. Another member cancels their booking
2. Edge function triggers
3. Next person on waitlist (position #1) gets notified
4. Notification: "A spot is available for Yoga on Monday at 9:00 AM! Book within 24 hours."
5. Email sent with booking link
6. Their waitlist status changes to 'notified'
7. If they book within 24 hours: status = 'converted', removed from waitlist
8. If they don't book: status = 'expired', next person gets notified

#### Flow 3: Member Leaves Waitlist
1. Member opens dashboard
2. Sees waitlist card
3. Clicks "Leave Waitlist"
4. Confirmation dialog
5. Removed from waitlist
6. All positions behind them shift up by 1

### Implementation Steps

**Day 1: Database & Backend**
- [ ] Create waitlist table migration
- [ ] Create helper functions (get_next_position, update_positions)
- [ ] Create RLS policies
- [ ] Test database functions

**Day 2: Edge Function**
- [ ] Create process-waitlist edge function
- [ ] Add email template for waitlist notification
- [ ] Test edge function with manual calls
- [ ] Deploy edge function

**Day 3: Frontend Components**
- [ ] Create WaitlistButton component
- [ ] Create WaitlistDialog component
- [ ] Update ClassCard to show waitlist button when full
- [ ] Add waitlist info to member dashboard

**Day 4: Admin Interface**
- [ ] Add waitlist panel to admin schedule page
- [ ] Show waitlist count badge on schedule items
- [ ] Add admin actions (promote, remove)
- [ ] Test admin workflows

**Day 5: Integration & Testing**
- [ ] Integrate edge function with booking cancellation
- [ ] Test complete flow end-to-end
- [ ] Add notification count to admin toast
- [ ] Fix bugs and edge cases
- [ ] Documentation

---

## 🏋️ Feature 2: Personal Training System

### User Story
> "As a member, I want to be assigned to a personal trainer who can create custom workout plans and track my progress."

### Requirements

#### Member Features:
- ✅ View assigned trainer
- ✅ See trainer bio, specializations, certifications
- ✅ Request trainer assignment (if none)
- ✅ View workout plans created by trainer
- ✅ Track workout completion
- ✅ Message trainer (future: chat system)
- ✅ View progress reports from trainer

#### Trainer Features:
- ✅ View list of assigned clients
- ✅ Create custom workout plans for clients
- ✅ Track client progress
- ✅ Add notes per client
- ✅ Schedule 1-on-1 sessions
- ✅ View client attendance history

#### Admin Features:
- ✅ Manage trainer roster (already done in Instructors page)
- ✅ Assign members to trainers
- ✅ View trainer-to-member ratios
- ✅ Reassign members if needed
- ✅ Set trainer capacity limits

### Database Schema

```sql
-- Add trainer role to existing instructors table
ALTER TABLE public.instructors
ADD COLUMN IF NOT EXISTS is_personal_trainer boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS specializations text[],
ADD COLUMN IF NOT EXISTS certifications text[],
ADD COLUMN IF NOT EXISTS max_clients integer DEFAULT 15,
ADD COLUMN IF NOT EXISTS hourly_rate numeric(10,2);

-- Member-Trainer assignments
CREATE TABLE public.trainer_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trainer_id uuid NOT NULL REFERENCES public.instructors(id) ON DELETE CASCADE,
  assigned_at timestamp with time zone DEFAULT now(),
  assigned_by uuid REFERENCES public.profiles(id),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  notes text,
  CONSTRAINT unique_active_assignment UNIQUE (member_id, status)
    WHERE status = 'active'
);

-- Workout plans
CREATE TABLE public.workout_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.trainer_assignments(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  goals text,
  duration_weeks integer,
  created_by uuid NOT NULL REFERENCES public.instructors(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived'))
);

-- Workout plan exercises
CREATE TABLE public.workout_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.workout_plans(id) ON DELETE CASCADE,
  day_of_week text NOT NULL,
  exercise_name text NOT NULL,
  sets integer,
  reps text, -- Can be range like "8-12"
  weight text, -- Can be percentage like "60% of max"
  rest_seconds integer,
  notes text,
  order_index integer DEFAULT 0
);

-- Progress tracking
CREATE TABLE public.workout_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id uuid NOT NULL REFERENCES public.workout_exercises(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  completed_at timestamp with time zone DEFAULT now(),
  sets_completed integer,
  reps_completed integer,
  weight_used numeric(10,2),
  notes text,
  rating integer CHECK (rating >= 1 AND rating <= 5)
);

-- Trainer notes on clients
CREATE TABLE public.trainer_client_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.trainer_assignments(id) ON DELETE CASCADE,
  trainer_id uuid NOT NULL REFERENCES public.instructors(id),
  note text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  is_private boolean DEFAULT true -- Private to trainer or shared with client
);

-- Indexes
CREATE INDEX idx_trainer_assignments_member ON public.trainer_assignments(member_id);
CREATE INDEX idx_trainer_assignments_trainer ON public.trainer_assignments(trainer_id);
CREATE INDEX idx_workout_plans_assignment ON public.workout_plans(assignment_id);
CREATE INDEX idx_workout_exercises_plan ON public.workout_exercises(plan_id);
CREATE INDEX idx_workout_progress_member ON public.workout_progress(member_id);

-- RLS Policies
-- (Similar pattern: users see their own data, trainers see their clients, admins see all)
```

### UI Components

#### 1. **TrainerCard.tsx**
- Display trainer info with photo
- Shows specializations, certifications
- "Request as Trainer" button (if no trainer assigned)

#### 2. **MyTrainer (Member Dashboard)**
- Shows assigned trainer info
- Quick stats (workouts completed, sessions scheduled)
- Action buttons (View Plans, Message Trainer)

#### 3. **MyClients (Trainer View)**
- List of assigned clients
- Client stats (attendance, progress)
- Quick actions (Create Plan, Add Note)

#### 4. **WorkoutPlanBuilder (Trainer)**
- Form to create custom workout plans
- Add exercises with sets/reps/weight
- Organize by day of week
- Save and assign to client

#### 5. **WorkoutPlanView (Member)**
- Display assigned workout plan
- Track completion per exercise
- Log actual sets/reps/weight used
- Add notes and rating

#### 6. **TrainerAssignmentPanel (Admin)**
- Table of all members and their trainers
- Drag-and-drop or dropdown to assign/reassign
- Show trainer capacity (12/15 clients)
- Filter by assigned/unassigned

### User Flows

#### Flow 1: Admin Assigns Trainer to Member
1. Admin goes to Members page
2. Clicks "Assign Trainer" for a member
3. Modal shows list of available trainers
4. Shows capacity: "John Smith (12/15 clients)"
5. Admin selects trainer and confirms
6. Member gets notification: "You've been assigned to trainer John Smith"
7. Member sees trainer card in dashboard

#### Flow 2: Trainer Creates Workout Plan
1. Trainer logs in (trainer accounts are admins with special role)
2. Goes to "My Clients" page
3. Selects a client
4. Clicks "Create Workout Plan"
5. Fills in: title, goals, duration
6. Adds exercises per day (Monday: Bench Press 3x8, Squats 4x10, etc.)
7. Saves plan
8. Client gets notification: "New workout plan available"

#### Flow 3: Member Completes Workout
1. Member opens dashboard
2. Sees "Today's Workout: Upper Body"
3. Clicks to view plan
4. Completes exercises
5. Logs actual performance (did 3x8 at 135lbs)
6. Rates difficulty (4/5)
7. Progress saved
8. Trainer can view progress reports

### Implementation Steps

**Day 1: Database & Schema**
- [ ] Update instructors table with PT fields
- [ ] Create trainer_assignments table
- [ ] Create workout_plans and workout_exercises tables
- [ ] Create progress tracking table
- [ ] Create RLS policies

**Day 2: Admin Interface**
- [ ] Add PT toggle to Instructors page
- [ ] Create trainer assignment interface in Members page
- [ ] Show trainer capacity metrics
- [ ] Test assignment flow

**Day 3: Trainer Features**
- [ ] Create "My Clients" page for trainers
- [ ] Build WorkoutPlanBuilder component
- [ ] Test plan creation and assignment

**Day 4: Member Features**
- [ ] Add "My Trainer" card to member dashboard
- [ ] Create WorkoutPlanView component
- [ ] Implement progress logging
- [ ] Test member workflow

**Day 5: Integration & Polish**
- [ ] Add notifications for assignments
- [ ] Create trainer profile pages
- [ ] Add progress charts/reports
- [ ] Documentation

---

## 📋 Attendance Tracking (Clarification)

### Scope
**Attendance tracking is ONLY for scheduled classes**, not general gym access.

### Why?
- General gym access is tracked via **gym card/RFID system** (external hardware)
- We only track **class attendance** for scheduled group classes

### Features

#### Member Features:
- ✅ Check-in to booked classes
- ✅ View attendance history per class
- ✅ See attendance rate (e.g., "Attended 8/10 booked classes")

#### Instructor Features:
- ✅ View class roster for today
- ✅ Manual check-in for members (if they forgot)
- ✅ See who's absent (no-shows)

#### Admin Features:
- ✅ View attendance reports per class
- ✅ Identify frequent no-shows
- ✅ Class attendance trends

### Database Schema

```sql
-- Class attendance
CREATE TABLE public.class_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  schedule_id uuid NOT NULL REFERENCES public.schedule(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  checked_in_at timestamp with time zone DEFAULT now(),
  checked_in_by uuid REFERENCES public.profiles(id), -- Admin/instructor who checked them in, null if self check-in
  check_in_method text CHECK (check_in_method IN ('self', 'manual', 'qr_code')),
  CONSTRAINT unique_attendance UNIQUE (booking_id)
);

-- Indexes
CREATE INDEX idx_attendance_member ON public.class_attendance(member_id);
CREATE INDEX idx_attendance_schedule ON public.class_attendance(schedule_id);
CREATE INDEX idx_attendance_date ON public.class_attendance(checked_in_at);
```

### Implementation (Simplified)

**Day 1:**
- [ ] Create attendance table
- [ ] Add "Check In" button for booked classes
- [ ] Record attendance when clicked

**Day 2:**
- [ ] Admin view: class roster with check-in status
- [ ] Attendance history per member
- [ ] No-show tracking

---

## 🎯 Phase 3 Summary

### Features to Implement:
1. ✅ **Waitlist System** (5 days)
2. ✅ **Personal Training System** (5 days)
3. ✅ **Class Attendance Tracking** (2 days)

**Total Estimated Time:** 12 days (about 2.5 weeks)

### Priority Order:
1. **Waitlist System** (Most requested by members)
2. **Personal Training System** (Revenue opportunity)
3. **Attendance Tracking** (Analytics and engagement)

---

## 📦 Deliverables

### Documentation:
- [ ] Waitlist system user guide
- [ ] Personal training system guide
- [ ] Attendance tracking guide
- [ ] Database migration files
- [ ] API documentation for edge functions

### Code:
- [ ] Database migrations
- [ ] Edge functions (process-waitlist)
- [ ] UI components (10+ new components)
- [ ] Admin interfaces
- [ ] Member interfaces
- [ ] Trainer interfaces

### Testing:
- [ ] End-to-end test scenarios
- [ ] Edge case handling
- [ ] Performance testing
- [ ] User acceptance testing

---

**Ready to Start?**

Let me know which feature you'd like to tackle first:
1. **Waitlist System** - Immediate member value
2. **Personal Training System** - Revenue generation
3. **Attendance Tracking** - Quick win, simple implementation

---

**Created:** November 27, 2025
**Status:** Planning Complete
**Next Step:** Choose first feature to implement
