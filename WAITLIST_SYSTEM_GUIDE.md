# Waitlist System Implementation Guide

## Overview

The waitlist system allows members to join a queue when a class is full. When a spot becomes available, the next person on the waitlist is automatically notified and given 24 hours to book the class.

---

## ✅ What's Implemented

### 1. Database Layer
**File:** `create_waitlist_system.sql`

**Tables:**
- `waitlist` - Stores waitlist entries with position tracking
  - Unique constraint on (schedule_id, user_id)
  - Status: waiting, notified, converted, expired, cancelled
  - Auto-expiration after 24 hours

**Functions:**
- `get_next_waitlist_position(schedule_id)` - Returns next position number
- `update_waitlist_positions()` - Auto-adjusts positions when someone leaves
- `get_waitlist_count(schedule_id)` - Returns total waiting count
- `get_user_waitlist_position(schedule_id, user_id)` - Get user's status
- `process_expired_waitlist_notifications()` - Cleanup function (for cron)

**Triggers:**
- `maintain_waitlist_positions` - Auto-updates positions on DELETE/UPDATE

**RLS Policies:**
- Users can view/manage their own entries
- Admins can view/manage all entries
- Service role has full access (for edge functions)

---

### 2. Edge Function
**File:** `supabase/functions/process-waitlist/index.ts`

**Purpose:** Called when a booking is cancelled to notify next person

**Flow:**
1. Gets first person on waitlist (position = 1, status = 'waiting')
2. Updates their status to 'notified'
3. Sets expires_at to 24 hours from now
4. Creates in-app notification
5. Sends email notification
6. Returns notification count

**Email Template:**
- Dark-themed HTML matching gym branding
- Shows class details
- 24-hour countdown warning
- "Book Now" CTA button
- Expires at timestamp

---

### 3. Frontend Components

#### WaitlistButton Component
**File:** `src/components/WaitlistButton.tsx`

**Features:**
- Shows "Join Waitlist" when class is full
- Displays position when on waitlist (#3 in line)
- Shows "Spot Available!" when notified
- Countdown timer when notification active
- "Leave Waitlist" button
- Real-time status updates

**States:**
- Not on waitlist: Shows "Join Waitlist" button
- Waiting: Shows position badge and "Leave Waitlist"
- Notified: Shows green alert with time remaining + "Leave Waitlist"

#### WaitlistDialog Component
**File:** `src/components/WaitlistDialog.tsx`

**Features:**
- Confirmation dialog before joining
- Shows estimated position
- Explains notification process
- 24-hour booking window warning
- Terms and conditions

#### ClassCard Integration
**File:** `src/components/ClassCard.tsx` (Updated)

**Changes:**
- Added `scheduleId`, `dayOfWeek`, `onWaitlistChange` props
- Integrated WaitlistButton component
- Shows waitlist button below "BOOK NOW" button
- Appears when class is full OR user is on waitlist

---

## 🔄 User Flows

### Flow 1: Member Joins Waitlist

**Scenario:** Class is full, member wants to join waitlist

1. Member sees "CLASS FULL" button (disabled)
2. Below it, sees "Join Waitlist" button with count (e.g., "5 waiting")
3. Clicks "Join Waitlist"
4. WaitlistDialog appears showing:
   - Class info
   - Estimated position (#6 in line)
   - How notifications work
   - 24-hour booking window warning
5. Member clicks "Join Waitlist" to confirm
6. Success toast: "Added to Waitlist! You're #6 in line."
7. In-app notification created
8. Button changes to show position badge

**Database:**
```sql
INSERT INTO waitlist (schedule_id, user_id, position, status)
VALUES ('uuid', 'user-uuid', 6, 'waiting');
```

---

### Flow 2: Spot Becomes Available

**Scenario:** Another member cancels, spot opens up

1. Member cancels their booking
2. System calls edge function: `process-waitlist`
3. Edge function:
   - Finds first person (position = 1)
   - Updates status to 'notified'
   - Sets expires_at to 24 hours from now
   - Creates notification
   - Sends email

**Member sees:**
- In-app notification: "Waitlist Update: Spot Available!"
- Email with subject: "Spot Available: Yoga on Monday"
- WaitlistButton shows green "Spot Available!" alert
- Countdown: "You have 23 hours to book"

**Member Actions:**
- Books class within 24 hours → Status changes to 'converted', removed from waitlist
- Doesn't book → After 24 hours, status changes to 'expired', next person notified

**Database:**
```sql
UPDATE waitlist
SET status = 'notified',
    notified_at = NOW(),
    expires_at = NOW() + INTERVAL '24 hours'
WHERE id = 'waitlist-entry-uuid';
```

---

### Flow 3: Member Leaves Waitlist

**Scenario:** Member no longer wants to wait

1. Member sees waitlist badge showing position
2. Clicks "Leave Waitlist" button
3. Confirmation (implicit in button action)
4. Success toast: "Removed from Waitlist"
5. Entry deleted from database
6. All positions behind them shift up by 1

**Database:**
```sql
DELETE FROM waitlist
WHERE id = 'waitlist-entry-uuid';

-- Trigger automatically updates positions:
UPDATE waitlist
SET position = position - 1
WHERE schedule_id = 'schedule-uuid'
  AND position > old_position
  AND status = 'waiting';
```

---

### Flow 4: Notification Expires

**Scenario:** Member was notified but didn't book in 24 hours

1. 24 hours pass since notification
2. Cron job runs: `process_expired_waitlist_notifications()`
3. Status changes from 'notified' to 'expired'
4. Position relinquished, next person gets notified
5. Member can re-join waitlist if they want

**Database:**
```sql
UPDATE waitlist
SET status = 'expired'
WHERE status = 'notified'
  AND expires_at < NOW();
```

---

## 📊 Database Schema

### Waitlist Table

```sql
CREATE TABLE public.waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES schedule(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  position integer NOT NULL,
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'notified', 'converted', 'expired', 'cancelled')),
  notified_at timestamp with time zone,
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT unique_waitlist_entry UNIQUE (schedule_id, user_id)
);
```

### Status Values

| Status | Meaning | Next Action |
|--------|---------|-------------|
| `waiting` | In queue, waiting for spot | Wait for notification |
| `notified` | Spot available, 24-hour window active | Book or lose spot |
| `converted` | Successfully booked the class | Remove from waitlist |
| `expired` | Didn't book within 24 hours | Next person notified |
| `cancelled` | Manually left waitlist | Removed |

---

## 🔌 Integration Points

### When to Call Edge Function

The edge function should be called whenever a booking is cancelled:

**File:** `src/components/BookingDialog.tsx` or cancellation logic

```typescript
// After successfully cancelling a booking
const response = await fetch(`${SUPABASE_URL}/functions/v1/process-waitlist`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session?.access_token}`,
  },
  body: JSON.stringify({
    schedule_id: booking.schedule_id,
    class_name: booking.schedule.classes.name,
    day_of_week: booking.schedule.day_of_week,
    start_time: booking.schedule.start_time,
    end_time: booking.schedule.end_time,
  }),
});

const result = await response.json();
console.log(`Waitlist processed: ${result.notified_count} member(s) notified`);
```

### Passing Props to ClassCard

Update all places where ClassCard is used to pass waitlist-related props:

```typescript
<ClassCard
  name={schedule.classes?.name}
  instructor={schedule.instructors?.name}
  time={schedule.start_time}
  // ... other props
  isFull={isFull}
  scheduleId={schedule.id}        // ← Add this
  dayOfWeek={schedule.day_of_week} // ← Add this
  onWaitlistChange={fetchSchedule}  // ← Add this to refresh data
/>
```

---

## 📱 UI Components Usage

### Using WaitlistButton Standalone

```typescript
import { WaitlistButton } from "@/components/WaitlistButton";

<WaitlistButton
  scheduleId="uuid-here"
  className="Yoga"
  classTime="9:00 AM"
  dayOfWeek="Monday"
  isFull={true}
  onWaitlistChange={() => {
    // Callback to refresh data
    fetchSchedule();
  }}
/>
```

### Component Props

```typescript
interface WaitlistButtonProps {
  scheduleId: string;        // UUID of the schedule
  className: string;         // Name of the class (e.g., "Yoga")
  classTime: string;        // Time display (e.g., "9:00 AM")
  dayOfWeek: string;        // Day name (e.g., "Monday")
  isFull: boolean;          // Whether class is at capacity
  onWaitlistChange?: () => void; // Optional callback when waitlist changes
}
```

---

## 🚀 Deployment Steps

### Step 1: Run Database Migration

```bash
# In Supabase SQL Editor, run:
# create_waitlist_system.sql
```

Or via CLI:
```bash
psql -h db.xxx.supabase.co -U postgres -d postgres -f create_waitlist_system.sql
```

### Step 2: Deploy Edge Function

```bash
supabase functions deploy process-waitlist
```

### Step 3: Set Environment Variables

The edge function uses these secrets (already configured):
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GMAIL_USER`
- `GMAIL_APP_PASSWORD`

### Step 4: Enable Realtime (Optional)

For real-time waitlist updates:

1. Go to Supabase Dashboard → Database → Replication
2. Find `waitlist` table
3. Enable "Realtime" toggle
4. Save changes

### Step 5: Setup Cron Job (Optional)

For auto-expiring notifications, setup a cron job to call:

```sql
SELECT process_expired_waitlist_notifications();
```

**Using Supabase Edge Functions:**
Create a cron function that runs every hour.

---

## 🧪 Testing

### Test 1: Join Waitlist

1. Book a class until it's full (reach max_capacity)
2. Try to book as another user
3. Should see "Join Waitlist" button
4. Click and confirm
5. Verify position shows correctly
6. Check database: `SELECT * FROM waitlist WHERE schedule_id = 'uuid';`

### Test 2: Notification Flow

1. Have user on waitlist (position = 1)
2. Cancel a booking for that class
3. Edge function should trigger
4. Check user's email for notification
5. Check in-app notifications
6. Verify waitlist status changed to 'notified'
7. Verify expires_at is set to 24 hours from now

### Test 3: Leave Waitlist

1. Join waitlist
2. Click "Leave Waitlist"
3. Verify removed from database
4. Check positions adjusted for others

### Test 4: Expiration

1. Manually set expires_at to past time
2. Run: `SELECT process_expired_waitlist_notifications();`
3. Verify status changes to 'expired'
4. Next person should get notified

---

## 🐛 Troubleshooting

### Waitlist Button Not Showing

**Check:**
- Is `scheduleId` prop passed to ClassCard?
- Is `dayOfWeek` prop passed to ClassCard?
- Is class actually full (`isFull = true`)?

### Position Not Updating

**Cause:** Trigger not firing or RLS blocking update

**Fix:**
```sql
-- Verify trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'maintain_waitlist_positions';

-- Test manually
DELETE FROM waitlist WHERE id = 'uuid';
-- Check if positions updated
SELECT * FROM waitlist ORDER BY position;
```

### Edge Function Not Working

**Check Logs:**
```bash
supabase functions logs process-waitlist
```

**Common Issues:**
- Missing environment variables
- Invalid schedule_id passed
- No one on waitlist (not an error, expected)
- Email sending failed (check Gmail credentials)

### Notifications Not Appearing

**Check:**
- Is notification type added to constraints?
- Run migration to update notification types
- Check RLS policies on notifications table

---

## 📈 Future Enhancements

### Short-term:
- [ ] Real-time position updates (using Supabase Realtime)
- [ ] SMS notifications (using Twilio)
- [ ] Waitlist analytics dashboard
- [ ] Priority waitlist for VIP members

### Long-term:
- [ ] Predictive waitlist (estimate wait time based on historical data)
- [ ] Auto-book option (automatically book when notified)
- [ ] Waitlist for specific instructor preferences
- [ ] Group waitlist (book multiple spots together)

---

## 📝 Notes

- Waitlist entries are automatically deleted when class is cancelled
- One user can only be on waitlist once per class (unique constraint)
- Position numbers are 1-indexed (1 = first in line)
- Expired notifications don't auto-process; requires cron job
- Email failures don't block the waitlist process

---

**Implementation Date:** November 27, 2025
**Version:** 1.0
**Status:** Ready for Testing
