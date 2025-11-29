# Authentication Test Cases

## Overview
Test cases for user authentication, registration, login, and session management.

---

## TC-AUTH-001: User Registration - Success
**Priority:** High
**Type:** Functional

### Preconditions
- User is not logged in
- Valid email not already in database

### Test Steps
1. Navigate to the home page
2. Click on "Sign Up" or "Register" button
3. Enter valid email address
4. Enter valid password (min 6 characters)
5. Click "Sign Up" button

### Expected Results
- Registration successful
- User receives confirmation email (if email verification enabled)
- User is redirected to setup profile page
- Success toast notification appears

### Test Data
```
Email: testuser@example.com
Password: Test123!@#
```

---

## TC-AUTH-002: User Registration - Duplicate Email
**Priority:** High
**Type:** Negative

### Preconditions
- Email already exists in database

### Test Steps
1. Navigate to registration page
2. Enter existing email address
3. Enter valid password
4. Click "Sign Up" button

### Expected Results
- Registration fails
- Error message: "User already registered" or similar
- User remains on registration page
- No new account created

### Test Data
```
Email: existing@example.com
Password: Test123!@#
```

---

## TC-AUTH-003: User Registration - Invalid Email
**Priority:** Medium
**Type:** Negative

### Test Steps
1. Navigate to registration page
2. Enter invalid email format
3. Enter valid password
4. Click "Sign Up" button

### Expected Results
- Validation error appears
- Message: "Please enter a valid email"
- Sign up button disabled or form doesn't submit

### Test Data
```
Invalid emails:
- notanemail
- @example.com
- user@
- user name@example.com
```

---

## TC-AUTH-004: User Registration - Weak Password
**Priority:** Medium
**Type:** Negative

### Test Steps
1. Navigate to registration page
2. Enter valid email
3. Enter password less than 6 characters
4. Click "Sign Up" button

### Expected Results
- Validation error appears
- Message: "Password must be at least 6 characters"
- Registration fails

### Test Data
```
Email: test@example.com
Password: 12345 (too short)
```

---

## TC-AUTH-005: User Login - Success
**Priority:** High
**Type:** Functional

### Preconditions
- User account exists
- User is not logged in

### Test Steps
1. Navigate to home page
2. Click "Login" button
3. Enter valid email
4. Enter correct password
5. Click "Sign In" button

### Expected Results
- Login successful
- User redirected to appropriate dashboard based on role:
  - Admin → `/admin`
  - Trainer → `/trainer-dashboard`
  - Member → `/dashboard`
- Navigation shows logged-in state

### Test Data
```
Email: member@example.com
Password: correct_password
```

---

## TC-AUTH-006: User Login - Wrong Password
**Priority:** High
**Type:** Negative

### Test Steps
1. Navigate to login page
2. Enter valid email
3. Enter incorrect password
4. Click "Sign In" button

### Expected Results
- Login fails
- Error message: "Invalid login credentials"
- User remains on login page
- No redirect occurs

### Test Data
```
Email: test@example.com
Password: wrong_password
```

---

## TC-AUTH-007: User Login - Non-existent Account
**Priority:** Medium
**Type:** Negative

### Test Steps
1. Navigate to login page
2. Enter email not in database
3. Enter any password
4. Click "Sign In" button

### Expected Results
- Login fails
- Error message: "Invalid login credentials"
- User remains on login page

### Test Data
```
Email: nonexistent@example.com
Password: anypassword
```

---

## TC-AUTH-008: User Logout
**Priority:** High
**Type:** Functional

### Preconditions
- User is logged in

### Test Steps
1. Click on user profile/avatar
2. Click "Logout" button
3. Confirm logout if prompted

### Expected Results
- User successfully logged out
- Session cleared
- Redirected to home page
- Navigation shows logged-out state
- Success toast: "Logged out successfully"

---

## TC-AUTH-009: Session Persistence
**Priority:** Medium
**Type:** Functional

### Preconditions
- User is logged in

### Test Steps
1. Login to application
2. Close browser tab
3. Reopen application in new tab
4. Navigate to protected route

### Expected Results
- User remains logged in
- Session persists across browser tabs
- No login required
- Can access protected routes

---

## TC-AUTH-010: Session Timeout
**Priority:** Low
**Type:** Functional

### Preconditions
- User is logged in
- Session timeout is configured

### Test Steps
1. Login to application
2. Leave application idle for session timeout period
3. Try to perform action

### Expected Results
- Session expires after timeout
- User redirected to login page
- Toast notification: "Session expired. Please login again."

---

## TC-AUTH-011: Profile Setup - New User
**Priority:** High
**Type:** Functional

### Preconditions
- User just registered
- User doesn't have first_name/last_name in metadata

### Test Steps
1. Complete registration
2. Redirected to `/setup-profile` page
3. Enter first name
4. Enter last name
5. Click "Save" or "Continue" button

### Expected Results
- Profile data saved to database
- User redirected to appropriate dashboard
- Success toast appears
- Navigation shows user's full name

### Test Data
```
First Name: John
Last Name: Doe
```

---

## TC-AUTH-012: Profile Setup - Skip Not Allowed
**Priority:** Medium
**Type:** Functional

### Preconditions
- User on setup-profile page
- Profile not yet completed

### Test Steps
1. Try navigating to `/dashboard` directly via URL
2. Observe behavior

### Expected Results
- User redirected back to `/setup-profile`
- Cannot access dashboard until profile complete
- Toast: "Please complete your profile first"

---

## TC-AUTH-013: Password Reset Request
**Priority:** Medium
**Type:** Functional

### Preconditions
- User has registered account
- Email service is configured

### Test Steps
1. Navigate to login page
2. Click "Forgot Password?" link
3. Enter registered email
4. Click "Send Reset Link"

### Expected Results
- Success message: "Password reset email sent"
- Email received with reset link
- Link is valid and accessible

### Test Data
```
Email: registered@example.com
```

---

## TC-AUTH-014: Password Reset - Invalid Email
**Priority:** Low
**Type:** Negative

### Test Steps
1. Navigate to forgot password page
2. Enter non-existent email
3. Click "Send Reset Link"

### Expected Results
- Generic success message (for security)
- No email sent
- No error revealing account doesn't exist

---

## TC-AUTH-015: Multi-Device Login
**Priority:** Low
**Type:** Functional

### Test Steps
1. Login on Device A (desktop browser)
2. Login with same credentials on Device B (mobile)
3. Perform actions on both devices

### Expected Results
- User can login on multiple devices
- Both sessions remain active
- Actions sync across devices (if real-time enabled)

---

## Test Summary

| Category | Total Tests | Priority High | Priority Medium | Priority Low |
|----------|-------------|---------------|-----------------|--------------|
| Authentication | 15 | 7 | 5 | 3 |

## Notes for Tester

### Environment Setup
- Ensure test database has clean state
- Create test users for different roles
- Verify email service is configured (or use test mode)

### Test Data Requirements
```sql
-- Admin user
Email: admin@test.com
Password: Admin123!@#
is_admin: true

-- Trainer user
Email: trainer@test.com
Password: Trainer123!@#
is_personal_trainer: true

-- Member user with active membership
Email: member@test.com
Password: Member123!@#
membership_expiry_date: 2026-12-31

-- Member user with expired membership
Email: expired@test.com
Password: Expired123!@#
membership_expiry_date: 2023-01-01
```

### Bug Reporting Template
```
Bug ID: AUTH-XXX
Test Case: TC-AUTH-XXX
Severity: Critical/High/Medium/Low
Steps to Reproduce:
1. ...
2. ...

Expected Result:
Actual Result:
Screenshots/Videos:
Browser/Device:
```
