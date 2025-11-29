# Role-Based Routing Test Cases

## Overview
Test cases for automatic role-based routing and dashboard access control.

---

## TC-ROUTE-001: Admin Login - Auto Redirect to Admin Dashboard
**Priority:** High
**Type:** Functional

### Preconditions
- User has admin privileges (`is_admin = true`)
- User is not logged in

### Test Steps
1. Navigate to home page
2. Login with admin credentials
3. Observe redirect behavior

### Expected Results
- Login successful
- Automatically redirected to `/admin`
- Admin dashboard displays correctly
- No manual navigation required

### Test Data
```
Email: admin@test.com
Password: Admin123!@#
Role: Admin (is_admin = true)
```

---

## TC-ROUTE-002: Trainer Login - Auto Redirect to Trainer Dashboard
**Priority:** High
**Type:** Functional

### Preconditions
- User is a personal trainer (`is_personal_trainer = true` in instructors table)
- User is NOT an admin
- User is not logged in

### Test Steps
1. Navigate to home page
2. Login with trainer credentials
3. Observe redirect behavior

### Expected Results
- Login successful
- Automatically redirected to `/trainer-dashboard`
- Trainer dashboard displays correctly
- Shows trainer-specific features (client list, create workout plans, etc.)

### Test Data
```
Email: trainer@test.com
Password: Trainer123!@#
Role: Trainer (is_personal_trainer = true, is_admin = false)
```

---

## TC-ROUTE-003: Member Login - Auto Redirect to Member Dashboard
**Priority:** High
**Type:** Functional

### Preconditions
- User is regular member (not admin, not trainer)
- User has active membership
- User is not logged in

### Test Steps
1. Navigate to home page
2. Login with member credentials
3. Observe redirect behavior

### Expected Results
- Login successful
- Automatically redirected to `/dashboard`
- Member dashboard displays correctly
- Shows member-specific features (workout plan, progress, bookings)

### Test Data
```
Email: member@test.com
Password: Member123!@#
Role: Member
membership_expiry_date: 2026-12-31
```

---

## TC-ROUTE-004: Admin + Trainer Role - Priority Check
**Priority:** High
**Type:** Functional

### Preconditions
- User has BOTH admin and trainer privileges
  - `is_admin = true` in profiles
  - `is_personal_trainer = true` in instructors

### Test Steps
1. Login with user who has both roles
2. Observe which dashboard loads

### Expected Results
- Redirected to `/admin` (admin takes priority)
- NOT redirected to `/trainer-dashboard`
- Admin dashboard displays with full admin features

### Test Data
```
Email: admin-trainer@test.com
is_admin: true
is_personal_trainer: true
Expected redirect: /admin
```

---

## TC-ROUTE-005: Admin Manual Navigation to Member Dashboard
**Priority:** High
**Type:** Functional

### Preconditions
- User is logged in as admin
- Currently on `/admin` page

### Test Steps
1. Manually navigate to `/dashboard` (member dashboard)
2. Observe behavior

### Expected Results
- Automatically redirected back to `/admin`
- Cannot access member dashboard
- No error messages (seamless redirect)

---

## TC-ROUTE-006: Admin Manual Navigation to Trainer Dashboard
**Priority:** High
**Type:** Functional

### Preconditions
- User is logged in as admin
- Currently on `/admin` page

### Test Steps
1. Manually navigate to `/trainer-dashboard`
2. Observe behavior

### Expected Results
- Automatically redirected back to `/admin`
- Cannot access trainer dashboard
- No error messages (seamless redirect)

---

## TC-ROUTE-007: Trainer Manual Navigation to Member Dashboard
**Priority:** High
**Type:** Functional

### Preconditions
- User is logged in as trainer (non-admin)
- Currently on `/trainer-dashboard`

### Test Steps
1. Manually navigate to `/dashboard` (member dashboard)
2. Observe behavior

### Expected Results
- Automatically redirected back to `/trainer-dashboard`
- Cannot access member dashboard
- No error messages

---

## TC-ROUTE-008: Trainer Manual Navigation to Admin Dashboard
**Priority:** High
**Type:** Negative

### Preconditions
- User is logged in as trainer (non-admin)

### Test Steps
1. Manually navigate to `/admin` or admin sub-routes
2. Observe behavior

### Expected Results
- Access denied (404 or unauthorized page)
- OR redirected to `/trainer-dashboard`
- Cannot view admin features

---

## TC-ROUTE-009: Member Manual Navigation to Admin Dashboard
**Priority:** High
**Type:** Negative

### Preconditions
- User is logged in as regular member

### Test Steps
1. Manually navigate to `/admin`
2. Observe behavior

### Expected Results
- Access denied (404 or unauthorized page)
- OR redirected to `/dashboard`
- Cannot view admin features

---

## TC-ROUTE-010: Member Manual Navigation to Trainer Dashboard
**Priority:** Medium
**Type:** Negative

### Preconditions
- User is logged in as regular member (not trainer)

### Test Steps
1. Manually navigate to `/trainer-dashboard`
2. Observe behavior

### Expected Results
- Access denied (404 or unauthorized page)
- OR redirected to `/dashboard`
- Cannot view trainer features

---

## TC-ROUTE-011: Member Without Active Membership - Dashboard Access
**Priority:** High
**Type:** Negative

### Preconditions
- User is regular member
- Membership is expired (`membership_expiry_date` in past)
- User is not admin or trainer

### Test Steps
1. Login with expired membership credentials
2. Attempt to access `/dashboard`

### Expected Results
- Access denied
- Redirected to home page (`/`)
- Error toast: "An active membership is required to access the dashboard."
- Cannot view dashboard features

### Test Data
```
Email: expired@test.com
membership_expiry_date: 2023-01-01 (expired)
```

---

## TC-ROUTE-012: Trainer With Expired Membership - Dashboard Access
**Priority:** Medium
**Type:** Functional

### Preconditions
- User is trainer
- Membership is expired

### Test Steps
1. Login with trainer credentials (expired membership)
2. Observe redirect

### Expected Results
- Access GRANTED to `/trainer-dashboard`
- Trainers don't need active membership
- Can view all trainer features

### Test Data
```
Email: trainer-expired@test.com
is_personal_trainer: true
membership_expiry_date: 2023-01-01
```

---

## TC-ROUTE-013: Admin With Expired Membership - Dashboard Access
**Priority:** Medium
**Type:** Functional

### Preconditions
- User is admin
- Membership is expired

### Test Steps
1. Login with admin credentials (expired membership)
2. Observe redirect

### Expected Results
- Access GRANTED to `/admin`
- Admins don't need active membership
- Can view all admin features

---

## TC-ROUTE-014: Direct URL Access - Unauthenticated User to Dashboard
**Priority:** High
**Type:** Negative

### Preconditions
- User is NOT logged in

### Test Steps
1. Navigate directly to `/dashboard` via URL
2. Observe behavior

### Expected Results
- Access denied
- Redirected to home page `/`
- Error toast: "You must be logged in to access the dashboard."
- Login prompt appears

---

## TC-ROUTE-015: Direct URL Access - Unauthenticated User to Admin
**Priority:** High
**Type:** Negative

### Preconditions
- User is NOT logged in

### Test Steps
1. Navigate directly to `/admin` via URL
2. Observe behavior

### Expected Results
- Access denied
- Redirected to home page `/`
- Error toast: "You must be logged in to access the dashboard."

---

## TC-ROUTE-016: Direct URL Access - Unauthenticated User to Trainer Dashboard
**Priority:** High
**Type:** Negative

### Preconditions
- User is NOT logged in

### Test Steps
1. Navigate directly to `/trainer-dashboard` via URL
2. Observe behavior

### Expected Results
- Access denied
- Redirected to home page `/`
- Error toast appears

---

## TC-ROUTE-017: Logout and Re-login - Role Persistence
**Priority:** Medium
**Type:** Functional

### Test Steps
1. Login as admin
2. Verify redirected to `/admin`
3. Logout
4. Login again with same credentials
5. Verify redirect behavior

### Expected Results
- First login → `/admin`
- Logout successful
- Second login → `/admin` (role persists)
- No change in redirect behavior

---

## TC-ROUTE-018: Browser Back Button After Redirect
**Priority:** Medium
**Type:** Functional

### Preconditions
- User is logged in as admin

### Test Steps
1. Login as admin (redirected to `/admin`)
2. Manually navigate to `/dashboard`
3. Auto-redirected back to `/admin`
4. Click browser back button

### Expected Results
- Stays on `/admin` or redirects back to `/admin`
- Does NOT go back to `/dashboard`
- No infinite redirect loop

---

## TC-ROUTE-019: Refresh Page on Dashboard
**Priority:** Medium
**Type:** Functional

### Preconditions
- User is logged in and on correct dashboard

### Test Steps
1. Login as admin (on `/admin`)
2. Press F5 or refresh page
3. Observe behavior

### Expected Results
- Page refreshes successfully
- Remains on `/admin`
- No redirect occurs
- Session persists

---

## TC-ROUTE-020: Role Change While Logged In
**Priority:** Low
**Type:** Edge Case

### Preconditions
- User is logged in as member
- Admin changes user's role to admin in database

### Test Steps
1. Login as member (on `/dashboard`)
2. Admin grants admin role via database
3. Refresh page or navigate
4. Observe behavior

### Expected Results
- User still sees member dashboard (role cached)
- Must logout and login again to see new role
- No automatic role refresh

### Note
This is expected behavior - role changes require re-login.

---

## TC-ROUTE-021: Index Page Redirect - Logged In User
**Priority:** High
**Type:** Functional

### Preconditions
- User is already logged in

### Test Steps
1. Login as any role
2. Navigate back to home page `/`
3. Observe behavior

### Expected Results
- Automatically redirected to appropriate dashboard:
  - Admin → `/admin`
  - Trainer → `/trainer-dashboard`
  - Member → `/dashboard`
- Cannot stay on home page while logged in

---

## TC-ROUTE-022: Loading State During Role Check
**Priority:** Medium
**Type:** UI/UX

### Test Steps
1. Login with any credentials
2. Observe screen during role check and redirect

### Expected Results
- Loading indicator appears
- Message: "Loading user permissions..." or similar
- No flash of wrong content
- Smooth transition to correct dashboard

---

## TC-ROUTE-023: Network Error During Role Check
**Priority:** Low
**Type:** Error Handling

### Test Steps
1. Simulate network error during role check
2. Login attempt
3. Observe behavior

### Expected Results
- Error handled gracefully
- Error message displayed
- User not stuck on loading screen
- Option to retry

---

## Test Summary

| Category | Total Tests | Priority High | Priority Medium | Priority Low |
|----------|-------------|---------------|-----------------|--------------|
| Role-Based Routing | 23 | 15 | 6 | 2 |

## Role Matrix for Testing

| User Type | is_admin | is_trainer | Active Membership | Expected Route |
|-----------|----------|------------|-------------------|----------------|
| Admin | true | - | - | /admin |
| Trainer | false | true | - | /trainer-dashboard |
| Member | false | false | true | /dashboard |
| Admin+Trainer | true | true | - | /admin |
| Expired Member | false | false | false | / (denied) |
| Trainer (expired) | false | true | false | /trainer-dashboard |

## Test Data Setup

```sql
-- Create test users for routing tests

-- 1. Pure Admin
INSERT INTO auth.users (email, encrypted_password)
VALUES ('admin@test.com', '$password_hash');

UPDATE profiles
SET is_admin = true
WHERE id = 'admin_user_id';

-- 2. Pure Trainer
INSERT INTO auth.users (email, encrypted_password)
VALUES ('trainer@test.com', '$password_hash');

INSERT INTO instructors (user_id, is_personal_trainer)
VALUES ('trainer_user_id', true);

-- 3. Admin + Trainer
INSERT INTO auth.users (email, encrypted_password)
VALUES ('admin-trainer@test.com', '$password_hash');

UPDATE profiles SET is_admin = true WHERE id = 'admin_trainer_id';
INSERT INTO instructors (user_id, is_personal_trainer)
VALUES ('admin_trainer_id', true);

-- 4. Member with active membership
INSERT INTO auth.users (email, encrypted_password)
VALUES ('member@test.com', '$password_hash');

UPDATE profiles
SET membership_expiry_date = '2026-12-31'
WHERE id = 'member_user_id';

-- 5. Member with expired membership
INSERT INTO auth.users (email, encrypted_password)
VALUES ('expired@test.com', '$password_hash');

UPDATE profiles
SET membership_expiry_date = '2023-01-01'
WHERE id = 'expired_user_id';
```

## Notes for Tester

### Critical Scenarios
1. Admin must NEVER access trainer/member dashboards
2. Trainers can access trainer dashboard without membership
3. Members MUST have active membership
4. Admin+Trainer combo should prioritize admin

### Common Issues to Watch For
- Infinite redirect loops
- Flash of wrong dashboard before redirect
- Session not persisting after redirect
- Back button breaking redirect logic
- Role not updating after database change

### Browser Testing
Test on:
- Chrome (desktop & mobile)
- Firefox
- Safari (iOS)
- Edge

### Performance
- Redirect should happen within 500ms
- No visible flashing or layout shifts
- Loading state should be smooth
