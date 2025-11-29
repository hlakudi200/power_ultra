# Waitlist-Booking Conflict Prevention

## Problem

Users were able to join the waitlist for a class they had already booked. This doesn't make sense because:
- They already have a spot in the class
- Waitlist is only for people who couldn't get in because the class was full
- It wastes waitlist positions

## Solution

Implemented **three layers of protection** to prevent this:

### 1. Frontend Validation (WaitlistButton Component)
**File:** `src/components/WaitlistButton.tsx`

**Changes:**
1. Added state to track if user has active booking: `hasActiveBooking`
2. Check for active booking when fetching waitlist status
3. Show error toast if user tries to join waitlist while having a booking
4. Hide waitlist button entirely if user has active booking

**Code Added:**
```typescript
// Check if user has an active booking
const { data: bookingData } = await supabase
  .from("bookings")
  .select("id")
  .eq("schedule_id", scheduleId)
  .eq("user_id", session.user.id)
  .in("status", ["confirmed", "pending"])
  .maybeSingle();

setHasActiveBooking(!!bookingData);

// In handleJoinWaitlist:
if (existingBooking) {
  toast({
    title: "Already Booked",
    description: "You already have a booking for this class. You cannot join the waitlist.",
    variant: "destructive",
  });
  return;
}

// Hide button if user has booking:
if (hasActiveBooking) {
  return null;
}
```

### 2. Database Trigger (Server-Side Validation)
**File:** `fix_waitlist_booking_conflict.sql`

**What It Does:**
- Creates a database trigger that runs BEFORE any waitlist insert
- Checks if the user already has an active booking
- Throws an error if they do, preventing the insert

**Code:**
```sql
CREATE OR REPLACE FUNCTION check_waitlist_booking_conflict()
RETURNS TRIGGER AS $$
DECLARE
  active_booking_count integer;
BEGIN
  -- Check if user already has an active booking for this schedule
  SELECT COUNT(*) INTO active_booking_count
  FROM public.bookings
  WHERE schedule_id = NEW.schedule_id
    AND user_id = NEW.user_id
    AND status IN ('confirmed', 'pending');

  -- If they have an active booking, prevent waitlist entry
  IF active_booking_count > 0 THEN
    RAISE EXCEPTION 'You already have a booking for this class. Cannot join waitlist.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_waitlist_if_booked
  BEFORE INSERT ON public.waitlist
  FOR EACH ROW
  EXECUTE FUNCTION check_waitlist_booking_conflict();
```

### 3. UI Prevention (Hide Button)
The waitlist button is now completely hidden if the user has an active booking, preventing confusion.

## How to Apply the Fix

### Step 1: Frontend Changes (Already Applied)
The TypeScript changes to `WaitlistButton.tsx` are already in the codebase.

### Step 2: Apply Database Trigger
Run the SQL in your Supabase SQL Editor:

```bash
# Via SQL Editor: Copy and paste fix_waitlist_booking_conflict.sql
# OR via psql:
psql -h db.xxx.supabase.co -U postgres -d postgres -f fix_waitlist_booking_conflict.sql
```

### Step 3: Verify Trigger Created
```sql
-- Check trigger exists
SELECT * FROM pg_trigger
WHERE tgname = 'prevent_waitlist_if_booked';

-- Check function exists
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'check_waitlist_booking_conflict';
```

## Testing

### Test 1: User with Active Booking Cannot Join Waitlist

**Setup:**
1. Book a class as User A (class becomes full or nearly full)
2. Try to join waitlist for the same class as User A

**Expected Result:**
- ✅ Waitlist button is **hidden** (doesn't show at all)
- ✅ If somehow they bypass frontend, toast shows: "Already Booked"
- ✅ If they bypass both, database throws error

**Verify in Database:**
```sql
-- This should return 0 (no waitlist entry created)
SELECT COUNT(*) FROM waitlist
WHERE user_id = 'USER_A_ID'
  AND schedule_id = 'SCHEDULE_ID';
```

### Test 2: User Can Join Waitlist After Cancelling

**Setup:**
1. User A has active booking
2. User A cancels booking
3. User A tries to join waitlist

**Expected Result:**
- ✅ Waitlist button shows up
- ✅ User can join waitlist successfully
- ✅ Entry created in database

**Verify:**
```sql
SELECT * FROM waitlist
WHERE user_id = 'USER_A_ID'
  AND schedule_id = 'SCHEDULE_ID';
```

### Test 3: User on Waitlist Can Book When Notified

**Setup:**
1. User B is on waitlist with status = 'notified'
2. User B books the class

**Expected Result:**
- ✅ Booking created successfully
- ✅ Waitlist status changes to 'converted'
- ✅ User B can no longer see waitlist button

**Verify:**
```sql
-- Should show 'converted' status
SELECT status FROM waitlist
WHERE user_id = 'USER_B_ID'
  AND schedule_id = 'SCHEDULE_ID';

-- Should show 'confirmed' booking
SELECT status FROM bookings
WHERE user_id = 'USER_B_ID'
  AND schedule_id = 'SCHEDULE_ID';
```

## Edge Cases Handled

### Case 1: User Books, Cancels, Rejoins Waitlist
✅ **Allowed** - Cancelling removes active booking, so user can join waitlist

### Case 2: User on Waitlist, Gets Notified, Books
✅ **Allowed** - This is the intended flow. Waitlist status converts to 'converted'

### Case 3: User Has Pending Booking, Tries to Join Waitlist
✅ **Blocked** - Both 'confirmed' AND 'pending' bookings prevent waitlist join

### Case 4: User Has Cancelled Booking, Tries to Join Waitlist
✅ **Allowed** - Cancelled bookings are excluded from the check

### Case 5: Direct Database Insert Bypassing Frontend
✅ **Blocked** - Database trigger catches this and throws error

## Benefits

1. **Data Integrity**: No conflicting records (user can't be both booked AND on waitlist)
2. **Fair Queue**: Waitlist positions not wasted on users who already have spots
3. **Better UX**: Users don't see confusing waitlist button when they're already booked
4. **Security**: Three layers prevent bypass attempts

## Technical Details

### Frontend Check (Layer 1)
- **When:** On component mount and after any booking/waitlist change
- **How:** Query `bookings` table for active bookings
- **Action:** Hide button, prevent dialog from opening

### Form Validation (Layer 2)
- **When:** User clicks "Join Waitlist" in dialog
- **How:** Check bookings table before inserting
- **Action:** Show error toast, prevent insert

### Database Trigger (Layer 3)
- **When:** Before any INSERT on `waitlist` table
- **How:** Trigger function queries bookings table
- **Action:** Raise exception, rollback transaction

### Query Used (All Layers)
```sql
SELECT COUNT(*) FROM bookings
WHERE schedule_id = ?
  AND user_id = ?
  AND status IN ('confirmed', 'pending')
```

## Files Modified

### Frontend:
- ✅ `src/components/WaitlistButton.tsx`
  - Added `hasActiveBooking` state
  - Added booking check in `fetchWaitlistStatus()`
  - Added validation in `handleJoinWaitlist()`
  - Added early return to hide button

### Database:
- ✅ `fix_waitlist_booking_conflict.sql` (New)
  - Function: `check_waitlist_booking_conflict()`
  - Trigger: `prevent_waitlist_if_booked`

## Summary

✅ **Problem:** Users could join waitlist for classes they already booked
✅ **Solution:** Three-layer prevention (Frontend, Validation, Database)
✅ **Status:** Fixed - Ready to Deploy
✅ **Impact:** High - Ensures waitlist integrity and fairness

**Next Step:** Apply database trigger via `fix_waitlist_booking_conflict.sql`

---

**Date:** November 27, 2025
**Status:** Complete - Awaiting Database Deployment
