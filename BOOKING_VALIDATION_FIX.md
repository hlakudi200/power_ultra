# Booking Validation Fix - Exclude Cancelled Bookings

## Problem

When a user cancelled a booking and someone on the waitlist tried to book:
- **UI shows:** Spot available (e.g., "19/20" bookings)
- **Booking attempt fails:** "This class is already at full capacity"

## Root Cause

The database validation function `is_class_full()` was counting **ALL** bookings, including cancelled ones:

```sql
-- ❌ WRONG - Counts ALL bookings
SELECT COUNT(*) INTO current_bookings
FROM public.bookings
WHERE schedule_id = schedule_id_param;
```

**Example:**
- Max capacity: 20
- Active bookings: 19 (confirmed/pending)
- Cancelled bookings: 1
- **Total count: 20** ❌ Function thinks class is full!

But the frontend counts only active bookings:
```typescript
.in("status", ["confirmed", "pending"])  // ✅ Correct
```

This mismatch caused the error.

## Solution

Update the `is_class_full()` function to only count active bookings:

```sql
-- ✅ CORRECT - Only counts active bookings
SELECT COUNT(*) INTO current_bookings
FROM public.bookings
WHERE schedule_id = schedule_id_param
  AND status IN ('confirmed', 'pending');  -- Exclude 'cancelled'
```

## Files Created

**`fix_booking_validation.sql`** - Updates three functions:
1. `is_class_full()` - Checks if class is at capacity
2. `get_booking_count()` - Returns booking count
3. `get_available_spots()` - Returns available spots

All now filter by `status IN ('confirmed', 'pending')`.

## How to Apply the Fix

### Step 1: Run the SQL Fix

In your Supabase SQL Editor, run:

```bash
# Copy contents of fix_booking_validation.sql and paste in SQL Editor
# OR use psql:
psql -h db.xxx.supabase.co -U postgres -d postgres -f fix_booking_validation.sql
```

### Step 2: Verify Functions Updated

```sql
-- Check the function definition
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'is_class_full';
```

You should see `status IN ('confirmed', 'pending')` in the WHERE clause.

### Step 3: Test the Fix

#### Test 1: Check Current Bookings
```sql
-- Get a schedule ID that has cancelled bookings
SELECT
  s.id as schedule_id,
  s.max_capacity,
  COUNT(*) FILTER (WHERE b.status IN ('confirmed', 'pending')) as active_bookings,
  COUNT(*) FILTER (WHERE b.status = 'cancelled') as cancelled_bookings,
  COUNT(*) as total_bookings
FROM schedule s
LEFT JOIN bookings b ON s.id = b.schedule_id
GROUP BY s.id, s.max_capacity
HAVING COUNT(*) FILTER (WHERE b.status = 'cancelled') > 0
LIMIT 5;
```

#### Test 2: Test is_class_full Function
```sql
-- Replace with your actual schedule_id
SELECT
  id,
  max_capacity,
  is_class_full(id) as is_full,
  get_booking_count(id) as active_count,
  get_available_spots(id) as spots_available
FROM schedule
WHERE id = 'YOUR_SCHEDULE_ID';
```

Expected result when there's a cancelled booking:
- `is_full` = false
- `active_count` = 19 (for example)
- `spots_available` = 1

#### Test 3: Try Booking from Waitlist
1. Have a user on waitlist with status = 'notified'
2. Try to book the class through the UI
3. **Should succeed** ✅

## Complete Flow After Fix

### Scenario: User cancels, waitlist user books

1. **Member A cancels booking**
   - Booking status changes to `'cancelled'`
   - Edge function notifies Member B (first on waitlist)
   - Member B status changes to `'notified'`

2. **Member B tries to book**
   - Frontend checks: `get_booking_count()` returns 19 (excludes cancelled)
   - UI shows: "19/20 spots filled" ✅
   - Member B clicks "BOOK NOW"

3. **Validation trigger fires**
   - Calls `is_class_full()` function
   - Function counts: `SELECT COUNT(*) WHERE status IN ('confirmed', 'pending')`
   - Returns: 19 < 20 = **false** (not full) ✅
   - Booking proceeds successfully ✅

4. **Member B booking confirmed**
   - Booking created with status = `'confirmed'`
   - Waitlist status updated to `'converted'`
   - Success toast shown ✅

## Why This Fix is Important

### Before Fix:
```
Class capacity: 20
Active bookings: 19 (confirmed/pending)
Cancelled bookings: 1

Frontend: "19/20 - JOIN WAITLIST" ✅ Correct
Database: COUNT(*) = 20 → "Full" ❌ Wrong

Result: Waitlist users CAN'T book even though spot is available
```

### After Fix:
```
Class capacity: 20
Active bookings: 19 (confirmed/pending)
Cancelled bookings: 1

Frontend: "19/20 - BOOK NOW" ✅ Correct
Database: COUNT(*) WHERE status IN ('confirmed', 'pending') = 19 → "Not full" ✅ Correct

Result: Waitlist users CAN book successfully ✅
```

## Other Functions Fixed

### get_booking_count()
Used by frontend to display booking count on class cards.

**Before:**
```sql
SELECT COUNT(*) FROM bookings WHERE schedule_id = ?
```

**After:**
```sql
SELECT COUNT(*) FROM bookings
WHERE schedule_id = ?
  AND status IN ('confirmed', 'pending')
```

### get_available_spots()
Returns number of spots remaining.

**Before:**
```sql
max_capacity - COUNT(*)
```

**After:**
```sql
max_capacity - COUNT(*) WHERE status IN ('confirmed', 'pending')
```

## Testing Checklist

- [ ] Run `fix_booking_validation.sql`
- [ ] Verify function definitions updated
- [ ] Create a booking at capacity (20/20)
- [ ] Cancel one booking (should show 19/20)
- [ ] Join waitlist as another user
- [ ] Cancel another booking
- [ ] Verify waitlist user gets notified
- [ ] **Verify waitlist user can book successfully** ✅
- [ ] Verify booking count shows correctly (20/20 after booking)

## Troubleshooting

### Still Getting "Full Capacity" Error?

**Check 1: Did the function update?**
```sql
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'is_class_full';
```

Look for `status IN ('confirmed', 'pending')` in the output.

**Check 2: Are there actually available spots?**
```sql
SELECT
  max_capacity,
  (SELECT COUNT(*) FROM bookings
   WHERE schedule_id = s.id
   AND status IN ('confirmed', 'pending')) as active_bookings
FROM schedule s
WHERE id = 'YOUR_SCHEDULE_ID';
```

If `active_bookings >= max_capacity`, then the class really is full.

**Check 3: Check booking status values**
```sql
SELECT status, COUNT(*)
FROM bookings
WHERE schedule_id = 'YOUR_SCHEDULE_ID'
GROUP BY status;
```

Make sure cancelled bookings have status = `'cancelled'` exactly.

### Function Not Updating?

Try dropping and recreating:
```sql
DROP FUNCTION IF EXISTS public.is_class_full(uuid);
DROP FUNCTION IF EXISTS public.get_booking_count(uuid);
DROP FUNCTION IF EXISTS public.get_available_spots(uuid);

-- Then run fix_booking_validation.sql again
```

## Summary

✅ **Problem:** Validation counted cancelled bookings, blocking waitlist users
✅ **Solution:** Filter by `status IN ('confirmed', 'pending')`
✅ **Functions Updated:**
   - `is_class_full()`
   - `get_booking_count()`
   - `get_available_spots()`
✅ **Result:** Waitlist users can now book when spots become available

---

**Date:** November 27, 2025
**Status:** Fixed - Ready to Apply
**Impact:** Critical - Enables waitlist system to function correctly
