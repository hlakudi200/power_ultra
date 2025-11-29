# Instructor Assignment Architecture

## Overview

This document explains how instructor assignments work in the Power Ultra Gym system.

## Data Model

### Tables Involved

1. **`instructors`** - Instructor profiles with full details
   - `id` (uuid) - Primary key
   - `name` (text) - Instructor's full name
   - `email` (text) - Contact email
   - `phone` (text) - Contact phone
   - `bio` (text) - Instructor biography
   - `specialties` (array) - Areas of expertise (e.g., ["Yoga", "HIIT"])
   - `certifications` (array) - Certifications (e.g., ["ACE", "NASM"])
   - `is_active` (boolean) - Whether instructor is currently active

2. **`classes`** - Class types (Yoga, HIIT, Spin, etc.)
   - `id` (uuid) - Primary key
   - `name` (text) - Class type name (e.g., "Yoga")
   - `description` (text) - What the class is about
   - `image_url` (text) - Optional class image
   - **NO instructor fields** - Instructors are NOT assigned at the class type level

3. **`schedule`** - Specific scheduled class instances
   - `id` (uuid) - Primary key
   - `class_id` (uuid) - Links to `classes` table
   - `day_of_week` (text) - Day this class occurs
   - `start_time` (time) - Class start time
   - `end_time` (time) - Class end time
   - `max_capacity` (integer) - Maximum participants
   - **`instructor_id` (uuid)** - Links to `instructors` table
   - `is_cancelled` (boolean) - Whether this specific class is cancelled

## Why This Architecture?

### Problem with Class-Level Assignment
If we assigned instructors to the `classes` table:
- ❌ Every "Yoga" class would have the same instructor
- ❌ Can't have different instructors on different days
- ❌ Can't handle instructor substitutions
- ❌ Can't have multiple Yoga sessions with different instructors

### Solution: Schedule-Level Assignment
By assigning instructors to `schedule` items:
- ✅ Monday 9am Yoga can have Instructor A
- ✅ Wednesday 9am Yoga can have Instructor B
- ✅ Same class type, different instructors based on day/time
- ✅ Flexible scheduling and substitutions
- ✅ Instructor can teach multiple class types

## Example Scenario

**Setup:**
- Class Types: "Yoga", "HIIT", "Spin"
- Instructors: John Smith, Sarah Johnson

**Schedule:**
| Day | Time | Class | Instructor |
|-----|------|-------|------------|
| Monday | 9:00 AM | Yoga | John Smith |
| Monday | 6:00 PM | HIIT | Sarah Johnson |
| Wednesday | 9:00 AM | Yoga | Sarah Johnson |
| Wednesday | 6:00 PM | Spin | John Smith |
| Friday | 9:00 AM | Yoga | John Smith |

Notice:
- "Yoga" appears 3 times with 2 different instructors
- John teaches both Yoga and Spin
- Sarah teaches both Yoga and HIIT

This flexibility is only possible with schedule-level assignment.

## Database Changes Made

### Migration: `remove_instructor_from_classes.sql`

Removed deprecated fields from `classes` table:
- Dropped `instructor` (text) column - was legacy field
- Dropped `instructor_id` (uuid) column - belonged at schedule level

### Migration: `add_instructor_to_schedule.sql`

Added instructor assignment to `schedule` table:
- Added `instructor_id` (uuid) foreign key to `instructors` table
- Added index for query performance
- Set ON DELETE SET NULL (if instructor deleted, schedule item remains but shows no instructor)

## User Interface

### Admin Workflow

1. **Manage Instructors** (`/admin/instructors`)
   - Create instructor profiles
   - Add contact info, bio, specialties, certifications
   - Toggle active/inactive status
   - Only active instructors appear in schedule assignment

2. **Manage Class Types** (`/admin/classes`)
   - Create class types (Yoga, HIIT, etc.)
   - Add description for each class type
   - NO instructor assignment here

3. **Schedule Classes** (`/admin/schedule`)
   - Select a class type (e.g., "Yoga")
   - Choose day and time
   - Set max capacity
   - **Assign instructor** (optional)
   - Can duplicate to multiple days (preserves instructor assignment)

### Member View

When viewing the schedule, members see:
- Class name: "Yoga"
- Time: "9:00 AM - 10:00 AM"
- Instructor: "with John Smith" (if assigned)
- Capacity: "5/20 booked"

## Benefits

1. **Flexibility**: Different instructors for same class type
2. **Scheduling**: Easy to handle substitutions and rotations
3. **Scalability**: Instructors can teach multiple class types
4. **Data Integrity**: Instructor profiles separate from class definitions
5. **Reporting**: Can track which instructor teaches which sessions
6. **Member Experience**: Members see who will teach their specific class

## Code References

- **Instructors Page**: `src/pages/admin/Instructors.tsx` - Manage instructor profiles
- **Classes Page**: `src/pages/admin/Classes.tsx` - Manage class types (no instructors)
- **Schedule Page**: `src/pages/admin/Schedule.tsx` - Assign instructors to schedule items
- **Schedule Interface**: Lines 32-55 - ScheduleItem includes instructor_id and instructors relation
- **Instructor Dropdown**: Lines 830-858 - Instructor selection in schedule form

## Future Enhancements

Possible additions to instructor system:
- Instructor availability calendar
- Automatic conflict detection (instructor teaching two classes at same time)
- Instructor performance analytics
- Member ratings for instructors
- Instructor-specific class capacity limits
