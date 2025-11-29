# Edge Function Fix - queue_position Column

## Problem

The edge function `process-waitlist` was looking for a column named `position`, but we renamed it to `queue_position` to avoid PostgreSQL reserved keyword conflicts.

This caused the edge function to return:
```json
{
  "message": "No one on waitlist",
  "notified_count": 0
}
```

Even when there were users on the waitlist in the database.

## What Was Fixed

**File:** `supabase/functions/process-waitlist/index.ts`

**Changed:**
- Line 54: `position` → `queue_position` (in SELECT)
- Line 64: `.eq('position', 1)` → `.eq('queue_position', 1)` (in WHERE clause)

**Before:**
```typescript
.select(`
  id,
  user_id,
  position,  // ❌ Wrong - column doesn't exist
  profiles:user_id (...)
`)
.eq('schedule_id', schedule_id)
.eq('status', 'waiting')
.eq('position', 1)  // ❌ Wrong - column doesn't exist
.single()
```

**After:**
```typescript
.select(`
  id,
  user_id,
  queue_position,  // ✅ Correct column name
  profiles:user_id (...)
`)
.eq('schedule_id', schedule_id)
.eq('status', 'waiting')
.eq('queue_position', 1)  // ✅ Correct column name
.single()
```

## How to Deploy the Fix

### Step 1: Navigate to Project Directory
```bash
cd power-ultra-gym-site-main
```

### Step 2: Deploy the Updated Edge Function
```bash
supabase functions deploy process-waitlist
```

### Step 3: Verify Deployment
```bash
# List all functions to confirm it's deployed
supabase functions list

# Check the logs
supabase functions logs process-waitlist
```

## Testing After Deployment

### Test 1: Check Database
First, verify you have a user on the waitlist:
```sql
SELECT
  id,
  user_id,
  queue_position,
  status,
  schedule_id
FROM waitlist
WHERE status = 'waiting'
ORDER BY queue_position;
```

You should see at least one entry with `queue_position = 1` and `status = 'waiting'`.

### Test 2: Cancel a Booking
1. Go to your Dashboard
2. Cancel a booking for the class that has someone on the waitlist
3. Check the browser console - you should see:
   ```
   Waitlist processed: 1 member(s) notified
   ```

### Test 3: Verify Edge Function Worked
Check the database again:
```sql
SELECT
  id,
  user_id,
  queue_position,
  status,
  notified_at,
  expires_at
FROM waitlist
WHERE queue_position = 1
ORDER BY created_at DESC
LIMIT 1;
```

The first person should now have:
- `status = 'notified'`
- `notified_at` = current timestamp
- `expires_at` = 24 hours from now

### Test 4: Check Notifications
```sql
SELECT
  id,
  user_id,
  type,
  title,
  message,
  created_at
FROM notifications
WHERE type = 'waitlist_spot_available'
ORDER BY created_at DESC
LIMIT 1;
```

You should see a notification created for the user.

### Test 5: Check Edge Function Logs
```bash
supabase functions logs process-waitlist --tail
```

Then cancel a booking and watch the logs in real-time. You should see:
```
Processing waitlist for schedule: [schedule_id]
Updated waitlist entry [id] to notified status
Created in-app notification
Sent email to [user_email]
```

## Expected Response After Fix

When a booking is cancelled and there's someone on the waitlist, you should get:

```json
{
  "message": "Waitlist processed successfully",
  "notified_count": 1,
  "email_sent": true,
  "member_name": "John Doe",
  "expires_at": "2025-11-28T12:00:00.000Z"
}
```

## Troubleshooting

### Still Getting "No one on waitlist"?

**Check 1: Is the edge function actually deployed?**
```bash
supabase functions list
```

**Check 2: Are you looking at the right schedule?**
The `schedule_id` in the booking cancellation must match the `schedule_id` in the waitlist table.

**Check 3: Is queue_position = 1?**
The edge function only notifies the person at position 1. Check:
```sql
SELECT queue_position, status FROM waitlist WHERE schedule_id = 'YOUR_SCHEDULE_ID';
```

**Check 4: Is status = 'waiting'?**
The edge function only looks for `status = 'waiting'`. If it's already 'notified', it won't be selected.

**Check 5: Check edge function logs for errors**
```bash
supabase functions logs process-waitlist
```

### Edge Function Returns Error

If you get a 500 error, check the logs:
```bash
supabase functions logs process-waitlist --tail
```

Common issues:
- Missing environment variables (GMAIL_USER, GMAIL_APP_PASSWORD)
- Invalid schedule_id
- Profile doesn't exist for user_id

## Summary

✅ **Fixed:** Edge function now uses `queue_position` instead of `position`
✅ **Action Required:** Redeploy edge function with `supabase functions deploy process-waitlist`
✅ **Expected Result:** Waitlist notification will now work when bookings are cancelled

---

**Date:** November 27, 2025
**Status:** Fixed - Ready for Redeployment
