# Schedule Page Guide

## What You Should See

The Schedule admin page displays your gym's **weekly class schedule** organized by day of the week.

### Page Layout:

```
┌─────────────────────────────────────────────┐
│  SCHEDULE                    [+ Add Schedule]│
│  Manage weekly class schedule                │
├─────────────────────────────────────────────┤
│  ┌──────────────┬──────────────┬───────────┐│
│  │Total Classes │ Busiest Day  │Active Days││
│  │     12       │   Monday     │     5     ││
│  └──────────────┴──────────────┴───────────┘│
├─────────────────────────────────────────────┤
│  Monday                                      │
│  ┌─────────────────────────────────────────┐│
│  │ 06:00  Morning Yoga                     ││
│  │        06:00 - 07:00 • Max 20 participants│
│  │                          [Edit] [Delete] ││
│  │                                          ││
│  │ 18:00  Evening HIIT                     ││
│  │        18:00 - 19:00 • Max 15 participants│
│  │                          [Edit] [Delete] ││
│  └─────────────────────────────────────────┘│
│                                              │
│  Tuesday                                     │
│  No classes scheduled                        │
│                                              │
│  Wednesday                                   │
│  ┌─────────────────────────────────────────┐│
│  │ 09:00  Spin Class                       ││
│  │        09:00 - 10:00 • Max 25 participants│
│  │                          [Edit] [Delete] ││
│  └─────────────────────────────────────────┘│
└─────────────────────────────────────────────┘
```

## Database Schema

From `database_schema.sql`, the schedule table structure is:

```sql
CREATE TABLE public.schedule (
  id uuid PRIMARY KEY,
  class_id uuid NOT NULL,                    -- Links to classes table
  day_of_week text NOT NULL,                 -- "Monday", "Tuesday", etc.
  start_time time NOT NULL,                  -- "09:00:00"
  end_time time NOT NULL,                    -- "10:00:00"
  max_capacity integer DEFAULT 20,           -- Max participants
  is_cancelled boolean DEFAULT false,        -- Can cancel classes
  cancelled_at timestamp,
  cancelled_by uuid,
  cancellation_reason text,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);
```

## What Data is Displayed

For each scheduled class, you see:

1. **Time** - `start_time` (e.g., "09:00")
2. **Class Name** - From `classes` table via `class_id` foreign key
3. **Time Range** - `start_time` to `end_time` (e.g., "09:00 - 10:00")
4. **Capacity** - `max_capacity` from schedule table (e.g., "Max 20 participants")
5. **Actions** - Edit and Delete buttons

## Creating a New Schedule Entry

Click **"+ Add Schedule"** button and fill in:

- **Class**: Select from dropdown (Yoga, HIIT, Spin, etc.)
- **Day of Week**: Monday through Sunday
- **Start Time**: When class starts (HH:MM format)
- **End Time**: When class ends (HH:MM format) - *Optional in current implementation*
- **Max Capacity**: Maximum number of participants - *Uses default from schedule table*

## How It Works

### 1. **Relationship to Classes**
- Schedule entries reference the `classes` table via `class_id`
- You must create classes first (in Classes page) before scheduling them
- Each schedule entry is an instance of a class at a specific time

### 2. **Weekly Recurring Schedule**
- This is a **template schedule** that repeats every week
- Example: "Yoga every Monday at 9am"
- Not for one-time events - this is your regular weekly schedule

### 3. **Display Logic**
```javascript
// Groups schedule items by day
Monday: [
  { class: "Yoga", time: "09:00", capacity: 20 },
  { class: "HIIT", time: "18:00", capacity: 15 }
]
Tuesday: []
Wednesday: [
  { class: "Spin", time: "09:00", capacity: 25 }
]
```

## Current Implementation Status

✅ **Working:**
- Display schedule grouped by day
- Show class name, time, and capacity
- Edit and delete schedule entries
- Statistics (total classes, busiest day, active days)
- Create new schedule entries

⚠️ **Fixed Issues:**
- Days of week now use proper capitalization ("Monday" not "monday")
- Removed references to non-existent `duration_minutes` field
- Updated interface to match actual database schema
- Using `end_time` and `max_capacity` from schedule table

## Example Use Cases

### **Scenario 1: Regular Weekly Schedule**
```
Monday:
  06:00-07:00 Morning Yoga (20 people)
  18:00-19:00 Evening HIIT (15 people)

Wednesday:
  09:00-10:00 Spin Class (25 people)

Friday:
  17:00-18:00 Boxing (12 people)
```

### **Scenario 2: Multiple Classes Same Day**
```
Saturday (Busy Day):
  07:00-08:00 Sunrise Yoga (20 people)
  09:00-10:00 HIIT Training (15 people)
  11:00-12:00 Spin Class (25 people)
  15:00-16:00 Boxing (12 people)
  17:00-18:00 Evening Yoga (20 people)
```

## What to Expect

When you navigate to `/admin/schedule`, you should see:

1. **Empty State** (if no schedule):
   - Each day shows "No classes scheduled"
   - Use "+ Add Schedule" to create your first schedule entry

2. **With Schedule Data**:
   - Days organized Monday-Sunday
   - Classes listed chronologically within each day
   - Clear time slots and capacity info
   - Easy edit/delete actions

## Next Steps

To populate the schedule:
1. Go to **Classes** page first - create your class types (Yoga, HIIT, etc.)
2. Come back to **Schedule** page
3. Click **"+ Add Schedule"**
4. Select a class, day, and time
5. Repeat for all your weekly classes

The schedule you create here will be used:
- To show available classes to members
- For the booking system
- For capacity management
- For instructor assignments (future feature)
