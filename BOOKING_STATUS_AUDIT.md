# Booking System Status Audit & Implementation Plan

## Overview
After adding the `class_date` field and `completed` status to bookings, we need to update the frontend to properly filter bookings and calculate capacity.

---

## Database Changes Made

### 1. New Column: `bookings.class_date`
- Tracks the specific date of the class occurrence
- Auto-populated by trigger on INSERT
- Used for daily cleanup

### 2. New Status: `completed`
- Bookings with `class_date < TODAY` are marked as `completed` daily
- These should NOT count toward class capacity
- These ARE preserved for analytics

### 3. Status Flow
```
pending → confirmed → completed (preserved)
              ↓
         cancelled (preserved)
```

---

## Frontend Files That Need Updates

### **CRITICAL: Capacity Calculation**

#### 1. **src/components/Schedule.tsx**
**Issue:** Counts ALL bookings regardless of status or date
**Location:** Lines where it fetches bookings to calculate capacity
**Fix Needed:**
```typescript
// BEFORE (counts everything)
const { data: bookings } = await supabase
  .from('bookings')
  .select('*')
  .eq('schedule_id', scheduleId);

// AFTER (only count active future bookings)
const { data: bookings } = await supabase
  .from('bookings')
  .select('*')
  .eq('schedule_id', scheduleId)
  .gte('class_date', new Date().toISOString().split('T')[0])  // Today or future
  .in('status', ['confirmed', 'pending']);  // Active bookings only
```

#### 2. **src/pages/ClassSchedule.tsx**
**Issue:** Same as Schedule.tsx
**Fix Needed:** Apply same filter for capacity calculation

#### 3. **src/pages/admin/Schedule.tsx**
**Issue:** Admin schedule view might show incorrect capacity
**Fix Needed:** Filter bookings by date and active status

---

### **MODERATE: Booking Queries**

#### 4. **src/pages/Dashboard.tsx**
**Issue:** User dashboard showing past bookings as current
**Location:** User's "My Bookings" section
**Fix Needed:**
```typescript
// Show only FUTURE confirmed bookings
const { data: upcomingBookings } = await supabase
  .from('bookings')
  .select('*, schedule(*), classes(*)')
  .eq('user_id', user.id)
  .gte('class_date', new Date().toISOString().split('T')[0])
  .in('status', ['confirmed', 'pending'])
  .order('class_date', { ascending: true });

// Optionally show PAST bookings (completed) in history section
const { data: pastBookings } = await supabase
  .from('bookings')
  .select('*, schedule(*), classes(*)')
  .eq('user_id', user.id)
  .lt('class_date', new Date().toISOString().split('T')[0])
  .eq('status', 'completed')
  .order('class_date', { descending: true })
  .limit(10);
```

#### 5. **src/components/BookingDialog.tsx**
**Issue:** Checking for existing booking doesn't filter by date
**Location:** Line 48-53
**Fix Needed:**
```typescript
// Check for existing ACTIVE booking for this class
const { data: existingBooking } = await supabase
  .from("bookings")
  .select("id, status, class_date")
  .eq("schedule_id", scheduleId)
  .eq("user_id", session.user.id)
  .gte('class_date', new Date().toISOString().split('T')[0])  // Add this
  .in('status', ['confirmed', 'pending', 'cancelled'])  // Add this
  .single();
```

---

### **LOW: Admin Views**

#### 6. **src/pages/admin/Bookings.tsx**
**Issue:** Admin viewing all bookings might need status filter
**Enhancement:** Add filter/tabs for:
- Active (confirmed/pending, future dates)
- Completed (past classes)
- Cancelled

#### 7. **src/pages/admin/Analytics.tsx**
**Opportunity:** Can now use `completed` bookings for analytics!
**Enhancement:**
- Attendance trends (completed bookings over time)
- Class popularity (most completed bookings)
- Member engagement (completion rate)

---

## Implementation Priority

### **PHASE 1: Critical Fixes (Do First!)**
These prevent overbooking and ensure capacity calculations work:

1. ✅ **Update Schedule.tsx capacity calculation**
2. ✅ **Update ClassSchedule.tsx capacity calculation**
3. ✅ **Update admin/Schedule.tsx capacity calculation**
4. ✅ **Update BookingDialog.tsx existing booking check**

### **PHASE 2: User Experience (Do Second)**
These improve what users see:

5. ✅ **Update Dashboard.tsx to show only future bookings**
6. ✅ **Add booking history section to Dashboard.tsx**

### **PHASE 3: Admin Tools (Do Third)**
These add admin features:

7. ✅ **Add status filter to admin/Bookings.tsx**
8. ✅ **Add analytics for completed bookings**

---

## Critical Queries to Fix

### **Query Pattern: Get Available Spots**
```typescript
// WRONG (old way - counts everything)
const { count } = await supabase
  .from('bookings')
  .select('*', { count: 'exact' })
  .eq('schedule_id', scheduleId);

const availableSpots = maxCapacity - count;

// CORRECT (new way - only count active future bookings)
const today = new Date().toISOString().split('T')[0];
const { count } = await supabase
  .from('bookings')
  .select('*', { count: 'exact' })
  .eq('schedule_id', scheduleId)
  .gte('class_date', today)
  .in('status', ['confirmed', 'pending']);

const availableSpots = maxCapacity - count;
```

### **Query Pattern: User's Current Bookings**
```typescript
// WRONG (shows past bookings as current)
const { data } = await supabase
  .from('bookings')
  .select('*')
  .eq('user_id', userId);

// CORRECT (only future bookings)
const today = new Date().toISOString().split('T')[0];
const { data } = await supabase
  .from('bookings')
  .select('*, schedule!inner(*), classes(*)')
  .eq('user_id', userId)
  .gte('class_date', today)
  .in('status', ['confirmed', 'pending'])
  .order('class_date', { ascending: true });
```

### **Query Pattern: Check if User Already Booked**
```typescript
// WRONG (checks all time)
const { data } = await supabase
  .from('bookings')
  .select('*')
  .eq('schedule_id', scheduleId)
  .eq('user_id', userId)
  .single();

// CORRECT (only check for future booking)
const today = new Date().toISOString().split('T')[0];
const { data } = await supabase
  .from('bookings')
  .select('*')
  .eq('schedule_id', scheduleId)
  .eq('user_id', userId)
  .gte('class_date', today)
  .in('status', ['confirmed', 'pending'])
  .maybeSingle();  // Use maybeSingle instead of single
```

---

## Database Queries for Verification

### Check if class_date column exists:
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'bookings' AND column_name = 'class_date';
```

### Check booking status distribution:
```sql
SELECT
  status,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE class_date < CURRENT_DATE) as past,
  COUNT(*) FILTER (WHERE class_date >= CURRENT_DATE) as future,
  COUNT(*) FILTER (WHERE class_date IS NULL) as no_date
FROM bookings
GROUP BY status
ORDER BY status;
```

### Find bookings that need class_date backfill:
```sql
SELECT COUNT(*) as needs_backfill
FROM bookings
WHERE class_date IS NULL
  AND status IN ('confirmed', 'pending');
```

---

## Testing Checklist

After implementing changes, test:

### Capacity Calculation
- [ ] Book a class - capacity decreases
- [ ] Cancel a booking - capacity increases
- [ ] Wait for cleanup (or run manually) - completed bookings don't count toward capacity
- [ ] Class shows as "FULL" when capacity reached
- [ ] Class shows available spots when capacity not reached

### User Bookings
- [ ] Dashboard shows only future bookings
- [ ] Past bookings appear in history (if implemented)
- [ ] Cannot book same class twice (for same date)
- [ ] Can book same class next week (different date)

### Admin Views
- [ ] Admin sees correct capacity on schedule
- [ ] Admin can filter bookings by status
- [ ] Admin analytics show completed bookings

---

## Edge Cases to Handle

### 1. Bookings Without class_date
**Scenario:** Old bookings created before migration
**Solution:** Backfill query runs automatically in migration

### 2. User Books Same Class Multiple Times
**Scenario:** User books Monday Yoga for Dec 16, then tries to book again
**Solution:** Check must include `class_date` in uniqueness validation

### 3. Recurring Class Bookings
**Scenario:** User wants to book same class every Monday
**Solution:** Each Monday has a different `class_date`, so separate bookings

---

## Next Steps

1. **Run the migration:** `add_daily_booking_cleanup.sql`
2. **Verify backfill:** Check that existing bookings have `class_date` set
3. **Update frontend files:** Follow Phase 1 → Phase 2 → Phase 3
4. **Test thoroughly:** Use checklist above
5. **Monitor:** Check `get_cleanup_summary()` daily

---

## Files to Update Summary

| File | Priority | Change Needed |
|------|----------|---------------|
| `src/components/Schedule.tsx` | 🔴 CRITICAL | Filter capacity query |
| `src/pages/ClassSchedule.tsx` | 🔴 CRITICAL | Filter capacity query |
| `src/pages/admin/Schedule.tsx` | 🔴 CRITICAL | Filter capacity query |
| `src/components/BookingDialog.tsx` | 🔴 CRITICAL | Filter existing booking check |
| `src/pages/Dashboard.tsx` | 🟡 HIGH | Show only future bookings |
| `src/pages/admin/Bookings.tsx` | 🟢 MEDIUM | Add status filters |
| `src/pages/admin/Analytics.tsx` | 🟢 LOW | Use completed bookings |
