# Waitlist System Test Cases

## Overview
Test cases for waitlist functionality, joining/leaving waitlist, and automatic notifications when spots become available.

---

## TC-WAITLIST-001: Join Waitlist - Class Full
**Priority:** High
**Type:** Functional

### Preconditions
- User is logged in as member
- Class is at full capacity (20/20)
- User has NOT already booked this class
- User is NOT on waitlist for this class

### Test Steps
1. View available classes
2. Find a full class
3. Click "Join Waitlist" button
4. Confirm in dialog (if prompted)

### Expected Results
- Waitlist entry created in database
- Success toast: "Added to waitlist successfully!"
- Button changes to "Leave Waitlist"
- User's waitlist position shown (e.g., "Position: 3")
- Entry timestamped correctly

---

## TC-WAITLIST-002: Join Waitlist - Already on Waitlist
**Priority:** High
**Type:** Negative

### Preconditions
- User already on waitlist for this class

### Test Steps
1. Try to join waitlist again
2. Click "Join Waitlist" button

### Expected Results
- Error message appears
- Toast: "You are already on the waitlist for this class"
- No duplicate waitlist entry created
- Button shows "Leave Waitlist"

---

## TC-WAITLIST-003: Join Waitlist - Already Booked
**Priority:** High
**Type:** Negative

### Preconditions
- User has confirmed booking for this class

### Test Steps
1. View class user has booked
2. Look for waitlist button

### Expected Results
- No "Join Waitlist" button visible
- Booking shows in "Upcoming Classes"
- Cannot join waitlist for class you're booked in

---

## TC-WAITLIST-004: Leave Waitlist
**Priority:** High
**Type:** Functional

### Preconditions
- User is on waitlist for a class

### Test Steps
1. View class card
2. Click "Leave Waitlist" button
3. Confirm (if prompted)

### Expected Results
- Waitlist entry removed
- Success toast: "Removed from waitlist"
- Button changes to "Join Waitlist"
- Waitlist count decreases
- Other users' positions update

---

## TC-WAITLIST-005: Waitlist Position Display
**Priority:** Medium
**Type:** UI/UX

### Preconditions
- User is on waitlist
- User is 5th in line

### Test Steps
1. View class card where user is waitlisted
2. Observe position display

### Expected Results
- Shows "Waitlist Position: 5"
- Position updates when someone ahead leaves
- Accurate count
- Clear visual indicator

---

## TC-WAITLIST-006: Automatic Notification - Spot Available
**Priority:** High
**Type:** Functional

### Preconditions
- Class is full
- User A is 1st on waitlist
- User B cancels their booking

### Test Steps
1. User B cancels booking
2. Check User A's notifications

### Expected Results
- Spot becomes available
- Edge function processes waitlist
- User A receives notification
- Notification says: "A spot is now available for [Class Name]"
- Includes class details (day, time)
- Notification created in database
- User A can now book the class

---

## TC-WAITLIST-007: Waitlist Processing Order
**Priority:** High
**Type:** Functional

### Preconditions
- Waitlist has 3 users: A (1st), B (2nd), C (3rd)
- One spot becomes available

### Test Steps
1. Spot opens up
2. Check who gets notified

### Expected Results
- ONLY User A (1st position) gets notified
- Users B and C do NOT get notified
- User A's position: "1st" shown
- Notification sent to correct user
- Order maintained by created_at timestamp

---

## TC-WAITLIST-008: Multiple Spots Available
**Priority:** Medium
**Type:** Functional

### Preconditions
- Waitlist has 5 users
- 2 bookings cancelled (2 spots open)

### Test Steps
1. Two users cancel
2. Check notifications

### Expected Results
- Top 2 waitlisted users get notified
- Each gets their own notification
- Remaining 3 users not notified
- Waitlist count accurate

---

## TC-WAITLIST-009: Waitlist When Class Not Full
**Priority:** Medium
**Type:** Negative

### Preconditions
- Class has available spots (15/20)

### Test Steps
1. View class with spots available
2. Look for waitlist button

### Expected Results
- NO "Join Waitlist" button visible
- Only "Book Now" button shown
- Cannot join waitlist if spots available
- User should book directly instead

---

## TC-WAITLIST-010: Waitlist Count Display
**Priority:** Medium
**Type:** UI/UX

### Preconditions
- Class is full
- 7 people on waitlist

### Test Steps
1. View full class card
2. Check waitlist count display

### Expected Results
- Shows "Waitlist: 7 people"
- Accurate count
- Updates in real-time
- Color-coded (yellow/orange indicator)

---

## TC-WAITLIST-011: Leave Waitlist - Not on Waitlist
**Priority:** Low
**Type:** Negative

### Test Steps
1. View class user is NOT waitlisted for
2. Try to leave waitlist

### Expected Results
- "Leave Waitlist" button not visible
- OR button is disabled
- No error if button doesn't exist
- Clear UI state

---

## TC-WAITLIST-012: Waitlist Entry Timestamp
**Priority:** Low
**Type:** Data

### Test Steps
1. Join waitlist
2. Check database entry

### Expected Results
- Entry has `created_at` timestamp
- Timestamp accurate
- Used for position ordering
- Timezone correct

---

## TC-WAITLIST-013: Waitlist Status Change
**Priority:** Medium
**Type:** Functional

### Preconditions
- User is on waitlist

### Test Steps
1. User gets notified of available spot
2. User books the class
3. Check waitlist entry

### Expected Results
- Waitlist entry status changes to "converted" or removed
- No longer counted in waitlist
- Position freed for next person
- Booking created successfully

---

## TC-WAITLIST-014: Waitlist Notification Content
**Priority:** High
**Type:** Functional

### Test Steps
1. User receives waitlist notification
2. Read notification content

### Expected Results
Notification includes:
- ✓ "A spot is now available!"
- ✓ Class name
- ✓ Day of week
- ✓ Start time
- ✓ End time
- ✓ Action button: "Book Now" (if applicable)
- ✓ Clear, friendly message

---

## TC-WAITLIST-015: Waitlist Button Visual States
**Priority:** Medium
**Type:** UI/UX

### Test Steps
1. View class in different waitlist states

### Expected Results

**Not on Waitlist (Class Full):**
- Button: "Join Waitlist"
- Color: Primary or yellow
- Enabled

**On Waitlist:**
- Button: "Leave Waitlist"
- Color: Gray or secondary
- Shows position: "Position: 3"
- Enabled

**Class Not Full:**
- No waitlist button
- Only "Book Now" button

---

## TC-WAITLIST-016: Waitlist Dialog (If Implemented)
**Priority:** Low
**Type:** UI/UX

### Test Steps
1. Click "Join Waitlist"
2. Observe dialog (if exists)

### Expected Results
- Dialog explains waitlist
- Shows estimated wait time or position
- "Confirm" and "Cancel" buttons
- Clear explanation of notification process

---

## TC-WAITLIST-017: Waitlist Across Multiple Classes
**Priority:** Medium
**Type:** Functional

### Test Steps
1. Join waitlist for Class A
2. Join waitlist for Class B
3. Join waitlist for Class C
4. View all waitlist positions

### Expected Results
- Can be on multiple waitlists
- Each tracked separately
- Each shows own position
- No conflicts
- All display correctly

---

## TC-WAITLIST-018: Waitlist Expiration (If Implemented)
**Priority:** Low
**Type:** Functional

### Preconditions
- Waitlist entries expire after X hours of notification

### Test Steps
1. Receive notification of available spot
2. Don't book within X hours
3. Check waitlist status

### Expected Results
- Entry expires or removed
- Next person gets notified
- User no longer has priority
- Can rejoin waitlist if desired

---

## TC-WAITLIST-019: Edge Function - Process Waitlist Success
**Priority:** High
**Type:** Backend

### Test Steps
1. Trigger waitlist processing (booking cancellation)
2. Check edge function execution

### Expected Results
- Function called successfully
- Correct schedule_id passed
- Class details passed correctly
- Returns notified count
- No errors in logs
- Function completes < 5 seconds

---

## TC-WAITLIST-020: Edge Function - Process Waitlist Failure
**Priority:** Medium
**Type:** Error Handling

### Test Steps
1. Simulate edge function error
2. Cancel booking to trigger waitlist
3. Check error handling

### Expected Results
- Booking still cancelled
- Error logged (not shown to user)
- User gets success message for cancellation
- Waitlist error doesn't block cancellation
- Graceful degradation

---

## TC-WAITLIST-021: Waitlist Notification Persistence
**Priority:** Medium
**Type:** Functional

### Test Steps
1. Receive waitlist notification
2. Logout
3. Login again
4. Check notifications

### Expected Results
- Notification persists
- Still visible after logout/login
- Can be read later
- Marked as read when clicked
- Doesn't disappear

---

## TC-WAITLIST-022: Multiple Users Cancel Simultaneously
**Priority:** Medium
**Type:** Concurrency

### Preconditions
- Class full
- 5 people on waitlist
- 3 bookings cancelled at same time

### Test Steps
1. Simulate 3 concurrent cancellations
2. Check waitlist processing

### Expected Results
- Top 3 waitlisted users notified
- Each gets one notification
- No duplicate notifications
- Order maintained correctly
- No race conditions

---

## TC-WAITLIST-023: Waitlist for Recurring Class
**Priority:** Medium
**Type:** Functional

### Preconditions
- Class happens every Monday
- Monday class is full

### Test Steps
1. Join waitlist for Monday class
2. Spot opens Monday week 1
3. Check if affects other Mondays

### Expected Results
- Waitlist is per schedule instance
- Joining for one Monday ≠ joining for all Mondays
- Each week is separate
- Notifications specific to date

---

## TC-WAITLIST-024: View All My Waitlists
**Priority:** Low
**Type:** Functional

### Test Steps
1. Join multiple waitlists
2. Look for waitlist overview section

### Expected Results
- Can view all waitlisted classes in one place
- Shows position for each
- Can leave waitlist from overview
- Sorted by class date/time

---

## TC-WAITLIST-025: Mobile - Waitlist Button
**Priority:** High
**Type:** Mobile

### Test Steps
1. View full class on mobile
2. Click "Join Waitlist"
3. View position

### Expected Results
- Button minimum 44px height
- Easy to tap
- Position clearly visible
- Dialog (if any) mobile-optimized
- No horizontal scroll

---

## TC-WAITLIST-026: Waitlist Database Schema
**Priority:** High
**Type:** Data Integrity

### Test Steps
1. Check waitlist table structure

### Expected Results
Table includes:
- `id` (unique)
- `user_id` (references member)
- `schedule_id` (references schedule)
- `created_at` (for ordering)
- `status` (active/notified/converted)
- Unique constraint on (user_id, schedule_id)

---

## TC-WAITLIST-027: Waitlist Analytics (Admin)
**Priority:** Low
**Type:** Admin Feature

### Test Steps
1. Login as admin
2. View analytics or reports
3. Check waitlist metrics

### Expected Results
- Can see total waitlist count
- Popular classes (most waitlisted)
- Conversion rate (waitlist → booking)
- Helps plan capacity

---

## TC-WAITLIST-028: Leave Waitlist - Confirmation
**Priority:** Low
**Type:** UI/UX

### Test Steps
1. Click "Leave Waitlist"
2. Check for confirmation

### Expected Results
- May show confirmation dialog
- OR removes immediately (acceptable)
- If confirmation: "Are you sure?"
- Clear action feedback

---

## Test Summary

| Category | Total Tests | Priority High | Priority Medium | Priority Low |
|----------|-------------|---------------|-----------------|--------------|
| Waitlist System | 28 | 9 | 11 | 8 |

---

## Test Data Setup

```sql
-- Create waitlist table (if not exists)
CREATE TABLE IF NOT EXISTS waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  schedule_id uuid REFERENCES schedule(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  status text DEFAULT 'active',
  UNIQUE(user_id, schedule_id)
);

-- Add test users to waitlist
INSERT INTO waitlist (user_id, schedule_id, status)
VALUES
  ('user_a_id', 'full_class_schedule_id', 'active'),
  ('user_b_id', 'full_class_schedule_id', 'active'),
  ('user_c_id', 'full_class_schedule_id', 'active');

-- Query waitlist position
SELECT
  user_id,
  ROW_NUMBER() OVER (ORDER BY created_at) as position
FROM waitlist
WHERE schedule_id = 'schedule_id'
  AND status = 'active';
```

---

## Edge Function Code (Reference)

```typescript
// Process Waitlist Edge Function
// Triggers when booking cancelled

async function processWaitlist(scheduleId, classDetails) {
  // 1. Get first person on waitlist
  const { data: waitlisted } = await supabase
    .from('waitlist')
    .select('user_id, id')
    .eq('schedule_id', scheduleId)
    .eq('status', 'active')
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  if (!waitlisted) return { notified_count: 0 };

  // 2. Create notification
  await supabase.from('notifications').insert({
    user_id: waitlisted.user_id,
    type: 'waitlist',
    title: 'Spot Available!',
    message: `A spot is now available for ${classDetails.class_name}`,
    related_id: scheduleId,
  });

  // 3. Update waitlist status
  await supabase
    .from('waitlist')
    .update({ status: 'notified' })
    .eq('id', waitlisted.id);

  return { notified_count: 1 };
}
```

---

## Notes for Tester

### Critical Scenarios
1. Can join waitlist when class full
2. Cannot join if already on waitlist
3. First person gets notified when spot opens
4. Notification includes class details
5. Position ordering is accurate

### Common Issues
- Duplicate waitlist entries
- Wrong person notified
- Notifications not sent
- Position calculation wrong
- Concurrent access issues

### Performance
- Waitlist processing < 3 seconds
- Notification created immediately
- Button updates in real-time

### Edge Cases
- Empty waitlist (no one to notify)
- Multiple cancellations at once
- User books before notification expires
- User leaves waitlist just before notification
