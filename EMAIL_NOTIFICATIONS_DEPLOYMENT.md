# Email Notifications Deployment Guide

## Overview

This guide covers deploying the email notification system for class cancellations. When an admin cancels a class, all affected members receive both an in-app notification and an email.

## What's Implemented

### Email Features
- ✅ Automatic email sending when class is cancelled
- ✅ Dark-themed HTML template matching gym branding
- ✅ Personalized with member's first name
- ✅ Includes class details and cancellation reason
- ✅ Non-blocking (email failures don't prevent cancellation)
- ✅ Tracks and reports email success/failure count

### Files Modified
- `supabase/functions/notify-class-cancellation/index.ts` - Added Nodemailer integration
- `src/pages/admin/Schedule.tsx` - Updated to show email statistics in toast
- `NOTIFICATIONS_GUIDE.md` - Updated with email configuration details

## Prerequisites

### 1. Gmail Account Setup

You need a Gmail account with an App Password generated:

1. **Enable 2-Step Verification:**
   - Go to https://myaccount.google.com/security
   - Click "2-Step Verification"
   - Follow prompts to enable it

2. **Generate App Password:**
   - Stay on Security page
   - Scroll to "App passwords"
   - Select app: "Mail"
   - Select device: "Other" (enter "Power Ultra Gym")
   - Click "Generate"
   - **Copy the 16-character password** (spaces don't matter)

### 2. Supabase CLI

Ensure you have Supabase CLI installed and project linked:
```bash
supabase --version
supabase projects list
```

## Deployment Steps

### Step 1: Set Environment Variables

Set the Gmail credentials in Supabase:

```bash
# Replace with your actual Gmail and App Password
supabase secrets set GMAIL_USER=your-email@gmail.com
supabase secrets set GMAIL_APP_PASSWORD=abcd-efgh-ijkl-mnop
```

**Important:** Use the 16-character App Password, NOT your regular Gmail password.

### Step 2: Deploy Edge Function

Deploy the updated edge function:

```bash
supabase functions deploy notify-class-cancellation
```

Expected output:
```
Deploying notify-class-cancellation (project ref: your-project-ref)
Bundled notify-class-cancellation (1.2 kB)
Deployed notify-class-cancellation
```

### Step 3: Verify Deployment

Check the function logs to ensure it deployed correctly:

```bash
supabase functions logs notify-class-cancellation
```

## Testing

### Test 1: Manual Edge Function Test

Create a test notification with curl:

```bash
curl -i --location --request POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/notify-class-cancellation' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "schedule_id": "test-uuid",
    "class_name": "Test Yoga",
    "day_of_week": "Monday",
    "start_time": "09:00",
    "end_time": "10:00",
    "cancellation_reason": "Testing email system"
  }'
```

**Note:** This will fail if there are no actual bookings for the test UUID, but you'll see any authentication/configuration errors.

### Test 2: End-to-End Test

1. **As Admin:**
   - Navigate to `/admin/schedule`
   - Create a test class (any day/time)

2. **As Member:**
   - Log in with a test member account
   - Book the test class
   - Check that booking appears in dashboard

3. **As Admin:**
   - Cancel the test class
   - Add reason: "Testing email notifications"
   - Confirm cancellation
   - **Check toast message** shows: "1 member(s) notified (1 email(s) sent)"

4. **As Member:**
   - Check email inbox for cancellation email
   - Verify email has:
     - Subject: "Class Cancelled: Test Yoga on {Day}"
     - Dark theme with red accent
     - Class details
     - Cancellation reason
     - Power Ultra Gym branding
   - Check in-app notification bell icon shows badge
   - Click bell and verify notification appears

### Test 3: Check Function Logs

Monitor the edge function logs during testing:

```bash
supabase functions logs notify-class-cancellation --tail
```

Look for:
- ✅ `Notifications sent successfully`
- ✅ `emails_sent: 1`
- ✅ No email errors

## Email Template Preview

```
┌────────────────────────────────────┐
│      [Power Ultra Gym Logo]        │
├────────────────────────────────────┤
│ Class Cancellation Notice          │ <- Red heading
│                                    │
│ Dear John,                         │
│                                    │
│ We regret to inform you that       │
│ the following class has been       │
│ cancelled:                         │
│                                    │
│ ┌────────────────────────────────┐ │
│ │      Yoga                      │ │
│ │   Monday at 9:00 AM            │ │
│ └────────────────────────────────┘ │
│                                    │
│ ┌─ Reason: Instructor unavailable │ <- Highlighted box
│                                    │
│ We sincerely apologize for any     │
│ inconvenience this may cause.      │
│                                    │
│ Please check our schedule for      │
│ other available classes.           │
│                                    │
│ Best regards,                      │
│ The Power Ultra Gym Team           │
├────────────────────────────────────┤
│     Power Ultra Gym                │
│     © 2025 All rights reserved     │
└────────────────────────────────────┘
```

## Troubleshooting

### Issue: Emails Not Being Sent

**Check 1: Verify Environment Variables**
```bash
# This will show if variables are set (but not their values)
supabase secrets list
```

Should show:
- `GMAIL_USER`
- `GMAIL_APP_PASSWORD`

**Check 2: Function Logs**
```bash
supabase functions logs notify-class-cancellation
```

Look for errors like:
- `Invalid login` - Wrong email or password
- `Authentication failed` - Need to use App Password, not regular password
- `Connection timeout` - Network/firewall issue

**Check 3: Gmail Settings**
- Ensure 2-Step Verification is enabled
- Verify App Password was generated correctly (not regular password)
- Check Gmail account isn't suspended or locked

**Check 4: Test Gmail Credentials**

You can test the credentials by temporarily modifying the edge function to send a test email, or use an online SMTP tester.

### Issue: Admin Doesn't See Email Count

**Check 1: Response Parsing**

Look at browser console when cancelling a class. You should see the fetch response with:
```json
{
  "message": "Notifications sent successfully",
  "notified_count": 5,
  "emails_sent": 5,
  "emails_failed": 0
}
```

**Check 2: Toast Message**

If the edge function succeeds but toast doesn't show count, check `src/pages/admin/Schedule.tsx` lines 488-492.

### Issue: Emails Going to Spam

**Solutions:**
1. **Add to Safe Senders:** Ask members to add gym email to contacts
2. **SPF Records:** Configure SPF for your domain (if using custom domain)
3. **DKIM Signing:** Enable DKIM in Gmail settings
4. **Use Business Email:** Consider using Google Workspace instead of regular Gmail

### Issue: Rate Limiting

Gmail has sending limits:
- **Free Gmail:** ~500 emails/day
- **Google Workspace:** ~2,000 emails/day

**Solutions:**
1. Monitor daily sending volume
2. Upgrade to Google Workspace if needed
3. Consider using dedicated email service (SendGrid, Resend) for high volume

## Monitoring

### Daily Checks

1. **Function Logs:**
   ```bash
   supabase functions logs notify-class-cancellation --limit 50
   ```

2. **Email Statistics:**
   - Track emails_sent vs emails_failed
   - Monitor for patterns in failures

3. **Member Feedback:**
   - Ask members if they're receiving cancellation emails
   - Check spam folder reports

### Weekly Review

1. **Email Delivery Rate:**
   - Calculate: `emails_sent / notified_count`
   - Target: >95%

2. **Common Errors:**
   - Review function logs for recurring issues
   - Address authentication or configuration problems

## Alternative Email Services

If Gmail doesn't meet your needs, consider these alternatives:

### Resend (Recommended for High Volume)

**Pros:**
- Higher sending limits
- Better deliverability
- Developer-friendly API
- Dedicated IP options

**Setup:**
```typescript
// Replace Nodemailer with Resend
import { Resend } from 'npm:resend'

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

await resend.emails.send({
  from: 'Power Ultra Gym <notifications@yourdomain.com>',
  to: profile.email,
  subject: `Class Cancelled: ${class_name}`,
  html: emailTemplate
})
```

### SendGrid

**Pros:**
- Very high limits
- Advanced analytics
- Email validation
- Template management

**Setup:** Similar to Resend, use SendGrid SDK

## Security Best Practices

1. **Never Commit Secrets:**
   - ✅ Use `supabase secrets set`
   - ❌ Don't put credentials in code or .env files

2. **Rotate Passwords:**
   - Regenerate Gmail App Password every 6 months
   - Update in Supabase secrets immediately

3. **Monitor Access:**
   - Check Gmail "Recent security activity"
   - Look for suspicious login locations

4. **Limit Permissions:**
   - Service account should only have email sending permission
   - Don't use personal Gmail for this

## Maintenance

### Monthly Tasks

- [ ] Review function logs for errors
- [ ] Check email delivery rate
- [ ] Verify Gmail account is active
- [ ] Update any email template improvements

### Quarterly Tasks

- [ ] Review and optimize email content
- [ ] A/B test subject lines
- [ ] Survey members about notification preferences
- [ ] Consider adding email digest option

### Yearly Tasks

- [ ] Rotate Gmail App Password
- [ ] Review email service provider options
- [ ] Audit notification system performance
- [ ] Update branding/design if needed

---

**Deployment Date:** November 27, 2025
**Version:** Email Notifications v1.0
**Status:** Production Ready
