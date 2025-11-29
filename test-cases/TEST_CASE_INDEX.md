# Test Case Index - Quick Reference

## Complete Test Case List

**Total Test Cases:** 94
**Last Updated:** November 2024

---

## Authentication Tests (15 cases)

**Document:** `01_AUTHENTICATION_TESTS.md`

| ID | Test Case Name | Priority | Type |
|----|----------------|----------|------|
| TC-AUTH-001 | User Registration - Success | High | Functional |
| TC-AUTH-002 | User Registration - Duplicate Email | High | Negative |
| TC-AUTH-003 | User Registration - Invalid Email | Medium | Negative |
| TC-AUTH-004 | User Registration - Weak Password | Medium | Negative |
| TC-AUTH-005 | User Login - Success | High | Functional |
| TC-AUTH-006 | User Login - Wrong Password | High | Negative |
| TC-AUTH-007 | User Login - Non-existent Account | Medium | Negative |
| TC-AUTH-008 | User Logout | High | Functional |
| TC-AUTH-009 | Session Persistence | Medium | Functional |
| TC-AUTH-010 | Session Timeout | Low | Functional |
| TC-AUTH-011 | Profile Setup - New User | High | Functional |
| TC-AUTH-012 | Profile Setup - Skip Not Allowed | Medium | Functional |
| TC-AUTH-013 | Password Reset Request | Medium | Functional |
| TC-AUTH-014 | Password Reset - Invalid Email | Low | Negative |
| TC-AUTH-015 | Multi-Device Login | Low | Functional |

---

## Role-Based Routing Tests (23 cases)

**Document:** `02_ROLE_BASED_ROUTING_TESTS.md`

| ID | Test Case Name | Priority | Type |
|----|----------------|----------|------|
| TC-ROUTE-001 | Admin Login - Auto Redirect to Admin Dashboard | High | Functional |
| TC-ROUTE-002 | Trainer Login - Auto Redirect to Trainer Dashboard | High | Functional |
| TC-ROUTE-003 | Member Login - Auto Redirect to Member Dashboard | High | Functional |
| TC-ROUTE-004 | Admin + Trainer Role - Priority Check | High | Functional |
| TC-ROUTE-005 | Admin Manual Navigation to Member Dashboard | High | Functional |
| TC-ROUTE-006 | Admin Manual Navigation to Trainer Dashboard | High | Functional |
| TC-ROUTE-007 | Trainer Manual Navigation to Member Dashboard | High | Functional |
| TC-ROUTE-008 | Trainer Manual Navigation to Admin Dashboard | High | Negative |
| TC-ROUTE-009 | Member Manual Navigation to Admin Dashboard | High | Negative |
| TC-ROUTE-010 | Member Manual Navigation to Trainer Dashboard | Medium | Negative |
| TC-ROUTE-011 | Member Without Active Membership - Dashboard Access | High | Negative |
| TC-ROUTE-012 | Trainer With Expired Membership - Dashboard Access | Medium | Functional |
| TC-ROUTE-013 | Admin With Expired Membership - Dashboard Access | Medium | Functional |
| TC-ROUTE-014 | Direct URL Access - Unauthenticated User to Dashboard | High | Negative |
| TC-ROUTE-015 | Direct URL Access - Unauthenticated User to Admin | High | Negative |
| TC-ROUTE-016 | Direct URL Access - Unauthenticated User to Trainer Dashboard | High | Negative |
| TC-ROUTE-017 | Logout and Re-login - Role Persistence | Medium | Functional |
| TC-ROUTE-018 | Browser Back Button After Redirect | Medium | Functional |
| TC-ROUTE-019 | Refresh Page on Dashboard | Medium | Functional |
| TC-ROUTE-020 | Role Change While Logged In | Low | Edge Case |
| TC-ROUTE-021 | Index Page Redirect - Logged In User | High | Functional |
| TC-ROUTE-022 | Loading State During Role Check | Medium | UI/UX |
| TC-ROUTE-023 | Network Error During Role Check | Low | Error Handling |

---

## Workout Tracking Tests (28 cases)

**Document:** `03_WORKOUT_TRACKING_TESTS.md`

| ID | Test Case Name | Priority | Type |
|----|----------------|----------|------|
| TC-WORKOUT-001 | View Active Workout Plan | High | Functional |
| TC-WORKOUT-002 | No Active Workout Plan | High | Functional |
| TC-WORKOUT-003 | View Weekly Schedule Tabs | High | Functional |
| TC-WORKOUT-004 | View Rest Day | Medium | Functional |
| TC-WORKOUT-005 | View Day's Exercises | High | Functional |
| TC-WORKOUT-006 | Log Workout - First Time | High | Functional |
| TC-WORKOUT-007 | Log Workout - Duplicate Same Day (Update) | High | Functional |
| TC-WORKOUT-008 | Log Workout - Minimal Data | Medium | Functional |
| TC-WORKOUT-009 | Log Workout - Invalid Data | Medium | Negative |
| TC-WORKOUT-010 | Weekly Progress Calculation | High | Functional |
| TC-WORKOUT-011 | Week Completion - 100% | Medium | Functional |
| TC-WORKOUT-012 | Week Completion - 0% | Medium | Functional |
| TC-WORKOUT-013 | Week Transition | High | Functional |
| TC-WORKOUT-014 | Exercise Completion Visual States | High | UI/UX |
| TC-WORKOUT-015 | Day Progress Indicator | Medium | Functional |
| TC-WORKOUT-016 | Exercise Details Display | High | Functional |
| TC-WORKOUT-017 | Plan Goals Display | Medium | Functional |
| TC-WORKOUT-018 | Plan Description Display | Medium | Functional |
| TC-WORKOUT-019 | No Description or Goals | Low | Functional |
| TC-WORKOUT-020 | Rating Stars Interaction | Medium | UI/UX |
| TC-WORKOUT-021 | Exercise History | Low | Functional |
| TC-WORKOUT-022 | Personal Records | Low | Functional |
| TC-WORKOUT-023 | Multiple Plans - Only Active Shows | Medium | Functional |
| TC-WORKOUT-024 | Loading State | Medium | UI/UX |
| TC-WORKOUT-025 | Error State - Failed to Load | Medium | Error Handling |
| TC-WORKOUT-026 | Week Date Range Display | Low | Functional |
| TC-WORKOUT-027 | Completion Persistence | High | Functional |
| TC-WORKOUT-028 | Log Workout - Close Dialog Without Saving | Low | Functional |

---

## Mobile UI Tests (28 cases)

**Document:** `04_MOBILE_UI_TESTS.md`

| ID | Test Case Name | Priority | Type |
|----|----------------|----------|------|
| TC-MOBILE-001 | Touch Target Size - Buttons | High | UI/UX |
| TC-MOBILE-002 | Rating Stars - Touch Interaction | High | UI/UX |
| TC-MOBILE-003 | Dialog Layout - Mobile | High | Responsive Design |
| TC-MOBILE-004 | Button Stacking - Mobile | High | Responsive Design |
| TC-MOBILE-005 | Desktop Button Order | Medium | Responsive Design |
| TC-MOBILE-006 | Exercise Cards - Mobile Layout | High | Responsive Design |
| TC-MOBILE-007 | Weekly Tabs - Mobile Layout | High | Responsive Design |
| TC-MOBILE-008 | Text Sizing - Responsive | Medium | Responsive Design |
| TC-MOBILE-009 | Form Inputs - Mobile | High | UI/UX |
| TC-MOBILE-010 | Scrolling - Long Content | High | Functional |
| TC-MOBILE-011 | Landscape Orientation | Medium | Responsive Design |
| TC-MOBILE-012 | Tablet Layout (768px - 1024px) | Medium | Responsive Design |
| TC-MOBILE-013 | Completion Badge - Mobile | Low | UI/UX |
| TC-MOBILE-014 | Progress Bar - Mobile | Medium | UI/UX |
| TC-MOBILE-015 | Navigation Menu - Mobile | High | Responsive Design |
| TC-MOBILE-016 | Tap Feedback - Visual | High | UI/UX |
| TC-MOBILE-017 | Modal Overlay - Mobile | Medium | UI/UX |
| TC-MOBILE-018 | Loading States - Mobile | Medium | UI/UX |
| TC-MOBILE-019 | Error Messages - Mobile | Medium | UI/UX |
| TC-MOBILE-020 | Toast Notifications - Mobile | Medium | UI/UX |
| TC-MOBILE-021 | Image Scaling - Mobile | Low | Responsive Design |
| TC-MOBILE-022 | Grid Layouts - Mobile | Medium | Responsive Design |
| TC-MOBILE-023 | Workout Plan Header - Mobile | Medium | Responsive Design |
| TC-MOBILE-024 | Horizontal Overflow Prevention | High | Bug Prevention |
| TC-MOBILE-025 | Font Scaling - Accessibility | Low | Accessibility |
| TC-MOBILE-026 | Dark Mode - Mobile | Low | UI/UX |
| TC-MOBILE-027 | Pull to Refresh | Low | Feature |
| TC-MOBILE-028 | Mobile Performance | High | Performance |

---

## Test Priority Breakdown

| Priority | Count | Percentage |
|----------|-------|------------|
| High | 47 | 50% |
| Medium | 34 | 36% |
| Low | 13 | 14% |

---

## Test Type Breakdown

| Type | Count |
|------|-------|
| Functional | 56 |
| UI/UX | 16 |
| Negative | 10 |
| Responsive Design | 10 |
| Error Handling | 2 |

---

## Test Execution Priority Order

### Phase 1: Critical Path (Must Test First)
1. TC-AUTH-001, 005, 008 (Login/Logout)
2. TC-ROUTE-001, 002, 003 (Role-based redirects)
3. TC-WORKOUT-006, 007 (Log workout & duplicate prevention)
4. TC-MOBILE-001, 004, 024 (Touch targets, stacking, overflow)

### Phase 2: Core Features
1. All remaining High priority Authentication tests
2. All remaining High priority Routing tests
3. All remaining High priority Workout tests
4. All remaining High priority Mobile tests

### Phase 3: Additional Coverage
1. All Medium priority tests across categories
2. Edge cases and error handling

### Phase 4: Nice to Have
1. All Low priority tests
2. Additional exploratory testing

---

## Quick Search by Feature

### Login & Authentication
- TC-AUTH-001 through TC-AUTH-015

### Auto-Redirect by Role
- TC-ROUTE-001, 002, 003, 004, 021

### Preventing Unauthorized Access
- TC-ROUTE-005 through TC-ROUTE-016

### Workout Plan Viewing
- TC-WORKOUT-001, 002, 003, 004, 005

### Logging Workouts
- TC-WORKOUT-006, 007, 008, 009

### Weekly Progress
- TC-WORKOUT-010, 011, 012, 013

### Mobile Touch Interactions
- TC-MOBILE-001, 002, 009, 016

### Mobile Layouts
- TC-MOBILE-003, 004, 005, 006, 007

### Mobile Performance
- TC-MOBILE-024, 028

---

## Bug Statistics Template

Use this to track bugs found during testing:

### Bugs by Test Category
| Category | Bugs Found | Critical | High | Medium | Low |
|----------|-----------|----------|------|--------|-----|
| Authentication | | | | | |
| Role-Based Routing | | | | | |
| Workout Tracking | | | | | |
| Mobile UI | | | | | |
| **TOTAL** | | | | | |

### Bugs by Type
| Type | Count |
|------|-------|
| Functionality Broken | |
| Visual/UI Issue | |
| Performance Issue | |
| Data Issue | |
| Security Issue | |
| Accessibility Issue | |

---

## Test Coverage Map

### User Flows Covered

**New User Journey:**
1. TC-AUTH-001 (Register)
2. TC-AUTH-011 (Setup profile)
3. TC-ROUTE-003 (Redirect to dashboard)
4. TC-WORKOUT-002 (No plan message)

**Member Workout Flow:**
1. TC-AUTH-005 (Login)
2. TC-ROUTE-003 (Redirect to dashboard)
3. TC-WORKOUT-001 (View plan)
4. TC-WORKOUT-005 (View exercises)
5. TC-WORKOUT-006 (Log workout)
6. TC-WORKOUT-010 (See progress)

**Trainer Workflow:**
1. TC-AUTH-005 (Login)
2. TC-ROUTE-002 (Redirect to trainer dashboard)
3. Create workout plan (tested separately)
4. View client progress

**Admin Workflow:**
1. TC-AUTH-005 (Login)
2. TC-ROUTE-001 (Redirect to admin)
3. Manage members, classes, etc.

---

## Regression Test Suite

After any code changes, re-run these critical tests:

### Smoke Test (15 minutes)
- TC-AUTH-005 (Login)
- TC-ROUTE-001 (Admin redirect)
- TC-ROUTE-002 (Trainer redirect)
- TC-ROUTE-003 (Member redirect)
- TC-WORKOUT-006 (Log workout)
- TC-MOBILE-024 (No horizontal scroll)

### Full Regression (2-3 hours)
All High priority tests across all categories.

---

## Test Case Relationships

### Dependent Test Cases

**These require previous tests to pass:**

TC-WORKOUT-007 depends on TC-WORKOUT-006
(Can't test duplicate prevention without first successful log)

TC-ROUTE-005 depends on TC-ROUTE-001
(Admin must be able to login before testing redirect)

TC-WORKOUT-013 depends on TC-WORKOUT-006
(Need to log workouts to test week transition)

### Independent Test Cases

**These can be run in any order:**
- All authentication tests (TC-AUTH-*)
- Most routing tests
- Most mobile UI tests

---

## Notes

- Test case IDs are permanent and should not be reused
- New test cases should be added to end of category
- Always test on clean data state
- Document any deviations from expected results
- Update this index when new tests are added

---

**Last Updated:** November 2024
**Next Review:** After major feature additions
