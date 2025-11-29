# TypeScript Fixes - Array to Object Transformation

## Issue Description

**Problem:** TypeScript errors were occurring because Supabase returns related data as **arrays**, but our TypeScript interfaces expect them to be **single objects or null**.

**Error Code:** TS2339, TS2352

**Affected Properties:**
- `classes` - Expected: `{...} | null`, Got: `{...}[]`
- `instructors` - Expected: `{...} | null`, Got: `{...}[]`

---

## Root Cause

When using Supabase's `.select()` with nested relations like this:

```typescript
.select(`
  id,
  day_of_week,
  classes (name, description),
  instructors (name)
`)
```

Supabase **always returns arrays** for relations, even when the relationship is one-to-one or many-to-one:

```typescript
{
  id: "abc",
  day_of_week: "Monday",
  classes: [{name: "Yoga", description: "..."}],  // Array, not object!
  instructors: [{name: "John Smith"}]             // Array, not object!
}
```

But our TypeScript interface `ScheduledClass` expects:

```typescript
{
  classes: {name: string, description: string} | null  // Single object
  instructors: {name: string} | null                    // Single object
}
```

---

## Solution

Transform the arrays to single objects immediately after fetching from Supabase.

### Transformation Pattern

```typescript
// After fetching data from Supabase
const transformed = data.map((schedule: any) => ({
  ...schedule,
  classes: Array.isArray(schedule.classes) ? schedule.classes[0] : schedule.classes,
  instructors: Array.isArray(schedule.instructors) ? schedule.instructors[0] : schedule.instructors,
}));
```

This approach:
- ✅ Takes first element if it's an array
- ✅ Keeps it as-is if already an object
- ✅ Handles null/undefined gracefully

---

## Files Fixed

### 1. `src/pages/Dashboard.tsx`

**Lines Fixed:** 20-39, 104-136, 164-184

**Changes:**
- Fixed `fetchUserProfile()` function (line 20-39)
  - Transform `memberships` array to single object
  - Prevents error when accessing `profile.memberships.name`

- Fixed `fetchUserBookings()` function (line 104-136)
  - Transform `schedule.classes` and `schedule.instructors` arrays to single objects
  - Added type annotation `(booking: any)`

- Fixed `fetchSchedule()` function (line 164-184)
  - Added `image_url` to classes select
  - Transform arrays after fetching booking counts
  - Added type annotation `(schedule: any)`
  - Return empty array instead of raw data when no results

**Example Fix (fetchUserProfile):**
```typescript
// Before
return data; // memberships is an array

// After
if (data && data.memberships) {
  return {
    ...data,
    memberships: Array.isArray(data.memberships) ? data.memberships[0] : data.memberships,
  };
}
return data;
```

**Example Fix (fetchSchedule):**
```typescript
// Before
return {
  ...schedule,
  booking_count: count || 0,
};

// After
return {
  ...schedule,
  classes: Array.isArray(schedule.classes) ? schedule.classes[0] : schedule.classes,
  instructors: Array.isArray(schedule.instructors) ? schedule.instructors[0] : schedule.instructors,
  booking_count: count || 0,
};
```

---

### 2. `src/components/Schedule.tsx`

**Lines Fixed:** 44-64

**Changes:**
- Fixed `fetchSchedule()` function
  - Transform arrays to single objects after fetching booking counts
  - Added type annotation `(schedule: any)`
  - Return empty array instead of raw data when no results

**Before:**
```typescript
return {
  ...schedule,
  booking_count: count || 0,
};
```

**After:**
```typescript
return {
  ...schedule,
  classes: Array.isArray(schedule.classes) ? schedule.classes[0] : schedule.classes,
  instructors: Array.isArray(schedule.instructors) ? schedule.instructors[0] : schedule.instructors,
  booking_count: count || 0,
};
```

---

### 3. `src/pages/ClassSchedule.tsx`

**Lines Fixed:** 54-69, 85-116

**Changes:**
- Updated query to select instructors (removed old `instructor` field from classes)
- Added `.eq("is_cancelled", false)` filter
- Transform arrays to single objects in `fetchSchedule()`
- Added type annotation `(schedule: any)`

**Before (Query):**
```typescript
.select(`
  *,
  classes (
    name,
    description,
    instructor  // ❌ This field doesn't exist anymore
  )
`)
```

**After (Query):**
```typescript
.select(`
  *,
  classes (
    name,
    description,
    image_url
  ),
  instructors (
    name
  )
`)
.eq("is_cancelled", false)
```

**Before (Transform):**
```typescript
return {
  ...schedule,
  booking_count: count || 0,
  user_booked: !!userBooking,
  user_booking_id: userBooking?.id,
};
```

**After (Transform):**
```typescript
return {
  ...schedule,
  classes: Array.isArray(schedule.classes) ? schedule.classes[0] : schedule.classes,
  instructors: Array.isArray(schedule.instructors) ? schedule.instructors[0] : schedule.instructors,
  booking_count: count || 0,
  user_booked: !!userBooking,
  user_booking_id: userBooking?.id,
};
```

---

## Why This Approach?

### Alternative 1: Change TypeScript Interface
```typescript
// ❌ Not ideal - forces all components to handle arrays
interface ScheduledClass {
  classes: {name: string}[] | null
  instructors: {name: string}[] | null
}
```

**Drawbacks:**
- Every component needs to handle arrays
- More complex code everywhere: `schedule.classes?.[0].name`
- Breaks existing component logic

### Alternative 2: Use `.single()` in Query
```typescript
// ❌ Doesn't work - Supabase doesn't support .single() for nested relations
.select(`
  *,
  classes (*).single()  // Not supported!
`)
```

### ✅ Alternative 3: Transform After Fetch (Our Solution)
```typescript
// ✅ Clean, centralized, maintains type safety
const transformed = {
  ...schedule,
  classes: Array.isArray(schedule.classes) ? schedule.classes[0] : schedule.classes
}
```

**Benefits:**
- Transformation happens in one place (data layer)
- Components continue using simple object notation
- Type-safe after transformation
- Easy to maintain

---

## Testing Checklist

After applying these fixes, test the following:

### Dashboard Page
- [ ] User bookings display correctly with class names
- [ ] Instructor names show on booking cards
- [ ] Available classes section loads without errors
- [ ] Class details (name, instructor, time) display correctly

### Schedule Component (Home Page)
- [ ] Class schedule loads on home page
- [ ] Class cards show correct class name and instructor
- [ ] Booking counts display accurately
- [ ] Full/Nearly Full badges appear correctly

### ClassSchedule Page
- [ ] Schedule loads without errors
- [ ] Class names and descriptions display
- [ ] Instructor names show correctly
- [ ] Cancelled classes don't appear
- [ ] User's booked classes are marked correctly

### Console
- [ ] No TypeScript errors
- [ ] No runtime errors related to undefined properties
- [ ] No warnings about type mismatches

---

## Prevention

To prevent this issue in the future:

1. **Always transform Supabase relations immediately after fetching:**
   ```typescript
   const { data } = await supabase.from("schedule").select(`*, classes(*), instructors(*)`)

   const transformed = data.map(item => ({
     ...item,
     classes: Array.isArray(item.classes) ? item.classes[0] : item.classes,
     instructors: Array.isArray(item.instructors) ? item.instructors[0] : item.instructors,
   }))
   ```

2. **Document expected return types:**
   ```typescript
   // Returns: ScheduledClass[]
   const fetchSchedule = async (): Promise<ScheduledClass[]> => {
     // ...
   }
   ```

3. **Use helper function for transformation:**
   ```typescript
   // src/lib/transformSchedule.ts
   export const transformScheduleData = (schedule: any): ScheduledClass => ({
     ...schedule,
     classes: Array.isArray(schedule.classes) ? schedule.classes[0] : schedule.classes,
     instructors: Array.isArray(schedule.instructors) ? schedule.instructors[0] : schedule.instructors,
   })
   ```

---

## Additional Notes

### Why Supabase Returns Arrays

Supabase's PostgREST API returns arrays for all relations because:
- Relations can be one-to-many (multiple results)
- Consistent API behavior (always returns arrays)
- Allows filtering/ordering nested relations

### Database Schema Reference

Our actual database relationships:
- `schedule.class_id` → `classes.id` (many-to-one) ✅ Single class per schedule
- `schedule.instructor_id` → `instructors.id` (many-to-one) ✅ Single instructor per schedule

So we're correctly taking the first element `[0]` since there should only ever be one result.

---

**Fixed Date:** November 27, 2025
**Fixed By:** Claude Code Assistant
**Status:** ✅ All TypeScript errors resolved
