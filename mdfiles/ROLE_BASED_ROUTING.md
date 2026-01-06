# Role-Based Routing Implementation

## Overview
The application now automatically redirects users to their appropriate dashboard based on their role:
- **Admins** → `/admin`
- **Trainers** → `/trainer-dashboard`
- **Members** → `/dashboard`

## How It Works

### 1. Index Page Redirect (`src/pages/Index.tsx`)
When a logged-in user visits the home page (`/`), the system:
1. Checks if user is an admin (from `profiles.is_admin`)
2. If admin → redirect to `/admin`
3. If not admin, checks if user is a trainer (from `instructors` table where `is_personal_trainer = true`)
4. If trainer → redirect to `/trainer-dashboard`
5. Otherwise → redirect to `/dashboard` (regular member)

### 2. Protected Route Logic (`src/App.tsx`)
The `ProtectedRoute` component handles role-based access control:
1. Fetches user profile and checks `is_admin` flag
2. Queries `instructors` table to check if user is a personal trainer
3. Sets `userRole` state with `{ isAdmin, isTrainer }`
4. Auto-redirects based on current path:
   - Admin on `/dashboard` or `/trainer-dashboard` → redirect to `/admin`
   - Trainer (non-admin) on `/dashboard` → redirect to `/trainer-dashboard`
   - Member without active membership on `/dashboard` → redirect to `/` with error toast

### 3. Priority Hierarchy
The routing follows this priority:
1. **Admin** (highest priority) - Always goes to `/admin`
2. **Trainer** (medium priority) - Goes to `/trainer-dashboard` unless also admin
3. **Member** (default) - Goes to `/dashboard` if active membership exists

## Database Tables Used

### `profiles` Table
```sql
- id (uuid)
- is_admin (boolean)
- membership_expiry_date (date)
```

### `instructors` Table
```sql
- id (uuid)
- user_id (uuid) - references profiles.id
- is_personal_trainer (boolean)
```

## Edge Cases Handled

### 1. Admin who is also a Trainer
- **Result:** Redirects to `/admin` (admin takes priority)
- **Logic:** `if (userRole.isAdmin)` check comes first

### 2. Trainer with Expired Membership
- **Result:** Still accesses `/trainer-dashboard`
- **Logic:** `hasActiveMembership || userRole.isTrainer` allows access

### 3. Member with No Active Membership
- **Result:** Redirected to home page with error toast
- **Logic:** Checks `!userRole.isAdmin && !userRole.isTrainer && !hasActiveMembership`

### 4. User Manually Navigating to Wrong Dashboard
- **Result:** Auto-redirected to correct dashboard
- **Logic:** `useEffect` monitors `location.pathname` and redirects on mismatch

## Code Flow

```
User logs in
    ↓
Session established
    ↓
Index.tsx checks role
    ↓
┌─────────────────┬──────────────────┬────────────────┐
│                 │                  │                │
│   is_admin?     │  is_trainer?     │  else          │
│                 │                  │                │
↓                 ↓                  ↓                ↓
/admin            /trainer-dashboard /dashboard       Stay on /
                                                      ↓
                                                  ProtectedRoute
                                                      ↓
                                                  Check membership
                                                      ↓
                                                  Allow or Deny
```

## Files Modified

### `src/App.tsx`
- Added `userRole` state to track admin/trainer status
- Updated `ProtectedRoute` to fetch role from database
- Implemented auto-redirect logic in `useEffect`
- Added role-based access control

### `src/pages/Index.tsx`
- Added role checking logic on mount
- Implemented redirect to appropriate dashboard
- Added error handling for database queries
- Added `isCheckingRole` state to prevent flash of content

## Testing Scenarios

### Test Case 1: Admin Login
1. Log in as admin user
2. **Expected:** Redirect to `/admin`
3. Try navigating to `/dashboard` → Auto-redirected to `/admin`
4. Try navigating to `/trainer-dashboard` → Auto-redirected to `/admin`

### Test Case 2: Trainer Login
1. Log in as trainer (non-admin)
2. **Expected:** Redirect to `/trainer-dashboard`
3. Try navigating to `/dashboard` → Auto-redirected to `/trainer-dashboard`
4. `/admin` routes should be inaccessible

### Test Case 3: Member Login
1. Log in as regular member with active membership
2. **Expected:** Redirect to `/dashboard`
3. Try navigating to `/admin` → Should show 404 or access denied
4. Try navigating to `/trainer-dashboard` → Should show 404 or access denied

### Test Case 4: Member Without Active Membership
1. Log in as member with expired membership
2. **Expected:** Redirect to home page with error toast
3. Toast message: "An active membership is required to access the dashboard."

### Test Case 5: Trainer Who is Also Admin
1. User has both `is_admin = true` AND exists in `instructors` table
2. **Expected:** Redirect to `/admin` (admin takes priority)

## Benefits

1. **Security:** Users can't access dashboards they shouldn't
2. **UX:** No manual navigation needed - automatic redirect
3. **Clarity:** Each user type has a clear entry point
4. **Maintainability:** Centralized role logic in two places

## Performance Considerations

- Role check happens once on login
- Results are cached in component state
- No repeated database queries on navigation
- Minimal redirect loops (max 1 redirect per page load)

## Future Enhancements

Potential improvements:
1. Cache role in localStorage to reduce database queries
2. Add role context provider for global access
3. Implement role-based component rendering
4. Add analytics tracking for role-based navigation

## Troubleshooting

### Infinite Redirect Loop
- **Cause:** Logic redirecting from target route
- **Solution:** Ensure redirect logic checks `currentPath` before redirecting

### Role Not Updating After Database Change
- **Cause:** Role cached in component state
- **Solution:** User must log out and log back in, or implement real-time subscription

### Flash of Wrong Dashboard
- **Cause:** Redirect happens after page renders
- **Solution:** Show loading state while checking role (`isCheckingRole`, `isProfileLoading`)
