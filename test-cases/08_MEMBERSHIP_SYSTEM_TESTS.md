# Membership System Test Cases

## Overview
Comprehensive test cases for the membership system including inquiries, activation codes, admin quick-activate, expiry notifications, and membership-based access control.

---

## System Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                    MEMBERSHIP WORKFLOW                          │
└─────────────────────────────────────────────────────────────────┘

1. User Journey:
   User Inquiry → External Payment → Activation → Active Membership → Expiry Warning → Renewal

2. Admin Journey:
   Receive Payment → Quick Activate OR Generate Code → User Activated → Monitor Expiries

3. Automated Journey:
   Daily Cron → Check Expiries → Send Notifications → Log Results
```

---

## Test Coverage Areas

1. **Membership Inquiry** (TC-MEM-001 to TC-MEM-005)
2. **Activation Codes** (TC-MEM-006 to TC-MEM-015)
3. **Admin Quick-Activate** (TC-MEM-016 to TC-MEM-025)
4. **Expiry Notifications** (TC-MEM-026 to TC-MEM-033)
5. **Access Control** (TC-MEM-034 to TC-MEM-040)
6. **Database Functions** (TC-MEM-041 to TC-MEM-050)

---

# 1. MEMBERSHIP INQUIRY TESTS

## TC-MEM-001: Submit Membership Inquiry - Success
**Priority:** High
**Type:** Functional

### Preconditions
- User is on the home page or memberships page
- User may or may not be logged in

### Test Steps
1. Navigate to membership plans section
2. Click "Join Now" button on any plan
3. Fill in inquiry form:
   - Name: "John Doe"
   - Email: "john.doe@example.com"
   - Phone: "0123456789"
   - Plan: "Basic Membership"
4. Click "Submit Inquiry" button

### Expected Results
- Form validates successfully
- Success toast: "Inquiry Sent! Thank you! We will get in touch with you shortly."
- Dialog closes
- Inquiry saved to `membership_inquiries` table with status 'new'
- Email sent to user (confirmation)
- Email sent to gym staff (notification)

### Test Data
```
Name: John Doe
Email: john.doe@example.com
Phone: 0123456789
Plan: Basic Membership
```

---

## TC-MEM-002: Submit Inquiry - Missing Required Fields
**Priority:** High
**Type:** Negative

### Test Steps
1. Open membership inquiry dialog
2. Leave name or email blank
3. Click "Submit Inquiry"

### Expected Results
- Validation error appears
- Toast: "Missing Information - Please enter your name and email."
- Form does not submit
- User remains on dialog

### Test Data
```
Name: (empty)
Email: (empty)
Phone: 0123456789
```

---

## TC-MEM-003: Submit Inquiry - Invalid Email Format
**Priority:** Medium
**Type:** Negative

### Test Steps
1. Open membership inquiry dialog
2. Enter invalid email format
3. Click "Submit Inquiry"

### Expected Results
- Email field validation error
- Form does not submit
- Error message displayed

### Test Data
```
Name: John Doe
Email: invalid-email
Phone: 0123456789
```

---

## TC-MEM-004: Inquiry Auto-Fill for Logged-In Users
**Priority:** Medium
**Type:** Functional

### Preconditions
- User is logged in
- User profile has name, email, phone

### Test Steps
1. Log in as member
2. Open membership inquiry dialog

### Expected Results
- Name field auto-filled from user profile
- Email field auto-filled from user email
- Phone field auto-filled from user metadata
- `user_id` linked to inquiry record

---

## TC-MEM-005: Admin View Membership Inquiries
**Priority:** Medium
**Type:** Functional

### Preconditions
- User is logged in as admin
- Inquiries exist in database

### Test Steps
1. Log in as admin
2. Navigate to admin dashboard
3. Check for inquiries section or notification

### Expected Results
- Pending inquiries visible
- Shows inquiry count
- Can view inquiry details (name, email, phone, plan)
- Can change status (new → contacted → converted/rejected)

---

# 2. ACTIVATION CODE TESTS

## TC-MEM-006: Generate Activation Code - Admin Success
**Priority:** High
**Type:** Functional

### Preconditions
- User is logged in as admin
- Membership plans exist

### Test Steps
1. Log in as admin
2. Run SQL function:
```sql
SELECT * FROM generate_activation_code(
  p_membership_id := 'uuid-of-basic-plan',
  p_duration_months := 3,
  p_expires_in_days := 30,
  p_notes := 'Paid R899 via EFT',
  p_external_reference := 'EFT-2024-12-10-001'
);
```

### Expected Results
- Code generated in format: `PUGS-XXXX-XXXX-XXXX`
- Code is unique (not duplicate)
- Stored in `membership_activation_codes` table
- Status: 'active'
- `created_by` = admin user ID
- `expires_at` = 30 days from now
- Returns: code, expires_at, membership_name

### Test Data
```sql
membership_id: (UUID of Basic Membership)
duration_months: 3
expires_in_days: 30
notes: "Paid R899 via EFT on 2024-12-10"
external_reference: "EFT-2024-12-10-001"
```

---

## TC-MEM-007: Generate Code - Invalid Membership ID
**Priority:** High
**Type:** Negative

### Test Steps
1. Attempt to generate code with non-existent membership ID
```sql
SELECT * FROM generate_activation_code(
  p_membership_id := '00000000-0000-0000-0000-000000000000'
);
```

### Expected Results
- Error: "Membership plan not found"
- No code created
- Transaction rolled back

---

## TC-MEM-008: Generate Code - Non-Admin User
**Priority:** High
**Type:** Security

### Preconditions
- User is logged in as regular member (not admin)

### Test Steps
1. Regular member attempts to generate code
```sql
SELECT * FROM generate_activation_code(p_membership_id := 'uuid');
```

### Expected Results
- RLS policy blocks access
- Error: Permission denied or similar
- No code created

---

## TC-MEM-009: Redeem Activation Code - Success
**Priority:** High
**Type:** Functional

### Preconditions
- Valid activation code exists
- Code status is 'active'
- Code not expired
- User is logged in

### Test Steps
1. Log in as member
2. Navigate to activation page (or run function)
3. Enter activation code: `PUGS-A1B2-C3D4-E5F6`
```sql
SELECT * FROM redeem_activation_code('PUGS-A1B2-C3D4-E5F6');
```

### Expected Results
- Code validated successfully
- Returns: `success: true, message: "Membership activated successfully!", membership_name, new_expiry_date`
- User's `membership_expiry_date` updated
- User's `current_membership_id` set
- Code status changed to 'used'
- Code `used_by` = user ID
- Code `used_at` = current timestamp
- If user had active membership, extends from current expiry
- If no active membership, starts from today

### Test Data
```
Code: PUGS-A1B2-C3D4-E5F6
User: test@example.com
Current expiry: None
Expected new expiry: Today + 3 months
```

---

## TC-MEM-010: Redeem Code - Already Used
**Priority:** High
**Type:** Negative

### Preconditions
- Code already redeemed (status = 'used')

### Test Steps
1. Attempt to redeem already-used code
```sql
SELECT * FROM redeem_activation_code('PUGS-USED-CODE-1234');
```

### Expected Results
- Returns: `success: false, message: "This code has already been used"`
- User membership not updated
- Code status remains 'used'

---

## TC-MEM-011: Redeem Code - Expired
**Priority:** High
**Type:** Negative

### Preconditions
- Code exists but `expires_at` < now()

### Test Steps
1. Attempt to redeem expired code
```sql
SELECT * FROM redeem_activation_code('PUGS-EXPIRED-CODE');
```

### Expected Results
- Code marked as 'expired'
- Returns: `success: false, message: "This code has expired"`
- User membership not updated

---

## TC-MEM-012: Redeem Code - Invalid Code
**Priority:** High
**Type:** Negative

### Test Steps
1. Attempt to redeem non-existent code
```sql
SELECT * FROM redeem_activation_code('INVALID-CODE-XXXX');
```

### Expected Results
- Returns: `success: false, message: "Invalid activation code"`
- No database changes

---

## TC-MEM-013: Redeem Code - Not Logged In
**Priority:** High
**Type:** Security

### Preconditions
- User is not authenticated

### Test Steps
1. Attempt to redeem code without login
```sql
SELECT * FROM redeem_activation_code('PUGS-A1B2-C3D4-E5F6');
```

### Expected Results
- Returns: `success: false, message: "You must be logged in to redeem a code"`
- No changes made

---

## TC-MEM-014: Redeem Code - Extends Active Membership
**Priority:** High
**Type:** Functional

### Preconditions
- User has active membership expiring in 2 months
- Valid 3-month code

### Test Steps
1. User with active membership redeems code
```sql
-- User current expiry: 2025-02-10
SELECT * FROM redeem_activation_code('PUGS-A1B2-C3D4-E5F6');
```

### Expected Results
- New expiry = current expiry + code duration
- New expiry: 2025-05-10 (2 months + 3 months)
- Does NOT start from today

### Test Data
```
Current expiry: 2025-02-10
Code duration: 3 months
Expected new expiry: 2025-05-10
```

---

## TC-MEM-015: View Activation Code Statistics
**Priority:** Low
**Type:** Functional

### Preconditions
- Various codes exist with different statuses

### Test Steps
1. Query statistics function
```sql
SELECT * FROM get_activation_code_stats();
```

### Expected Results
- Returns:
  - `total_codes`: Count of all codes
  - `active_codes`: Count of unused codes
  - `used_codes`: Count of redeemed codes
  - `expired_codes`: Count of expired codes
  - `cancelled_codes`: Count of cancelled codes

---

# 3. ADMIN QUICK-ACTIVATE TESTS

## TC-MEM-016: Quick-Activate - Success
**Priority:** High
**Type:** Functional

### Preconditions
- User is logged in as admin
- Target member exists
- Membership plans exist

### Test Steps
1. Log in as admin
2. Navigate to Admin → Members
3. Find member "John Doe"
4. Click ⚡ (Zap) icon for quick-activate
5. Dialog opens
6. Select membership: "Basic Membership (R899 - 3 months)"
7. Leave duration as default (3 months)
8. Add notes: "Paid cash on 2024-12-10"
9. Add payment reference: "CASH-001"
10. Click "Activate Membership" button

### Expected Results
- Success toast: "Membership activated: Basic Membership (3 months) - expires YYYY-MM-DD"
- Dialog closes
- Member's `membership_expiry_date` updated
- Member's `current_membership_id` set
- Member status shows "Active" in table
- If audit log table exists, activation logged

### Test Data
```
Member: John Doe (test@example.com)
Membership: Basic Membership
Duration: 3 months (default)
Notes: "Paid cash on 2024-12-10"
Payment Reference: "CASH-001"
```

---

## TC-MEM-017: Quick-Activate - Custom Duration
**Priority:** High
**Type:** Functional

### Test Steps
1. Open quick-activate dialog
2. Select "Basic Membership" (default: 3 months)
3. Override duration: Enter "6" months
4. Fill notes and reference
5. Click "Activate Membership"

### Expected Results
- Membership activated with custom 6-month duration
- Ignores default 3 months from plan
- New expiry = today + 6 months
- Success message shows "6 months"

### Test Data
```
Plan default: 3 months
Custom override: 6 months
Expected duration used: 6 months
```

---

## TC-MEM-018: Quick-Activate - No Membership Selected
**Priority:** High
**Type:** Negative

### Test Steps
1. Open quick-activate dialog
2. Leave membership dropdown empty
3. Click "Activate Membership"

### Expected Results
- Validation error toast: "Please select a membership plan"
- Form does not submit
- No changes to user

---

## TC-MEM-019: Quick-Activate - Non-Admin User
**Priority:** High
**Type:** Security

### Preconditions
- User is logged in as regular member

### Test Steps
1. Regular member attempts to call function directly
```sql
SELECT * FROM admin_activate_membership(
  p_user_id := 'target-user-id',
  p_membership_id := 'plan-id'
);
```

### Expected Results
- Returns: `success: false, message: "Unauthorized: Admin access required"`
- No changes made
- Security enforced at database level

---

## TC-MEM-020: Quick-Activate - Invalid Membership ID
**Priority:** Medium
**Type:** Negative

### Test Steps
1. Attempt to activate with non-existent membership plan
```sql
SELECT * FROM admin_activate_membership(
  p_user_id := 'valid-user-id',
  p_membership_id := '00000000-0000-0000-0000-000000000000'
);
```

### Expected Results
- Returns: `success: false, message: "Membership plan not found"`
- No changes made

---

## TC-MEM-021: Quick-Activate - Extends Active Membership
**Priority:** High
**Type:** Functional

### Preconditions
- User has active membership expiring 2025-03-01
- Admin activates 3-month plan on 2024-12-10

### Test Steps
1. Admin quick-activates member with existing active membership
2. Select 3-month plan

### Expected Results
- New expiry = current expiry + new duration
- New expiry: 2025-06-01 (not 2025-03-10)
- Does NOT overwrite, extends instead

### Test Data
```
Current expiry: 2025-03-01
New duration: 3 months
Expected new expiry: 2025-06-01
```

---

## TC-MEM-022: Quick-Activate - Expired Membership
**Priority:** High
**Type:** Functional

### Preconditions
- User has expired membership (2024-11-01)
- Admin activates 3-month plan on 2024-12-10

### Test Steps
1. Admin quick-activates member with expired membership
2. Select 3-month plan

### Expected Results
- New expiry = today + duration
- New expiry: 2025-03-10 (starts fresh)
- Old expiry ignored

### Test Data
```
Current expiry: 2024-11-01 (expired)
New duration: 3 months
Expected new expiry: 2025-03-10
```

---

## TC-MEM-023: Quick-Activate - No Existing Membership
**Priority:** High
**Type:** Functional

### Preconditions
- User has never had a membership (`membership_expiry_date` = NULL)

### Test Steps
1. Admin quick-activates new member
2. Select 1-month plan

### Expected Results
- New expiry = today + 1 month
- `current_membership_id` set for first time
- Member can now book classes

### Test Data
```
Current expiry: NULL
New duration: 1 month
Expected new expiry: Today + 1 month
```

---

## TC-MEM-024: Quick-Activate Button Visibility
**Priority:** Medium
**Type:** UI

### Test Steps
1. Log in as admin
2. Navigate to Admin → Members
3. Check actions column for each member type

### Expected Results
- ⚡ Button visible for regular members
- ⚡ Button visible for instructors
- ⚡ Button NOT visible for admin users
- Button has tooltip: "Quick activate membership"
- Button styled with primary color

---

## TC-MEM-025: Quick-Activate Dialog UI
**Priority:** Medium
**Type:** UI

### Test Steps
1. Open quick-activate dialog
2. Inspect all UI elements

### Expected Results
- Title: "⚡ Quick Activate Membership"
- Description shows member name
- Membership dropdown shows all active plans
- Plan format: "Plan Name - R999 (X months)"
- Custom duration field (optional)
- Payment reference field (optional)
- Notes textarea (optional)
- Cancel and Activate buttons
- Loading state when activating
- Selected plan details preview box

---

# 4. EXPIRY NOTIFICATION TESTS

## TC-MEM-026: Daily Cron Job Execution
**Priority:** High
**Type:** Automated

### Preconditions
- pg_cron extension enabled
- Cron job scheduled

### Test Steps
1. Check cron job exists:
```sql
SELECT * FROM cron.job WHERE jobname = 'daily-membership-expiry-check';
```
2. Check schedule: `0 9 * * *` (9:00 AM daily)
3. Wait for next execution or trigger manually

### Expected Results
- Cron job exists in database
- Schedule: Daily at 9:00 AM
- Command invokes edge function
- Job runs successfully
- Check `cron.job_run_details` for execution history

---

## TC-MEM-027: Find Users Needing Notifications
**Priority:** High
**Type:** Functional

### Preconditions
- Create test users with various expiry dates

### Test Steps
1. Set up test data:
```sql
-- User A: Expires in 5 days
UPDATE profiles SET membership_expiry_date = CURRENT_DATE + 5 WHERE email = 'userA@test.com';

-- User B: Expires in 3 days
UPDATE profiles SET membership_expiry_date = CURRENT_DATE + 3 WHERE email = 'userB@test.com';

-- User C: Expires in 7 days
UPDATE profiles SET membership_expiry_date = CURRENT_DATE + 7 WHERE email = 'userC@test.com';
```

2. Query function:
```sql
SELECT * FROM get_users_needing_expiry_notification(5);
```

### Expected Results
- Returns User A only (expires in exactly 5 days)
- Does NOT return User B (too soon)
- Does NOT return User C (too far)
- Returns: user_id, email, full_name, expiry_date

---

## TC-MEM-028: Send Expiry Notification Email
**Priority:** High
**Type:** Functional

### Preconditions
- User expires in 5 days
- Gmail SMTP configured
- Edge function deployed

### Test Steps
1. Invoke edge function manually:
```bash
supabase functions invoke check-membership-expiry
```

### Expected Results
- Function finds expiring users
- Email sent via Gmail SMTP
- Email subject: "Your Gym Membership Expires Soon"
- Email uses dark theme (#121212, #1A1A1A, #E53E3E)
- Email shows:
  - User name
  - Membership plan name
  - Expiry date (5 days from today)
  - Membership benefits list
  - Membership price
  - Contact information
- Record logged in `membership_notifications` table
- Notification status: 'sent'

---

## TC-MEM-029: Notification Email Content Verification
**Priority:** High
**Type:** Functional

### Test Steps
1. Receive expiry notification email
2. Verify email content

### Expected Results
- Dark theme consistent with gym branding
- Subject: "Your Gym Membership Expires Soon"
- From: "Power Ultra Gym <gym@email.com>"
- Contains:
  - "Your [Plan Name] expires in 5 days"
  - Expiry date prominently displayed
  - List of benefits
  - Membership price
  - Contact email/phone
  - Professional signature
  - Footer with copyright
- Preheader text visible in preview
- Logo displayed (if configured)

---

## TC-MEM-030: Prevent Duplicate Notifications
**Priority:** High
**Type:** Functional

### Preconditions
- User already received notification for this expiry date

### Test Steps
1. User expires 2025-01-15
2. Function runs on 2025-01-10 (5 days before)
3. Notification sent and logged
4. Function runs again on 2025-01-10 (same day)

### Expected Results
- Function checks `membership_notifications` table
- Finds existing notification for user + expiry_date
- Skips sending duplicate
- User receives only ONE email
- Query filters out already-notified users

---

## TC-MEM-031: Notification Logging
**Priority:** Medium
**Type:** Functional

### Test Steps
1. Send expiry notification
2. Check `membership_notifications` table:
```sql
SELECT * FROM membership_notifications
WHERE user_id = 'test-user-id'
ORDER BY created_at DESC LIMIT 1;
```

### Expected Results
- Record created with:
  - `user_id`: Target user
  - `notification_type`: 'expiry_warning'
  - `expiry_date`: User's expiry date
  - `sent_at`: Timestamp
  - `delivery_status`: 'sent' or 'failed'
  - `error_message`: NULL if successful

---

## TC-MEM-032: Notification Statistics
**Priority:** Low
**Type:** Functional

### Test Steps
1. Query notification statistics:
```sql
SELECT * FROM get_notification_stats(30);
```

### Expected Results
- Returns for last 30 days:
  - `total_notifications`: Count of all sent
  - `notifications_sent`: Successful deliveries
  - `notifications_failed`: Failed deliveries
  - `unique_users_notified`: Distinct user count
  - `date_range`: "Last 30 days"

---

## TC-MEM-033: Email Delivery Failure Handling
**Priority:** High
**Type:** Error Handling

### Preconditions
- Invalid email address or SMTP error

### Test Steps
1. Trigger notification for user with invalid email
2. Observe function behavior

### Expected Results
- Email send fails
- Error caught and logged
- Error details stored in `membership_notifications`:
  - `delivery_status`: 'failed'
  - `error_message`: Error description
- Function continues processing other users
- Returns error count in response
- Does not crash entire batch

---

# 5. ACCESS CONTROL TESTS

## TC-MEM-034: Book Class - Active Membership
**Priority:** High
**Type:** Functional

### Preconditions
- User has active membership (expiry > today)

### Test Steps
1. Log in as member with active membership
2. Navigate to dashboard
3. Click "Book New Class"
4. Select a class
5. Click "Book Now"

### Expected Results
- Booking allowed
- Success toast: "Class booked successfully!"
- Class appears in "Upcoming Classes"

---

## TC-MEM-035: Book Class - Expired Membership
**Priority:** High
**Type:** Negative

### Preconditions
- User membership expired yesterday

### Test Steps
1. Log in as member with expired membership
2. Attempt to book a class
3. Click "Book Now"

### Expected Results
- Booking blocked
- Error toast: "Your membership has expired. Please renew to book classes."
- OR "Active membership required"
- Booking not created

---

## TC-MEM-036: Book Class - No Membership
**Priority:** High
**Type:** Negative

### Preconditions
- User has NULL `membership_expiry_date`

### Test Steps
1. Log in as new member (never had membership)
2. Attempt to book class

### Expected Results
- Booking blocked
- Error message about needing membership
- Prompted to purchase membership

---

## TC-MEM-037: Membership Status Display
**Priority:** Medium
**Type:** UI

### Test Steps
1. Log in as member
2. View dashboard

### Expected Results
- Membership status card visible
- Shows:
  - Status: "Active" (green) or "Expired" (red)
  - Expiry date
  - Days until expiry (if active)
  - Plan name
- Clear visual indicator of status

---

## TC-MEM-038: Access After Activation
**Priority:** High
**Type:** Functional

### Test Steps
1. User has no membership
2. Admin quick-activates membership
3. User refreshes page

### Expected Results
- Membership status updates immediately
- User can now book classes
- No need to log out/in

---

## TC-MEM-039: Grace Period Check
**Priority:** Medium
**Type:** Functional

### Test Steps
1. Membership expires today (at 00:00)
2. User attempts to book class

### Expected Results
- Depends on business rules:
  - Option A: Expires at end of day (booking allowed)
  - Option B: Expires at start of day (booking blocked)
- Consistent behavior across system

---

## TC-MEM-040: Membership Plan Details Display
**Priority:** Low
**Type:** UI

### Test Steps
1. Admin views members list
2. Member has active membership

### Expected Results
- Shows current plan name
- Shows expiry date
- Color-coded status (green/red)
- "Expires in X days" text

---

# 6. DATABASE FUNCTION TESTS

## TC-MEM-041: Function - Generate Code Performance
**Priority:** Medium
**Type:** Performance

### Test Steps
1. Generate 100 codes in loop:
```sql
DO $$
BEGIN
  FOR i IN 1..100 LOOP
    PERFORM generate_activation_code(
      p_membership_id := 'plan-uuid'
    );
  END LOOP;
END $$;
```

### Expected Results
- All codes unique
- No duplicates
- Completes in reasonable time (< 5 seconds)
- No deadlocks or errors

---

## TC-MEM-042: Function - Code Format Validation
**Priority:** Low
**Type:** Functional

### Test Steps
1. Generate multiple codes
2. Verify format

### Expected Results
- All codes match pattern: `PUGS-XXXX-XXXX-XXXX`
- XXXX = 4 uppercase alphanumeric characters
- Hyphens in correct positions
- Total length: 19 characters

---

## TC-MEM-043: RLS Policy - Activation Codes View
**Priority:** High
**Type:** Security

### Test Steps
1. Log in as regular member
2. Attempt to query all activation codes:
```sql
SELECT * FROM membership_activation_codes;
```

### Expected Results
- RLS blocks query
- Returns only codes user has redeemed
- Cannot see other users' codes
- Cannot see unused codes

---

## TC-MEM-044: RLS Policy - Activation Codes Create
**Priority:** High
**Type:** Security

### Test Steps
1. Log in as regular member
2. Attempt to insert activation code:
```sql
INSERT INTO membership_activation_codes (code, membership_id, ...) VALUES (...);
```

### Expected Results
- RLS blocks insert
- Error: Permission denied
- Only admins can create codes

---

## TC-MEM-045: Function - Admin Check
**Priority:** High
**Type:** Security

### Test Steps
1. Log in as regular member
2. Call admin_activate_membership:
```sql
SELECT * FROM admin_activate_membership(...);
```

### Expected Results
- Function checks `profiles.is_admin`
- Returns: `success: false, message: "Unauthorized: Admin access required"`
- No changes made

---

## TC-MEM-046: Audit Log Creation (If Table Exists)
**Priority:** Low
**Type:** Functional

### Preconditions
- `membership_audit_log` table exists

### Test Steps
1. Admin activates membership
2. Check audit log:
```sql
SELECT * FROM membership_audit_log
WHERE user_id = 'target-user'
ORDER BY created_at DESC LIMIT 1;
```

### Expected Results
- Record created with:
  - `user_id`: Target user
  - `changed_by`: Admin user ID
  - `action`: 'admin_activation'
  - `old_expiry_date`: Previous expiry
  - `new_expiry_date`: New expiry
  - `membership_id`: Plan ID
  - `reason`: Notes provided

---

## TC-MEM-047: Transaction Rollback on Error
**Priority:** High
**Type:** Error Handling

### Test Steps
1. Cause an error mid-function (e.g., invalid data)
2. Check if partial changes rolled back

### Expected Results
- Transaction atomicity maintained
- All changes rolled back on error
- Database remains consistent
- No orphaned records

---

## TC-MEM-048: Concurrent Activation Handling
**Priority:** Medium
**Type:** Concurrency

### Test Steps
1. Two admins activate same user simultaneously
2. Both submit at same time

### Expected Results
- Both transactions complete successfully
- Final expiry = earlier expiry + both durations
- No lost activations
- No race conditions

---

## TC-MEM-049: Code Expiry Auto-Update
**Priority:** Low
**Type:** Functional

### Test Steps
1. Code expires (past `expires_at` date)
2. User attempts to redeem
3. Check code status after attempt

### Expected Results
- Code status updated from 'active' to 'expired'
- Automatic status change on redeem attempt
- Audit trail maintained

---

## TC-MEM-050: Statistics Functions Performance
**Priority:** Low
**Type:** Performance

### Test Steps
1. Database has 10,000+ activation codes
2. Query statistics:
```sql
SELECT * FROM get_activation_code_stats();
```

### Expected Results
- Query completes in < 2 seconds
- Accurate counts
- Uses efficient aggregation
- Indexed columns used

---

# 7. INTEGRATION TESTS

## TC-MEM-INT-001: End-to-End User Journey
**Priority:** High
**Type:** Integration

### Test Steps
1. User submits membership inquiry
2. Admin receives notification
3. User pays externally (simulated)
4. Admin generates activation code
5. Admin sends code to user (email/SMS)
6. User logs in
7. User enters activation code
8. User books a class
9. 5 days before expiry, notification sent
10. User renews (admin activates again)

### Expected Results
- All steps complete successfully
- Data flows correctly between components
- User receives all expected communications
- Membership status accurate throughout journey

---

## TC-MEM-INT-002: Admin Quick-Activate + Booking
**Priority:** High
**Type:** Integration

### Test Steps
1. New user registers
2. User submits inquiry
3. Admin receives payment
4. Admin quick-activates via Members page
5. User immediately attempts to book class
6. User books class successfully

### Expected Results
- Activation immediate (no delay)
- User can book right after activation
- No need to log out/in
- Class booking succeeds

---

## TC-MEM-INT-003: Expiry + Access Revocation
**Priority:** High
**Type:** Integration

### Test Steps
1. User has membership expiring today
2. Cron job runs (midnight)
3. User attempts to book class next day
4. Notification sent 5 days before

### Expected Results
- User cannot book after expiry
- Access correctly revoked
- Notification received on time
- Clear messaging to user

---

# 8. EDGE CASES & CORNER CASES

## TC-MEM-EDGE-001: Leap Year Date Handling
**Priority:** Low
**Type:** Edge Case

### Test Steps
1. Activate 1-year membership on 2024-02-29 (leap day)
2. Check expiry date

### Expected Results
- Expiry: 2025-02-28 or 2025-03-01
- No errors
- Handles leap year correctly

---

## TC-MEM-EDGE-002: Very Long Custom Duration
**Priority:** Low
**Type:** Edge Case

### Test Steps
1. Admin enters custom duration: 1200 months (100 years)
2. Activate membership

### Expected Results
- Accepts value (no validation limit)
- Calculates expiry correctly
- No overflow errors

---

## TC-MEM-EDGE-003: Special Characters in Notes
**Priority:** Low
**Type:** Edge Case

### Test Steps
1. Admin enters notes with special chars: `SQL'; DROP TABLE--`
2. Activation succeeds

### Expected Results
- Special characters escaped properly
- No SQL injection
- Notes stored correctly

---

## TC-MEM-EDGE-004: Multiple Plans Same User
**Priority:** Medium
**Type:** Edge Case

### Test Steps
1. User has Basic plan (expires 2025-02-01)
2. Admin activates Premium plan (3 months)

### Expected Results
- `current_membership_id` updated to Premium
- Expiry extended by 3 months
- User now has Premium benefits (if applicable)

---

## TC-MEM-EDGE-005: Timezone Handling
**Priority:** Medium
**Type:** Edge Case

### Test Steps
1. Server in UTC
2. Cron runs at 9:00 AM (which timezone?)
3. User expiry date checks

### Expected Results
- Consistent timezone usage (UTC)
- Expiry checks use date only (no time component)
- Cron schedule clear about timezone

---

# Summary

## Test Coverage Statistics
- **Total Test Cases:** 50
- **Priority High:** 38
- **Priority Medium:** 9
- **Priority Low:** 3

## Test Types
- **Functional:** 35
- **Negative:** 7
- **Security:** 6
- **Integration:** 3
- **Performance:** 2
- **UI:** 4
- **Edge Cases:** 5

## Critical Path Test Cases
1. TC-MEM-001: Submit Inquiry
2. TC-MEM-006: Generate Code
3. TC-MEM-009: Redeem Code
4. TC-MEM-016: Quick-Activate
5. TC-MEM-028: Send Notification
6. TC-MEM-034: Book with Active Membership
7. TC-MEM-035: Block Expired Membership

## Automated vs Manual
- **Automated:** Database functions, cron jobs, notifications
- **Manual:** UI interactions, admin workflows, email verification
- **Hybrid:** Integration tests require both

---

# Test Execution Notes

## Pre-Test Setup
1. Deploy all database migrations
2. Configure environment variables (GMAIL_USER, GMAIL_APP_PASSWORD)
3. Deploy edge functions
4. Enable pg_cron extension
5. Create test data (users, memberships, classes)

## Test Data Cleanup
After each test, clean up:
```sql
DELETE FROM membership_activation_codes WHERE notes LIKE '%TEST%';
DELETE FROM membership_notifications WHERE user_id IN (SELECT id FROM profiles WHERE email LIKE '%test.com');
-- Reset test user memberships
UPDATE profiles SET membership_expiry_date = NULL WHERE email LIKE '%test.com';
```

## Known Issues / Limitations
- Email testing requires real SMTP or mock service
- Cron job timing requires waiting or manual trigger
- RLS policies require correct user context for testing

---

**Document Version:** 1.0
**Last Updated:** 2024-12-10
**Author:** Test Team
**Status:** Ready for Execution
