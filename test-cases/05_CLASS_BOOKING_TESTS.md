# Class Booking System Test Cases

## Overview
Test cases for browsing classes, making bookings, managing bookings, and waitlist functionality.

---

## TC-BOOKING-001: View Available Classes
**Priority:** High
**Type:** Functional

### Preconditions
- User is logged in as member
- Classes exist in schedule
- User is on dashboard

### Test Steps
1. Navigate to member dashboard
2. Click "Book New Class" button
3. Observe available classes section

### Expected Results
- "Available Classes" section expands/displays
- Day tabs visible (Monday - Sunday)
- Classes grouped by day of week
- Each class card shows:
  - Class name
  - Instructor name
  - Start time
  - Description
  - Booking count / Max capacity
  - "Book Now" or "Full" button

---

## TC-BOOKING-002: Filter Classes by Day
**Priority:** High
**Type:** Functional

### Test Steps
1. View available classes
2. Click on different day tabs (Mon, Tue, Wed, etc.)
3. Observe class list updates

### Expected Results
- Tab selection changes
- Only classes for selected day display
- Other days' classes hidden
- Smooth transition between tabs
- Empty state shown for days with no classes

---

## TC-BOOKING-003: Book a Class - Success
**Priority:** High
**Type:** Functional

### Preconditions
- User has active membership
- Class has available spots
- User not already booked for this class

### Test Steps
1. View available classes
2. Select a class with available spots
3. Click "Book Now" button
4. Confirm booking in dialog
5. Click "Confirm Booking" button

### Expected Results
- Booking dialog opens
- Shows class details confirmation
- Booking created successfully
- Success toast: "Class booked successfully!"
- Dialog closes
- Class appears in "Upcoming Classes" section
- Booking count increments
- "Book Now" button updates if at capacity

### Test Data
```
Class: Yoga Flow
Day: Monday
Time: 09:00 AM
Capacity: 5/20
```

---

## TC-BOOKING-004: Book a Class - Duplicate Booking
**Priority:** High
**Type:** Negative

### Preconditions
- User already booked this specific class

### Test Steps
1. Try to book same class again
2. Click "Book Now"

### Expected Results
- Error message appears
- Toast: "You have already booked this class"
- Booking not created
- No duplicate booking in database

---

## TC-BOOKING-005: Book a Class - Without Active Membership
**Priority:** High
**Type:** Negative

### Preconditions
- User membership is expired

### Test Steps
1. Login with expired membership
2. Try to access dashboard
3. Attempt to book class

### Expected Results
- Access to dashboard denied
- Redirected to home page
- Error toast: "An active membership is required"
- Cannot book classes

---

## TC-BOOKING-006: View Upcoming Bookings
**Priority:** High
**Type:** Functional

### Preconditions
- User has 1 or more confirmed bookings

### Test Steps
1. Navigate to dashboard
2. View "Upcoming Classes" section

### Expected Results
- All confirmed/pending bookings display
- Each booking shows:
  - Class name
  - Next occurrence date and time
  - Instructor name
  - Day of week
  - Time range
  - Booking date
  - "Cancel" button
- Sorted by next occurrence (soonest first)

---

## TC-BOOKING-007: No Upcoming Bookings
**Priority:** Medium
**Type:** Functional

### Preconditions
- User has NO bookings

### Test Steps
1. Navigate to dashboard
2. View "Upcoming Classes" section

### Expected Results
- Info message displays
- "No Upcoming Bookings" alert
- Message: "You haven't booked any classes yet. Click the 'Book New Class' button..."
- No booking cards shown
- "Book New Class" button visible

---

## TC-BOOKING-008: Cancel a Booking - Success
**Priority:** High
**Type:** Functional

### Preconditions
- User has at least one booking

### Test Steps
1. View upcoming bookings
2. Click "Cancel" button on a booking
3. Confirm cancellation in popup
4. Click "OK" or "Yes"

### Expected Results
- Confirmation dialog appears
- "Are you sure you want to cancel this booking?"
- After confirmation:
  - Booking status changes to "cancelled"
  - Success toast: "Booking Cancelled Successfully"
  - Booking removed from upcoming list
  - Spot becomes available (capacity decreases)
  - Waitlist processed automatically

---

## TC-BOOKING-009: Cancel a Booking - Decline Confirmation
**Priority:** Low
**Type:** Functional

### Test Steps
1. Click "Cancel" on booking
2. Click "Cancel" or "No" in confirmation dialog

### Expected Results
- Confirmation dialog closes
- Booking NOT cancelled
- Booking remains in list
- No changes to database

---

## TC-BOOKING-010: Book Full Class
**Priority:** High
**Type:** Negative

### Preconditions
- Class is at max capacity
- No spots available

### Test Steps
1. View available classes
2. Find class showing "Full" status
3. Observe booking button

### Expected Results
- Class card shows "Full" badge/indicator
- "Book Now" button disabled OR shows "Full"
- Capacity shows "20/20" (max)
- "Join Waitlist" button visible (if implemented)
- Cannot book the class

---

## TC-BOOKING-011: Next Class Occurrence Calculation
**Priority:** High
**Type:** Functional

### Preconditions
- User has booking for recurring class (e.g., every Monday)
- Today is Wednesday

### Test Steps
1. View upcoming bookings
2. Check "Next class" date for Monday class

### Expected Results
- Shows next Monday's date
- Format: "Monday, Nov 27 at 9:00 AM"
- Date is in future
- Correct day of week
- Correct time

### Test Scenarios
```
Today: Wednesday, Nov 22
Class Day: Monday
Expected: Monday, Nov 27

Today: Monday, Nov 20 at 2:00 PM
Class Day: Monday at 9:00 AM (already passed today)
Expected: Monday, Nov 27 (next week)

Today: Monday, Nov 20 at 8:00 AM
Class Day: Monday at 9:00 AM (not yet passed)
Expected: Monday, Nov 20 (today)
```

---

## TC-BOOKING-012: View Class Details
**Priority:** Medium
**Type:** Functional

### Test Steps
1. View available classes
2. Observe class card details

### Expected Results
Each class card displays:
- ✓ Class name
- ✓ Instructor name
- ✓ Start time (formatted as 12-hour AM/PM)
- ✓ Description
- ✓ Booking count / Max capacity
- ✓ Duration (if available)
- ✓ Intensity level (if available)
- ✓ Book button or Full indicator

---

## TC-BOOKING-013: Booking Capacity Visual
**Priority:** Medium
**Type:** UI/UX

### Test Steps
1. View class cards with different capacity levels

### Expected Results

**Class with Many Spots:**
- Capacity: 5/20
- Green indicator or normal state
- "Book Now" button active

**Class Nearly Full:**
- Capacity: 18/20
- Yellow/orange indicator
- "Book Now" still active
- Warning text: "Only 2 spots left!"

**Class Full:**
- Capacity: 20/20
- Red indicator or disabled state
- "Full" button or badge
- "Join Waitlist" button

---

## TC-BOOKING-014: Booking Dialog Display
**Priority:** Medium
**Type:** UI/UX

### Preconditions
- Clicking "Book Now" opens dialog

### Test Steps
1. Click "Book Now" on a class
2. Observe dialog content

### Expected Results
- Dialog opens smoothly
- Shows booking confirmation details:
  - Class name
  - Time
  - Day
  - Instructor
  - "Confirm Booking" button
  - "Cancel" button
- Clean, readable layout
- Mobile-responsive

---

## TC-BOOKING-015: Booking Status Types
**Priority:** Medium
**Type:** Functional

### Test Steps
1. Create bookings
2. Check booking status in database

### Expected Results
Booking status can be:
- **"confirmed"** - Booking is active
- **"pending"** - Awaiting confirmation
- **"cancelled"** - User cancelled
- **"completed"** - Class already happened

Only "confirmed" and "pending" show in upcoming bookings.

---

## TC-BOOKING-016: Waitlist Processing After Cancellation
**Priority:** High
**Type:** Functional

### Preconditions
- Class is full (20/20)
- 3 people on waitlist
- User A has confirmed booking

### Test Steps
1. User A cancels their booking
2. Check waitlist processing

### Expected Results
- User A's booking cancelled
- Spot becomes available (19/20)
- First person on waitlist gets notification
- Notification sent via edge function
- Waitlist count decreases by 1

---

## TC-BOOKING-017: View Booking History
**Priority:** Low
**Type:** Functional

### Test Steps
1. Navigate to dashboard
2. Look for booking history section (if exists)

### Expected Results
- Can view past bookings
- Shows completed classes
- Shows cancelled bookings
- Sorted by date (recent first)

---

## TC-BOOKING-018: Multiple Bookings Same Day
**Priority:** Medium
**Type:** Functional

### Test Steps
1. Book class at 9:00 AM Monday
2. Book different class at 6:00 PM Monday
3. View upcoming bookings

### Expected Results
- Both bookings created successfully
- Both show in upcoming list
- No conflicts
- Each shows correct time
- No error about duplicate

---

## TC-BOOKING-019: Book Class - Loading State
**Priority:** Low
**Type:** UI/UX

### Test Steps
1. Click "Book Now"
2. Observe dialog while processing

### Expected Results
- Loading indicator appears
- Button shows spinner or "Booking..."
- Button disabled during processing
- User cannot click multiple times
- No duplicate bookings created

---

## TC-BOOKING-020: Cancel Booking - Error Handling
**Priority:** Medium
**Type:** Error Handling

### Test Steps
1. Simulate network error
2. Try to cancel booking

### Expected Results
- Error handled gracefully
- Error toast: "Cancellation Failed"
- Helpful error message
- Booking NOT cancelled in database
- User can retry

---

## TC-BOOKING-021: Refresh Bookings List
**Priority:** Medium
**Type:** Functional

### Test Steps
1. Have bookings list open
2. Make a new booking
3. Observe bookings list updates

### Expected Results
- New booking appears immediately
- No page refresh needed
- List updates automatically
- Sorted correctly

---

## TC-BOOKING-022: Booking Count Accuracy
**Priority:** High
**Type:** Data Integrity

### Test Steps
1. View class showing "10/20"
2. Book the class
3. Check capacity again

### Expected Results
- Capacity updates to "11/20"
- Accurate count
- Real-time or quick update
- Matches database count

---

## TC-BOOKING-023: Book Class - Form Validation
**Priority:** Low
**Type:** Validation

### Test Steps
1. Open booking dialog
2. Try to submit without required fields

### Expected Results
- Validation errors appear
- Cannot submit incomplete form
- Clear error messages
- Form highlights missing fields

---

## TC-BOOKING-024: Booking Time Display Format
**Priority:** Low
**Type:** UI/UX

### Test Steps
1. View bookings with different times

### Expected Results
- Time in 12-hour format: "9:00 AM"
- NOT 24-hour: "09:00"
- Consistent formatting
- Includes AM/PM
- Readable and clear

---

## TC-BOOKING-025: Mobile - Book Class
**Priority:** High
**Type:** Mobile

### Preconditions
- Mobile device or viewport

### Test Steps
1. View classes on mobile
2. Book a class
3. View booking dialog

### Expected Results
- Class cards stack vertically
- "Book Now" button full width or easy to tap
- Dialog optimized for mobile
- Buttons minimum 44px height
- All info visible
- No horizontal scroll

---

## TC-BOOKING-026: Empty Day - No Classes
**Priority:** Medium
**Type:** Functional

### Test Steps
1. Select a day with no scheduled classes
2. Observe display

### Expected Results
- Empty state message
- "No classes scheduled for [Day]"
- Helpful icon or illustration
- Clean, clear message
- Not an error, just info

---

## TC-BOOKING-027: Booking Created Timestamp
**Priority:** Low
**Type:** Data

### Test Steps
1. Book a class
2. Check booking details

### Expected Results
- Shows "Booked on: [Date and Time]"
- Accurate timestamp
- Formatted clearly
- Timezone correct

---

## TC-BOOKING-028: Concurrent Booking Attempts
**Priority:** Medium
**Type:** Edge Case

### Preconditions
- Class has 1 spot left

### Test Steps
1. User A starts booking
2. User B starts booking same class
3. User A completes booking first
4. User B tries to complete

### Expected Results
- User A's booking succeeds
- User B gets error: "Class is now full"
- Only one booking created
- No overbooking
- Capacity enforced

---

## Test Summary

| Category | Total Tests | Priority High | Priority Medium | Priority Low |
|----------|-------------|---------------|-----------------|--------------|
| Class Booking | 28 | 13 | 10 | 5 |

---

## Test Data Setup

```sql
-- Create test classes
INSERT INTO classes (name, description, image_url)
VALUES
  ('Yoga Flow', 'Relaxing yoga session', null),
  ('HIIT Training', 'High intensity interval training', null),
  ('Spin Class', 'Indoor cycling workout', null),
  ('Boxing Fundamentals', 'Learn basic boxing techniques', null);

-- Create test schedules
INSERT INTO schedule (day_of_week, start_time, end_time, class_id, instructor_id, max_capacity)
VALUES
  ('monday', '09:00', '10:00', 'yoga_class_id', 'instructor_id', 20),
  ('monday', '18:00', '19:00', 'hiit_class_id', 'instructor_id', 15),
  ('wednesday', '10:00', '11:00', 'spin_class_id', 'instructor_id', 25),
  ('friday', '17:00', '18:00', 'boxing_class_id', 'instructor_id', 10);

-- Create test booking
INSERT INTO bookings (user_id, schedule_id, status)
VALUES ('member_id', 'schedule_id', 'confirmed');
```

---

## Notes for Tester

### Critical Scenarios
1. Cannot book without active membership
2. Cannot book same class twice
3. Cannot book full class
4. Cancellation triggers waitlist processing
5. Booking count is accurate

### Common Issues
- Next occurrence calculation off by timezone
- Duplicate bookings created
- Booking count not updating
- Cancelled bookings still showing
- Waitlist not processing

### Browser Testing
- Test on Chrome, Firefox, Safari, Edge
- Test on mobile devices
- Test time display formatting
- Test dialog responsiveness

### Performance
- Booking should complete < 2 seconds
- List should update immediately
- No lag when switching days
- Smooth animations
