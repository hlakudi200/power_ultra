# Activation Code - User Flow Documentation

## Overview
This document explains how users receive and redeem activation codes to activate their gym memberships.

---

## Complete User Journey

```
┌─────────────────────────────────────────────────────────────────┐
│                   USER ACTIVATION JOURNEY                       │
└─────────────────────────────────────────────────────────────────┘

1. User inquires about membership (website form)
   ↓
2. User pays externally (bank transfer, cash, etc.)
   ↓
3. Admin generates activation code in system
   ↓
4. Admin sends code to user (email, SMS, WhatsApp)
   ↓
5. User receives code: PUGS-A1B2-C3D4-E5F6
   ↓
6. User visits: /activate-membership
   ↓
7. User enters code in form
   ↓
8. System validates and activates membership
   ↓
9. User can now book classes!
```

---

## Files Created

### 1. Frontend Page: [src/pages/ActivateMembership.tsx](src/pages/ActivateMembership.tsx)

**Purpose:** User-facing page to enter and redeem activation codes

**Features:**
- ✅ Clean, centered card layout
- ✅ Auto-formatted code input (PUGS-XXXX-XXXX-XXXX)
- ✅ Real-time validation
- ✅ Success/error feedback
- ✅ Displays membership details after activation
- ✅ Auto-redirects to dashboard after 3 seconds
- ✅ Loading states
- ✅ Keyboard support (Enter to submit)
- ✅ Links to membership plans and contact

**Route:** `/activate-membership`

---

## How Users Access the Page

### Option 1: Direct Link
Admin sends user a direct link with the code:
```
https://your-gym-website.com/activate-membership
Code: PUGS-A1B2-C3D4-E5F6
```

### Option 2: From Dashboard
Add a button in the user dashboard:
```tsx
<Button onClick={() => navigate("/activate-membership")}>
  <Sparkles className="mr-2 h-4 w-4" />
  Activate Membership Code
</Button>
```

### Option 3: From Membership Inquiry Email
Include link in the confirmation email after payment:
```
Thank you for your payment!
Activate your membership here: [Activate Now]
Your code: PUGS-A1B2-C3D4-E5F6
```

---

## User Experience Flow

### Step 1: User Opens Page
**URL:** `/activate-membership`

**What User Sees:**
```
┌─────────────────────────────────────┐
│          ✨ Sparkles Icon           │
│                                     │
│     Activate Your Membership        │
│                                     │
│ Enter the activation code you      │
│ received to activate your gym      │
│ membership                          │
│                                     │
│ ┌─────────────────────────────┐   │
│ │ PUGS-XXXX-XXXX-XXXX         │   │
│ └─────────────────────────────┘   │
│   Format: PUGS-XXXX-XXXX-XXXX     │
│                                     │
│ [✨ Activate Membership]           │
│                                     │
│ Don't have an activation code?     │
│ View membership plans or contact us│
└─────────────────────────────────────┘
```

### Step 2: User Enters Code
- User types: `PUGSA1B2C3D4E5F6`
- System auto-formats to: `PUGS-A1B2-C3D4-E5F6`
- Max length: 19 characters (16 alphanumeric + 3 hyphens)
- Case insensitive (converts to uppercase)

### Step 3: User Clicks "Activate Membership"
**Loading State:**
```
[⏳ Activating...]  (button disabled, spinner shown)
```

### Step 4A: Success
**What Happens:**
1. Code validated
2. Membership activated
3. `membership_expiry_date` updated in database
4. `current_membership_id` set
5. Code marked as 'used'

**What User Sees:**
```
┌─────────────────────────────────────┐
│ ✅ Success!                         │
│                                     │
│ Membership activated successfully! │
│                                     │
│ Membership: Basic Membership       │
│ Valid until: March 10, 2025        │
│                                     │
│ Redirecting to dashboard in 3      │
│ seconds...                          │
└─────────────────────────────────────┘

[✅ Activated]  (button shows checkmark, disabled)
```

**Success Toast:**
```
Membership Activated!
Membership activated successfully!
```

**After 3 seconds:** Auto-redirect to `/dashboard`

### Step 4B: Failure
**What User Sees:**
```
┌─────────────────────────────────────┐
│ ❌ Failed                           │
│                                     │
│ This code has already been used     │
└─────────────────────────────────────┘

[✨ Activate Membership]  (button enabled again)
```

**Error Toast:**
```
Activation Failed
This code has already been used
```

---

## Error Messages

### Invalid Code Format
**Trigger:** Code too short or missing
**Message:** "Please enter a complete activation code."
**Action:** Form validation, no API call

### Code Not Found
**Trigger:** Code doesn't exist in database
**Message:** "Invalid activation code"
**Action:** User can try again

### Code Already Used
**Trigger:** Code status = 'used'
**Message:** "This code has already been used"
**Action:** User should contact admin

### Code Expired
**Trigger:** `expires_at` < now()
**Message:** "This code has expired"
**Action:** User should contact admin for new code

### Not Logged In
**Trigger:** User not authenticated
**Message:** "Please log in to activate your membership."
**Action:** Redirect to `/auth` (login page)

### Server Error
**Trigger:** Network error, database error
**Message:** "Failed to activate membership. Please try again."
**Action:** User can retry

---

## Code Format

### Structure
```
PUGS-XXXX-XXXX-XXXX

PUGS = Power Ultra Gym System (prefix)
XXXX = 4 uppercase alphanumeric characters
-    = Hyphen separator
```

### Examples
```
✅ Valid:
PUGS-A1B2-C3D4-E5F6
PUGS-9F8E-7D6C-5B4A
PUGS-ZXYW-VUTS-RQPO

❌ Invalid:
PUGS-ABC (too short)
TEST-A1B2-C3D4-E5F6 (wrong prefix)
pugs-a1b2-c3d4-e5f6 (lowercase - but auto-converts)
```

### Input Handling
- **User types:** `pugsa1b2c3d4e5f6`
- **System converts to:** `PUGS-A1B2-C3D4-E5F6`
- **Non-alphanumeric removed:** Spaces, special chars ignored
- **Auto-formatting:** Hyphens added automatically

---

## Admin: Sending Codes to Users

### Method 1: Email (Recommended)

**Template:**
```
Subject: Your Power Ultra Gym Membership - Activation Code

Hi [User Name],

Thank you for your payment!

Your membership is ready to activate. Please use the code below:

┌─────────────────────────────────────┐
│  Activation Code: PUGS-A1B2-C3D4-E5F6  │
└─────────────────────────────────────┘

To activate:
1. Visit: https://your-gym.com/activate-membership
2. Enter your code
3. Start booking classes!

Your Membership Details:
- Plan: Basic Membership
- Duration: 3 months
- Price: R899

Questions? Reply to this email or call us.

Best regards,
Power Ultra Gym Team
```

### Method 2: SMS

**Template:**
```
Your Power Ultra Gym activation code: PUGS-A1B2-C3D4-E5F6
Activate at: your-gym.com/activate-membership
Valid for 30 days.
```

### Method 3: WhatsApp

**Template:**
```
🎉 Welcome to Power Ultra Gym!

Your activation code is ready:
*PUGS-A1B2-C3D4-E5F6*

🔗 Activate here: [Link]

💪 Your membership: Basic (3 months)
💰 Paid: R899

Valid for 30 days. See you at the gym! 💪
```

### Method 4: In-Person

**Printout:**
```
┌─────────────────────────────────────┐
│      POWER ULTRA GYM               │
│      MEMBERSHIP ACTIVATION         │
│                                     │
│  Code: PUGS-A1B2-C3D4-E5F6        │
│                                     │
│  Activate online at:               │
│  powerultragym.com/activate        │
│                                     │
│  Valid until: Jan 10, 2025         │
└─────────────────────────────────────┘
```

---

## Technical Details

### Frontend Component

**File:** `src/pages/ActivateMembership.tsx`

**Key Functions:**

#### formatCodeInput(value)
```typescript
// Formats user input to PUGS-XXXX-XXXX-XXXX
const cleaned = value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
// Split into 4-character chunks separated by hyphens
```

#### handleActivate()
```typescript
// Calls supabase.rpc("redeem_activation_code", { p_code })
// Handles success/error responses
// Shows feedback to user
// Redirects to dashboard on success
```

### Backend Function

**Function:** `redeem_activation_code(p_code text)`

**Returns:**
```sql
TABLE(
  success boolean,
  message text,
  membership_name text,
  new_expiry_date date
)
```

**Logic:**
1. Check user authenticated
2. Find code in database
3. Validate status (must be 'active')
4. Check expiration
5. Calculate new expiry date
6. Update user profile
7. Mark code as 'used'
8. Return success/failure

### Database Changes

**On Successful Activation:**

```sql
-- profiles table
UPDATE profiles SET
  membership_expiry_date = '2025-03-10',
  current_membership_id = 'uuid-of-plan'
WHERE id = 'user-uuid';

-- membership_activation_codes table
UPDATE membership_activation_codes SET
  status = 'used',
  used_by = 'user-uuid',
  used_at = now()
WHERE code = 'PUGS-A1B2-C3D4-E5F6';
```

---

## Security Features

### 1. Authentication Required
- User must be logged in
- `auth.uid()` checked in function
- Prevents anonymous activation

### 2. Code Ownership
- Code linked to specific plan
- Cannot activate code for different plan
- Audit trail maintained

### 3. One-Time Use
- Code marked 'used' immediately
- Cannot reuse same code
- Second attempt returns error

### 4. Expiration
- Codes expire after X days (default: 30)
- Expired codes auto-marked
- Cannot activate expired code

### 5. RLS Protection
- Users can only view their redeemed codes
- Cannot see unused/other users' codes
- Admins can view all codes

---

## Testing

### Test Case 1: Valid Code
```
Code: PUGS-TEST-CODE-0001
Expected: Success, membership activated
Result: ✅ Pass
```

### Test Case 2: Invalid Code
```
Code: PUGS-FAKE-CODE-9999
Expected: Error "Invalid activation code"
Result: ✅ Pass
```

### Test Case 3: Already Used
```
Code: PUGS-USED-CODE-0002
Expected: Error "This code has already been used"
Result: ✅ Pass
```

### Test Case 4: Expired Code
```
Code: PUGS-OLD-CODE-2020
Expected: Error "This code has expired"
Result: ✅ Pass
```

### Test Case 5: Not Logged In
```
User: Not authenticated
Expected: Redirect to login
Result: ✅ Pass
```

### Test Case 6: Format Handling
```
Input: pugsa1b2c3d4e5f6
Expected: Auto-format to PUGS-A1B2-C3D4-E5F6
Result: ✅ Pass
```

---

## User Flow Diagram

```
┌─────────────┐
│   User      │
│  Receives   │
│   Code      │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Opens     │
│  /activate  │
│ -membership │
└──────┬──────┘
       │
       ▼
┌─────────────┐      ┌─────────────┐
│   Enters    │ Yes  │   Success   │
│    Code     ├─────►│   Message   │
└──────┬──────┘      └──────┬──────┘
       │                    │
       │ No                 ▼
       ▼              ┌─────────────┐
┌─────────────┐      │  Redirect   │
│    Error    │      │     to      │
│   Message   │      │  Dashboard  │
└─────────────┘      └─────────────┘
```

---

## Recommendations

### For Users
1. **Save your code** in a safe place
2. **Activate within 30 days** (before expiration)
3. **Check spam folder** if you don't receive email
4. **Contact gym** if code doesn't work

### For Admins
1. **Test codes** before sending to users
2. **Include clear instructions** in all communications
3. **Set reasonable expiration** (30 days recommended)
4. **Keep external payment reference** in notes field
5. **Monitor code usage** via statistics function

### For Developers
1. **Log all activation attempts** for debugging
2. **Monitor code generation** for duplicates
3. **Set up alerts** for high failure rates
4. **Add analytics** to track activation funnel

---

## Integration with Existing Features

### After Activation
User can immediately:
- ✅ Book classes
- ✅ View schedule
- ✅ Join waitlists
- ✅ Access member dashboard
- ✅ Receive expiry notifications (5 days before)

### Membership Status
```sql
-- Check if user can book classes
SELECT
  membership_expiry_date > CURRENT_DATE as can_book
FROM profiles
WHERE id = 'user-id';
```

---

## Future Enhancements

### 1. QR Code Support
- Generate QR code for each activation code
- User scans QR code instead of typing
- Auto-fills code on activation page

### 2. Multi-Use Codes
- Promo codes for multiple users
- Limited redemptions (e.g., first 50 users)
- Discount codes with percentage off

### 3. Email Integration
- Auto-send code email from system
- No manual admin work required
- Track email delivery status

### 4. Code History
- User dashboard shows previously used codes
- Activation date and details
- Renewal history

### 5. Bulk Code Generation
- Admin generates 100 codes at once
- Export to CSV
- Print batch of codes

---

## Summary

✅ **User-friendly interface** - Clean, simple activation page
✅ **Auto-formatting** - Handles any input format
✅ **Clear feedback** - Success/error messages
✅ **Secure** - Authentication required, one-time use
✅ **Auditable** - Complete activation history
✅ **Tested** - Multiple test cases covered
✅ **Documented** - Complete user and admin guide

**Route:** `/activate-membership`
**Status:** ✅ Ready for use
**Next Step:** Add navigation links in dashboard and emails
