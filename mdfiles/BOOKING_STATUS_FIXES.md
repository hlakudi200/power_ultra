# Booking System Status Fixes - Implementation Guide

## Executive Summary

**Problem Found:** All booking capacity queries include `"pending"` status, causing inaccurate capacity calculations.

**Impact:** Classes show as full when they have available spots, preventing legitimate bookings.

**Solution:** Update all queries to only count `"confirmed"` bookings + add `class_date` filter for new cleanup system.

**Files to Update:** 8 files, 16 query locations

---

## Critical Understanding

### Current Status Flow (WRONG)
```
User books → status: "confirmed"
            ↓
Capacity counts: confirmed + pending  ❌ WRONG
```

### Correct Status Flow (RIGHT)
```
User books → status: "confirmed"
            ↓
Capacity counts: ONLY confirmed  ✅ CORRECT
```

### With New Cleanup System
```
Day 1: User books Monday class → status: "confirmed", class_date: "2024-12-16"
Day 2 (after 2 AM cleanup): status: "completed", class_date: "2024-12-16"
       ↑ Preserved for analytics, but NOT counted in capacity
```

---

## Implementation Checklist

### Phase 1: Critical Capacity Fixes (Do First!)
- [ ] 1. Schedule.tsx - capacity query
- [ ] 2. ClassSchedule.tsx - capacity query & user booking check
- [ ] 3. admin/Schedule.tsx - admin capacity query
- [ ] 4. BookingDialog.tsx - existing booking check
- [ ] 5. Dashboard.tsx - capacity query & user bookings
- [ ] 6. WaitlistButton.tsx - booking checks

### Phase 2: Analytics Fixes
- [ ] 7. admin/Analytics.tsx - all analytics queries

### Phase 3: Testing
- [ ] Test capacity calculations
- [ ] Test user booking flow
- [ ] Test admin views
- [ ] Test analytics accuracy

---

## File-by-File Implementation

---

### 1. src/components/Schedule.tsx

**Location:** Lines 45-49

**BEFORE:**
```typescript
const { count } = await supabase
  .from("bookings")
  .select("*", { count: "exact", head: true })
  .eq("schedule_id", schedule.id)
  .in("status", ["confirmed", "pending"]);
```

**AFTER:**
```typescript
const today = new Date().toISOString().split('T')[0];
const { count } = await supabase
  .from("bookings")
  .select("*", { count: "exact", head: true })
  .eq("schedule_id", schedule.id)
  .gte("class_date", today)  // Only future bookings
  .eq("status", "confirmed");  // Only confirmed bookings
```

**Why:** Only confirmed future bookings should count toward capacity.

---

### 2. src/pages/ClassSchedule.tsx

**Location #1:** Lines 87-91 - Capacity Query

**BEFORE:**
```typescript
const { count } = await supabase
  .from("bookings")
  .select("*", { count: "exact", head: true })
  .eq("schedule_id", schedule.id)
  .in("status", ["confirmed", "pending"]);
```

**AFTER:**
```typescript
const today = new Date().toISOString().split('T')[0];
const { count } = await supabase
  .from("bookings")
  .select("*", { count: "exact", head: true })
  .eq("schedule_id", schedule.id)
  .gte("class_date", today)
  .eq("status", "confirmed");
```

**Location #2:** Lines 94-100 - User Booking Check

**BEFORE:**
```typescript
const { data: userBooking } = await supabase
  .from("bookings")
  .select("id")
  .eq("schedule_id", schedule.id)
  .eq("user_id", session.user.id)
  .in("status", ["confirmed", "pending"])
  .single();
```

**AFTER:**
```typescript
const today = new Date().toISOString().split('T')[0];
const { data: userBooking } = await supabase
  .from("bookings")
  .select("id")
  .eq("schedule_id", schedule.id)
  .eq("user_id", session.user.id)
  .gte("class_date", today)
  .eq("status", "confirmed")
  .maybeSingle();  // Changed from .single()
```

**Why:** User should only be blocked from booking if they have a confirmed future booking.

---

### 3. src/pages/admin/Schedule.tsx

**Location:** Lines 148-152

**BEFORE:**
```typescript
const { count } = await supabase
  .from("bookings")
  .select("*", { count: "exact", head: true })
  .eq("schedule_id", schedule.id)
  .in("status", ["confirmed", "pending"]);
```

**AFTER:**
```typescript
const today = new Date().toISOString().split('T')[0];
const { count } = await supabase
  .from("bookings")
  .select("*", { count: "exact", head: true })
  .eq("schedule_id", schedule.id)
  .gte("class_date", today)
  .eq("status", "confirmed");
```

**Why:** Admin should see accurate capacity for future classes only.

---

### 4. src/components/BookingDialog.tsx

**Location:** Lines 48-53

**BEFORE:**
```typescript
const { data: existingBooking, error: checkError } = await supabase
  .from("bookings")
  .select("id, status")
  .eq("schedule_id", scheduleId)
  .eq("user_id", session.user.id)
  .single();
```

**AFTER:**
```typescript
const today = new Date().toISOString().split('T')[0];
const { data: existingBooking, error: checkError } = await supabase
  .from("bookings")
  .select("id, status, class_date")
  .eq("schedule_id", scheduleId)
  .eq("user_id", session.user.id)
  .gte("class_date", today)
  .in("status", ["confirmed", "cancelled"])  // Check for active or previously cancelled
  .maybeSingle();  // Changed from .single()
```

**Why:** User can re-book if they cancelled, but not if they have active confirmed booking for future date.

---

### 5. src/pages/Dashboard.tsx

**Location #1:** Lines 184-188 - Capacity Query

**BEFORE:**
```typescript
const { count } = await supabase
  .from("bookings")
  .select("*", { count: "exact", head: true })
  .eq("schedule_id", schedule.id)
  .in("status", ["confirmed", "pending"]);
```

**AFTER:**
```typescript
const today = new Date().toISOString().split('T')[0];
const { count } = await supabase
  .from("bookings")
  .select("*", { count: "exact", head: true })
  .eq("schedule_id", schedule.id)
  .gte("class_date", today)
  .eq("status", "confirmed");
```

**Location #2:** Lines 86-108 - User's Bookings

**BEFORE:**
```typescript
const { data, error } = await supabase
  .from("bookings")
  .select(
    `
    id,
    created_at,
    status,
    schedule (...)
  `
  )
  .eq("user_id", userId)
  .in("status", ["confirmed", "pending"])
  .order("created_at", { ascending: false });
```

**AFTER:**
```typescript
const today = new Date().toISOString().split('T')[0];
const { data, error } = await supabase
  .from("bookings")
  .select(
    `
    id,
    created_at,
    status,
    class_date,
    schedule (...)
  `
  )
  .eq("user_id", userId)
  .gte("class_date", today)  // Only future bookings
  .eq("status", "confirmed")  // Only confirmed
  .order("class_date", { ascending: true });  // Sort by class date
```

**Enhancement:** Add a "Booking History" section:
```typescript
// Optional: Show past bookings
const { data: pastBookings, error: pastError } = await supabase
  .from("bookings")
  .select(
    `
    id,
    created_at,
    status,
    class_date,
    schedule (...)
  `
  )
  .eq("user_id", userId)
  .lt("class_date", today)  // Past bookings
  .eq("status", "completed")
  .order("class_date", { descending: true })
  .limit(10);
```

---

### 6. src/components/WaitlistButton.tsx

**Location #1:** Lines 53-59 - Active Booking Check

**BEFORE:**
```typescript
const { data: bookingData, error: bookingError } = await supabase
  .from("bookings")
  .select("id")
  .eq("schedule_id", scheduleId)
  .eq("user_id", session.user.id)
  .in("status", ["confirmed", "pending"])
  .maybeSingle();
```

**AFTER:**
```typescript
const today = new Date().toISOString().split('T')[0];
const { data: bookingData, error: bookingError } = await supabase
  .from("bookings")
  .select("id")
  .eq("schedule_id", scheduleId)
  .eq("user_id", session.user.id)
  .gte("class_date", today)
  .eq("status", "confirmed")
  .maybeSingle();
```

**Location #2:** Lines 107-113 - Join Waitlist Validation

**BEFORE:**
```typescript
const { data: existingBooking, error: bookingCheckError } = await supabase
  .from("bookings")
  .select("id, status")
  .eq("schedule_id", scheduleId)
  .eq("user_id", session.user.id)
  .in("status", ["confirmed", "pending"])
  .maybeSingle();
```

**AFTER:**
```typescript
const today = new Date().toISOString().split('T')[0];
const { data: existingBooking, error: bookingCheckError } = await supabase
  .from("bookings")
  .select("id, status")
  .eq("schedule_id", scheduleId)
  .eq("user_id", session.user.id)
  .gte("class_date", today)
  .eq("status", "confirmed")
  .maybeSingle();
```

---

### 7. src/pages/admin/Analytics.tsx

**Location #1:** Lines 101-103 - Total Bookings

**BEFORE:**
```typescript
const { count: totalBookings } = await supabase
  .from("bookings")
  .select("*", { count: "exact", head: true });
```

**AFTER:**
```typescript
const { count: totalBookings } = await supabase
  .from("bookings")
  .select("*", { count: "exact", head: true })
  .eq("status", "confirmed");  // Only confirmed bookings
```

**Location #2:** Lines 106-110 - Period Bookings

**BEFORE:**
```typescript
const { count: bookingsThisPeriod } = await supabase
  .from("bookings")
  .select("*", { count: "exact", head: true })
  .gte("created_at", start.toISOString())
  .lte("created_at", end.toISOString());
```

**AFTER:**
```typescript
const { count: bookingsThisPeriod } = await supabase
  .from("bookings")
  .select("*", { count: "exact", head: true })
  .eq("status", "confirmed")
  .gte("created_at", start.toISOString())
  .lte("created_at", end.toISOString());
```

**Location #3:** Lines 138-150 - Class Attendance

**BEFORE:**
```typescript
const { data: classBookings } = await supabase
  .from("bookings")
  .select(
    `
    schedule (
      classes (
        name
      )
    )
  `
  )
  .gte("created_at", start.toISOString())
  .lte("created_at", end.toISOString());
```

**AFTER:**
```typescript
const { data: classBookings } = await supabase
  .from("bookings")
  .select(
    `
    schedule (
      classes (
        name
      )
    )
  `
  )
  .eq("status", "confirmed")  // Add this
  .gte("created_at", start.toISOString())
  .lte("created_at", end.toISOString());
```

**Location #4:** Lines 165-175 - Popular Days

**BEFORE:**
```typescript
const { data: dayBookings } = await supabase
  .from("bookings")
  .select(
    `
    schedule (
      day_of_week
    )
  `
  )
  .gte("created_at", start.toISOString())
  .lte("created_at", end.toISOString());
```

**AFTER:**
```typescript
const { data: dayBookings } = await supabase
  .from("bookings")
  .select(
    `
    schedule (
      day_of_week
    )
  `
  )
  .eq("status", "confirmed")  // Add this
  .gte("created_at", start.toISOString())
  .lte("created_at", end.toISOString());
```

---

## Common Helper Function (Recommended)

Create a utility function to standardize date handling:

**File:** `src/lib/bookingUtils.ts` (create new file)

```typescript
/**
 * Get today's date in YYYY-MM-DD format (UTC)
 * Used for filtering bookings by class_date
 */
export const getTodayDateString = (): string => {
  return new Date().toISOString().split('T')[0];
};

/**
 * Standard query filters for active (future) bookings
 */
export const getActiveFutureBookingsFilter = () => {
  const today = getTodayDateString();
  return {
    class_date_gte: today,
    status: 'confirmed'
  };
};

/**
 * Check if a booking is active (future and confirmed)
 */
export const isActiveBooking = (booking: { class_date: string; status: string }): boolean => {
  const today = getTodayDateString();
  return booking.class_date >= today && booking.status === 'confirmed';
};
```

**Then use in queries:**
```typescript
import { getTodayDateString } from '@/lib/bookingUtils';

const today = getTodayDateString();
const { count } = await supabase
  .from("bookings")
  .select("*", { count: "exact", head: true })
  .eq("schedule_id", scheduleId)
  .gte("class_date", today)
  .eq("status", "confirmed");
```

---

## Testing After Implementation

### 1. Capacity Calculation Test
```typescript
// Create test: Book until class is full
// Expected: Class shows as FULL at max_capacity confirmed bookings
// Expected: Pending/cancelled bookings don't count
```

### 2. User Booking Test
```typescript
// Test: User books Monday Yoga for Dec 16
// Test: User tries to book Monday Yoga again (same week)
// Expected: Blocked - "You have already booked this class"

// Wait for cleanup (or run manually)
// Test: User tries to book Monday Yoga for Dec 23 (next week)
// Expected: Allowed - different class_date
```

### 3. Analytics Test
```sql
-- Verify analytics only count confirmed bookings
SELECT
  status,
  COUNT(*) as count
FROM bookings
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY status;

-- Should see: confirmed bookings match analytics numbers
```

---

## Rollback Plan

If issues arise, revert by:

1. **Database:** Bookings are preserved, just marked as completed
2. **Frontend:** Change queries back to include "pending"
3. **Cleanup:** Disable cron job if needed

```sql
-- Emergency: Revert all completed back to confirmed
UPDATE bookings
SET status = 'confirmed'
WHERE status = 'completed' AND class_date >= CURRENT_DATE;
```

---

## Summary

**Total Changes:** 16 query locations across 7 files

**Pattern:** Replace `.in("status", ["confirmed", "pending"])` with `.eq("status", "confirmed")` + add `.gte("class_date", today)`

**Impact:** Accurate capacity calculations, proper booking history, better analytics

**Time Estimate:** 2-3 hours for implementation + testing
