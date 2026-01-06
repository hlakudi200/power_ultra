# Membership Activation Prompt - Debugging Guide

## Issue
The activation prompt dialog may not show for users without active memberships.

## How It Should Work

When a user logs in and navigates to the Dashboard:

1. **Profile loads** from database
2. **useEffect checks** if `membership_expiry_date` exists and is in the future
3. **If no active membership** → `setShowActivationPrompt(true)`
4. **Dialog renders** at the bottom of Dashboard component

## Code Location

### Dashboard.tsx (lines 275-291)
```typescript
useEffect(() => {
  if (profile && !isProfileLoading) {
    const hasActiveMembership = profile.membership_expiry_date &&
      new Date(profile.membership_expiry_date) > new Date();

    console.log("Membership check:", {
      membership_expiry_date: profile.membership_expiry_date,
      hasActiveMembership,
      willShowPrompt: !hasActiveMembership
    });

    if (!hasActiveMembership) {
      setShowActivationPrompt(true);
    }
  }
}, [profile, isProfileLoading]);
```

### Dialog Render (lines 662-667)
```typescript
<MembershipActivationPrompt
  open={showActivationPrompt}
  onOpenChange={setShowActivationPrompt}
  userName={profile?.first_name || firstName}
/>
```

## Debugging Steps

### 1. Check Browser Console
Open browser DevTools (F12) and look for the console.log output:
```
Membership check: {
  membership_expiry_date: null,  // or a date string
  hasActiveMembership: false,
  willShowPrompt: true
}
```

### 2. Possible Scenarios

#### Scenario A: User has NULL expiry date
```
membership_expiry_date: null
hasActiveMembership: false
willShowPrompt: true
✅ Dialog SHOULD show
```

#### Scenario B: User has past expiry date
```
membership_expiry_date: "2024-01-15"
hasActiveMembership: false
willShowPrompt: true
✅ Dialog SHOULD show
```

#### Scenario C: User has future expiry date
```
membership_expiry_date: "2025-12-31"
hasActiveMembership: true
willShowPrompt: false
❌ Dialog should NOT show (user has active membership)
```

### 3. Check Database
Query the profiles table for the test user:
```sql
SELECT
  id,
  first_name,
  email,
  membership_expiry_date,
  membership_id
FROM profiles
WHERE email = 'test-user@example.com';
```

Expected for non-member:
- `membership_expiry_date`: `NULL` or past date
- `membership_id`: `NULL`

### 4. Check Dialog Component
Verify MembershipActivationPrompt is imported and rendered:
```typescript
// Import (line 17)
import { MembershipActivationPrompt } from "@/components/MembershipActivationPrompt";

// State (line 228)
const [showActivationPrompt, setShowActivationPrompt] = useState(false);

// Render (lines 662-667)
<MembershipActivationPrompt ... />
```

## Common Issues

### Issue 1: Profile Not Loading
**Symptom**: Console log never appears
**Cause**: Profile query failing or taking too long
**Fix**: Check network tab for profile query errors

### Issue 2: Dialog Component Not Rendering
**Symptom**: `willShowPrompt: true` but no dialog visible
**Cause**: CSS issue, z-index problem, or component error
**Fix**:
- Check browser console for React errors
- Inspect DOM for dialog element
- Verify Shadcn Dialog styles are loaded

### Issue 3: State Not Updating
**Symptom**: State shows `false` in React DevTools
**Cause**: useEffect dependency issue
**Fix**: Dependencies are correct `[profile, isProfileLoading]`

### Issue 4: User Closes Dialog and It Won't Re-open
**Symptom**: Dialog shows once, then never again
**Cause**: State not resetting when membership changes
**Solution**: This is by design - user dismissed the prompt

## Testing Checklist

### Create Test User Without Membership
```sql
-- Create or update user to have no membership
UPDATE profiles
SET
  membership_expiry_date = NULL,
  membership_id = NULL
WHERE email = 'test@example.com';
```

### Test Flow
1. ✅ Log in as test user
2. ✅ Navigate to Dashboard
3. ✅ Check console for "Membership check" log
4. ✅ Verify dialog appears with two options:
   - "I Have an Activation Code"
   - "View Membership Plans"
5. ✅ Click "Enter Activation Code" → redirects to `/activate-membership`
6. ✅ Go back to Dashboard
7. ✅ Click "Browse Membership Plans" → redirects to `/memberships`

### Test After Activation
1. ✅ Generate activation code as admin
2. ✅ Activate membership using code
3. ✅ Navigate to Dashboard
4. ✅ Verify dialog does NOT show (user has active membership)
5. ✅ Check membership card shows "Active" status

## Dialog Features

### Two Clear Options

#### Option 1: I Have an Activation Code
- Icon: Sparkles (gradient red)
- Background: Primary color with gradient
- Action: Navigate to `/activate-membership`
- Use case: User already received code from admin

#### Option 2: View Membership Plans
- Icon: Shopping Bag
- Background: Muted/outline style
- Action: Navigate to `/memberships`
- Use case: User wants to browse plans and send inquiry

### Can Be Dismissed
- User can click outside or press ESC to close
- State persists (won't auto-show again on same session)
- Will show again on next login if still no active membership

## Related Components

1. **MembershipActivationPrompt.tsx** - The dialog component
2. **Dashboard.tsx** - Triggers the dialog
3. **ActivateMembership.tsx** - Code redemption page
4. **Memberships.tsx** - Browse plans page

## Environment Check

Ensure these routes exist in `App.tsx`:
```typescript
<Route path="/activate-membership" element={<ActivateMembership />} />
<Route path="/memberships" element={<Memberships />} />
```

## Final Notes

- The dialog is **intentionally non-blocking** - users can dismiss it
- It only shows **once per session** after dismissal
- The check runs on **every Dashboard mount**
- Console logs help debug in development (can be removed in production)
