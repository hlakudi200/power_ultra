# Member Notifications System Guide

## Overview

Complete notification system for informing members about class cancellations and other important events.

## What's Implemented

### ✅ 1. In-App Notifications
**Location:** `src/components/NotificationBell.tsx`

**Features:**
- 🔔 Bell icon in navigation bar
- 🔴 Red badge showing unread count
- 📋 Dropdown panel with notification list
- ✅ Mark individual notifications as read
- ✅ Mark all as read
- 🗑️ Delete individual notifications
- 🔄 Real-time updates (new notifications appear instantly)
- 📱 Responsive design

**Notification Types:**
- ❌ `class_cancelled` - When a booked class is cancelled
- 📅 `class_rescheduled` - When a class time changes
- ✅ `booking_confirmed` - When booking is successful
- ⚠️ `membership_expiring` - Membership expiration warning
- 📢 `general` - General announcements

### ✅ 2. Edge Function Integration
**Location:** `supabase/functions/notify-class-cancellation/index.ts`

When admin cancels a class:
1. Finds all members with active bookings
2. Creates in-app notification for each member
3. Returns count of notified members
4. Admin sees: "X member(s) have been notified"

### ✅ 3. Email Notifications
**Location:** `supabase/functions/notify-class-cancellation/index.ts`

**Features:**
- ✅ Automatically sends emails to all members with bookings
- ✅ Uses Nodemailer with Gmail SMTP
- ✅ Dark-themed HTML email matching gym branding
- ✅ Includes cancellation reason if provided
- ✅ Tracks email success/failure count
- ✅ Non-blocking (email failures don't prevent cancellation)

## How It Works

### Member Perspective

**When class is cancelled:**
1. Admin cancels class in schedule
2. Edge function:
   - Creates in-app notification
   - Sends email to member
3. **In-App:** Red badge appears on bell icon (e.g., "3")
4. **Email:** Member receives cancellation email
5. Member clicks bell and sees notification:
   ```
   ❌ Class Cancelled
   Yoga on Monday at 9:00 AM has been cancelled.
   Reason: Instructor unavailable
   Nov 27, 2:30 PM
   ```
6. Member can mark as read or delete
7. Badge count decreases

**Real-time Updates:**
- New notifications appear instantly (no page refresh needed)
- Badge count updates automatically
- Uses Supabase Realtime subscriptions

### Admin Perspective

When cancelling a class:
1. Clicks Cancel on schedule item
2. Sees number of affected members: "⚠️ 5 member(s) have booked this class"
3. Enters cancellation reason (optional)
4. Clicks "Cancel Class"
5. System sends both in-app notifications and emails
6. Toast shows: "Class cancelled. 5 member(s) notified (5 email(s) sent)."

## Database Schema

### Notifications Table

```sql
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN (
    'class_cancelled',
    'class_rescheduled',
    'booking_confirmed',
    'membership_expiring',
    'general'
  )),
  title text NOT NULL,
  message text NOT NULL,
  related_id uuid, -- schedule_id, booking_id, etc.
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);
```

### RLS Policies

```sql
-- Users can only see their own notifications
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);

-- Service role can insert notifications
CREATE POLICY "Service role can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');
```

## Code References

### NotificationBell Component
**File:** `src/components/NotificationBell.tsx`

**Key Functions:**

1. **Fetch Notifications** (Lines 45-59)
```typescript
const fetchNotifications = async () => {
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  setNotifications(data);
  setUnreadCount(data.filter(n => !n.is_read).length);
};
```

2. **Real-time Subscription** (Lines 27-43)
```typescript
const subscription = supabase
  .channel('notifications')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notifications',
    filter: `user_id=eq.${session.user.id}`,
  }, (payload) => {
    setNotifications(prev => [payload.new, ...prev]);
    setUnreadCount(prev => prev + 1);
  })
  .subscribe();
```

3. **Mark as Read** (Lines 61-73)
```typescript
const markAsRead = async (notificationId: string) => {
  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId);

  setUnreadCount(prev => Math.max(0, prev - 1));
};
```

### Navigation Integration
**File:** `src/components/Navigation.tsx`

Bell icon added to logged-in user section (Line 78):
```typescript
<NotificationBell />
<span>{displayName}</span>
<Button>Logout</Button>
```

## Setup Instructions

### 1. Database Migration

Run the SQL migration:
```bash
# File: create_notifications_table.sql
```

Or in Supabase SQL Editor:
```sql
-- Copy contents of create_notifications_table.sql
```

### 2. Enable Realtime

In Supabase Dashboard:
1. Go to Database → Replication
2. Find `notifications` table
3. Enable "Realtime" toggle
4. Save changes

### 3. Deploy Edge Function

```bash
supabase functions deploy notify-class-cancellation
```

### 4. Grant RLS Policies

The migration already includes RLS policies. Verify in Supabase:
1. Go to Authentication → Policies
2. Check `notifications` table has 4 policies
3. Ensure they're enabled

## Testing

### Test In-App Notifications

1. **As Admin:**
   - Go to `/admin/schedule`
   - Create a test class
   - As member, book the class
   - As admin, cancel the class with reason
   - Check admin sees: "1 member(s) have been notified"

2. **As Member:**
   - Check bell icon shows red badge "1"
   - Click bell icon
   - See cancellation notification
   - Click checkmark to mark as read
   - Badge disappears

3. **Real-time Test:**
   - Keep member dashboard open
   - In another tab/browser as admin, cancel a booked class
   - Watch bell icon update in real-time (no refresh needed)

### Test Database

```sql
-- Check notifications were created
SELECT * FROM notifications ORDER BY created_at DESC LIMIT 5;

-- Check unread count for user
SELECT COUNT(*) FROM notifications
WHERE user_id = 'user-uuid-here' AND is_read = false;

-- Manually create test notification
INSERT INTO notifications (user_id, type, title, message)
VALUES (
  'user-uuid-here',
  'general',
  'Test Notification',
  'This is a test message'
);
```

## Email Configuration

Email notifications are implemented using **Nodemailer with Gmail SMTP**.

### Prerequisites

The system requires these environment variables to be set in Supabase:
- `GMAIL_USER` - Your Gmail email address
- `GMAIL_APP_PASSWORD` - Gmail App Password (not regular password)

### Setting Up Gmail App Password

1. Go to your Google Account settings
2. Navigate to Security → 2-Step Verification (must be enabled)
3. Scroll to "App passwords"
4. Generate a new app password for "Mail"
5. Copy the 16-character password

### Set Environment Variables

```bash
# Set secrets in Supabase
supabase secrets set GMAIL_USER=your-email@gmail.com
supabase secrets set GMAIL_APP_PASSWORD=your-16-char-password
```

### Email Template

The cancellation email includes:
- **Subject:** `Class Cancelled: {ClassName} on {DayOfWeek}`
- **Dark theme** matching gym branding (#121212 background, #E53E3E accent)
- **Personalized greeting** using member's first name
- **Class details card** with name, day, and time
- **Cancellation reason** (if provided) in highlighted box
- **Apology message** and reassurance about no charges
- **Power Ultra Gym branding** with logo and footer

### Email Delivery

- Emails are sent **after** in-app notifications are created
- Email failures **do not block** the cancellation process
- Admin sees count of successful emails: "5 member(s) notified (5 email(s) sent)"
- Failed emails are logged to console but don't show user errors

## Troubleshooting

**Notifications not appearing:**
- Check Supabase Realtime is enabled for `notifications` table
- Verify RLS policies are enabled
- Check browser console for errors
- Test with manual INSERT (SQL above)

**Badge count wrong:**
- Clear browser cache
- Check query filters `is_read = false`
- Verify no duplicate subscriptions

**Real-time not working:**
- Check Supabase project is on paid plan (Realtime requires paid plan)
- Verify Realtime is enabled in project settings
- Check browser WebSocket connection

**Edge function not creating notifications:**
- Check function logs: `supabase functions logs notify-class-cancellation`
- Verify service role key has permissions
- Test function manually with curl

**Emails not being sent:**
- Verify `GMAIL_USER` and `GMAIL_APP_PASSWORD` are set in Supabase secrets
- Check Gmail account has 2-Step Verification enabled
- Verify App Password was generated (not regular password)
- Check function logs for email errors
- Test Gmail credentials with a simple test email
- Ensure Gmail account isn't blocking "less secure" apps

## Future Enhancements

1. **Email Digest:**
   - Daily summary of notifications
   - Weekly recap

2. **Push Notifications:**
   - Browser push notifications
   - Mobile app notifications

3. **Notification Preferences:**
   - Let users choose which notifications to receive
   - Email vs in-app preferences
   - Notification timing preferences

4. **SMS Notifications:**
   - Integrate Twilio for urgent notifications
   - Send SMS for class cancellations within 24 hours

5. **Notification History:**
   - Separate page showing all notifications
   - Filter by type, date, read status
   - Search notifications

---

**Implementation Date:** November 27, 2025
**Version:** Phase 2 - Notifications Complete
