# Class Cancellation & Status Management Guide

## Overview

This guide documents the complete class cancellation system, including member notifications, status indicators, and capacity management.

## Features Implemented

### 1. Admin Class Cancellation
**Location:** `src/pages/admin/Schedule.tsx`

**Features:**
- ✅ Cancel button on each scheduled class
- ✅ Cancellation dialog with reason field
- ✅ Warning when cancelling classes with bookings
- ✅ Automatic member notification via edge function
- ✅ Restore cancelled classes
- ✅ Visual indicators for cancelled status

### 2. Member Notifications
**Location:** `supabase/functions/notify-class-cancellation/index.ts`

**Edge Function Features:**
- ✅ Automatically notifies all members with bookings
- ✅ Creates in-app notifications
- ✅ Includes cancellation reason if provided
- ✅ Returns count of notified members
- ✅ Fails gracefully (doesn't block cancellation if notification fails)

### 3. Member-Facing Status Indicators
**Locations:**
- `src/components/ClassCard.tsx`
- `src/components/Schedule.tsx`
- `src/pages/Dashboard.tsx`

**Features:**
- ✅ Cancelled classes hidden from members
- ✅ "FULL" badge when at capacity
- ✅ "FILLING UP" badge when 80%+ capacity
- ✅ Disabled "Book Now" button for full classes
- ✅ Real-time booking count display (e.g., "15/20")
- ✅ Color-coded capacity indicators

## Database Schema

### Notifications Table

```sql
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('class_cancelled', 'class_rescheduled', 'booking_confirmed', 'membership_expiring', 'general')),
  title text NOT NULL,
  message text NOT NULL,
  related_id uuid, -- References schedule.id, booking.id, etc.
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);
```

### Schedule Table Fields
- `is_cancelled` (boolean) - Whether class is cancelled
- `cancelled_at` (timestamp) - When it was cancelled
- `cancelled_by` (uuid) - Admin who cancelled it
- `cancellation_reason` (text) - Optional reason

## User Flows

### Admin Cancels a Class

1. Admin navigates to `/admin/schedule`
2. Clicks Cancel (XCircle icon) on a scheduled class
3. Dialog appears showing:
   - Class name, day, time
   - Number of affected members (if any)
   - Optional reason field
4. Admin enters reason (optional) and clicks "Cancel Class"
5. System:
   - Updates `schedule.is_cancelled = true`
   - Records `cancelled_at`, `cancelled_by`, `cancellation_reason`
   - Calls edge function to notify members
6. Success toast shows: "Class cancelled. X member(s) have been notified."
7. Class appears with strikethrough and "Cancelled" badge
8. Only Restore and Delete buttons remain

### Member Views Schedule

**Before Booking:**
1. Member visits Dashboard or Schedule page
2. System fetches only active classes (`.eq("is_cancelled", false)`)
3. For each class, booking count is fetched
4. Classes display with status:
   - **Available**: Green button "BOOK NOW", shows "5/20"
   - **Filling Up**: Orange "FILLING UP" badge, shows "17/20"
   - **Full**: Red "FULL" badge, disabled button "CLASS FULL", shows "20/20"
5. Cancelled classes don't appear at all

**After Class is Cancelled:**
1. Member receives in-app notification
2. Notification says: "Yoga on Monday at 9:00 AM has been cancelled. Reason: Instructor unavailable"
3. Class no longer appears in available schedule
4. Booking remains in database but member sees notification

### Admin Restores a Class

1. Admin clicks Restore (RotateCcw icon) on cancelled class
2. Confirms restoration
3. System sets `is_cancelled = false` and clears cancellation fields
4. Class becomes visible to members again
5. Previous bookings remain intact

## Visual Indicators

### ClassCard Component

**Available Class:**
```
┌─────────────────────────────────┐
│ Yoga                            │
│ with John Smith                 │
│ High-energy flow class...       │
│ 9:00 AM  •  15/20  •  60 min   │
│ [        BOOK NOW        ]      │
└─────────────────────────────────┘
```

**Nearly Full Class:**
```
┌─────────────────────────────────┐
│ Yoga  [FILLING UP]              │
│ with John Smith                 │
│ High-energy flow class...       │
│ 9:00 AM  •  17/20  •  60 min   │ <- Orange text
│ [        BOOK NOW        ]      │
└─────────────────────────────────┘
```

**Full Class:**
```
┌─────────────────────────────────┐
│ Yoga  [FULL]                    │
│ with John Smith                 │
│ High-energy flow class...       │
│ 9:00 AM  •  20/20  •  60 min   │ <- Red text
│ [     CLASS FULL     ] (disabled)
└─────────────────────────────────┘
```

**Admin View - Cancelled Class:**
```
┌─────────────────────────────────┐
│ ~~Yoga~~  [Cancelled]           │ <- Strikethrough + badge
│ 9:00 AM - 10:00 AM • with John  │
│ Reason: Instructor unavailable  │ <- Red text
│                    [↻] [🗑]     │ <- Restore & Delete only
└─────────────────────────────────┘
```

## Edge Function Deployment

### Prerequisites
- Supabase CLI installed
- Project linked to Supabase

### Deploy Command
```bash
supabase functions deploy notify-class-cancellation
```

### Environment Variables
The function automatically has access to:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### Testing
```bash
curl -i --location --request POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/notify-class-cancellation' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"schedule_id":"uuid-here","class_name":"Yoga","day_of_week":"Monday","start_time":"09:00","end_time":"10:00","cancellation_reason":"Instructor unavailable"}'
```

## Code References

### Admin Schedule Page
**File:** `src/pages/admin/Schedule.tsx`

**Cancel Function:** Lines 442-498
```typescript
const handleCancelConfirm = async () => {
  // Update schedule
  await supabase.from("schedule").update({
    is_cancelled: true,
    cancelled_at: new Date().toISOString(),
    cancelled_by: session.user.id,
    cancellation_reason: cancellationReason || null,
  });

  // Notify members via edge function
  await fetch(`${SUPABASE_URL}/functions/v1/notify-class-cancellation`, {
    body: JSON.stringify({...})
  });
}
```

### Member Schedule Component
**File:** `src/components/Schedule.tsx`

**Filter Cancelled:** Line 35
```typescript
.eq("is_cancelled", false) // Only show active classes
```

**Fetch Booking Counts:** Lines 41-56
```typescript
const scheduleWithBookings = await Promise.all(
  data.map(async (schedule) => {
    const { count } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("schedule_id", schedule.id)
      .in("status", ["confirmed", "pending"]);
    return { ...schedule, booking_count: count || 0 };
  })
);
```

### ClassCard Component
**File:** `src/components/ClassCard.tsx`

**Full Logic:** Lines 42-52
```typescript
const isFull = (bookingCount || 0) >= (maxCapacity || 20);
const isNearlyFull = (bookingCount / maxCapacity) >= 0.8 && !isFull;
```

**Button State:** Lines 105-111
```typescript
<Button
  onClick={onBook}
  disabled={isFull}
  className="...disabled:opacity-50 disabled:cursor-not-allowed"
>
  {isFull ? "CLASS FULL" : "BOOK NOW"}
</Button>
```

## Error Handling

### Edge Function Errors
- If notification fails, cancellation still succeeds
- Error logged to console but not shown to user
- Admin sees generic success message

### Database Errors
- Cancellation fails if database update fails
- User sees specific error message
- Class remains in original state

### Missing Data
- If booking count fetch fails, assumes 0 bookings
- If max_capacity missing, defaults to 20
- Instructor missing shows "TBA"

## Future Enhancements

### Email Notifications
Currently only in-app notifications are created. To add email:

1. Install email service (e.g., Resend, SendGrid)
2. Update edge function:
```typescript
// After creating notifications
for (const booking of bookings) {
  await sendEmail({
    to: booking.profiles.email,
    subject: `Class Cancelled: ${class_name}`,
    body: `Your ${class_name} class on ${day_of_week}...`
  });
}
```

### SMS Notifications
Similar to email, integrate with Twilio/similar:
```typescript
if (booking.profiles.phone) {
  await sendSMS({
    to: booking.profiles.phone,
    message: `Class cancelled: ${class_name}...`
  });
}
```

### Automatic Refunds
If you charge for classes:
```typescript
// In edge function
const { data: bookingsWithPayments } = await supabase
  .from("bookings")
  .select("*, payments(*)")
  .eq("schedule_id", schedule_id);

for (const booking of bookingsWithPayments) {
  if (booking.payments) {
    await processRefund(booking.payments.id);
  }
}
```

## Testing Checklist

- [ ] Admin can cancel a class with no bookings
- [ ] Admin can cancel a class with bookings
- [ ] Cancellation reason is optional
- [ ] Cancellation reason displays if provided
- [ ] Affected members count shows correctly
- [ ] Notifications are created in database
- [ ] Cancelled class appears with strikethrough in admin view
- [ ] Cancelled class hidden from member view
- [ ] Admin can restore cancelled class
- [ ] Full classes show "FULL" badge
- [ ] Full classes have disabled button
- [ ] Nearly full classes show "FILLING UP" badge
- [ ] Booking count updates in real-time
- [ ] Edge function deploys successfully
- [ ] Edge function handles errors gracefully

## Troubleshooting

**Notifications not being created:**
- Check edge function is deployed
- Verify SUPABASE_URL environment variable
- Check browser console for fetch errors
- Verify service role key has correct permissions

**Cancelled classes still showing to members:**
- Check filter: `.eq("is_cancelled", false)`
- Verify database has `is_cancelled = true`
- Clear browser cache/localStorage

**Booking count not showing:**
- Check booking count fetch in Schedule component
- Verify bookings table has records
- Check status filter includes "confirmed" and "pending"

**Full classes still bookable:**
- Verify `isFull` prop passed to ClassCard
- Check button disabled state
- Verify booking validation on backend

## Migration Required

Run these SQL migrations in order:

1. **Create notifications table:**
```sql
-- Run: create_notifications_table.sql
```

2. **Add RLS policies:**
```sql
-- Already included in create_notifications_table.sql
```

3. **Deploy edge function:**
```bash
supabase functions deploy notify-class-cancellation
```

4. **Test notification:**
```bash
# Use curl command from Testing section above
```

---

**Implementation Date:** November 27, 2025
**Version:** Phase 2 - Class Cancellation Complete
