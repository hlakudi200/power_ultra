# Instructor & Trainer Management Test Cases

## Overview
Test cases for instructor promotion, trainer assignment, and role-based access control for the trainer/instructor system.

---

## TC-INST-001: Promote User to Instructor - Success
**Priority:** High
**Type:** Functional

### Preconditions
- Admin is logged in
- User exists in system (not already an instructor)
- Database functions deployed (`promote_user_to_instructor`)

### Test Steps
1. Navigate to Admin → Instructors page
2. Click "Promote User" button
3. Select user from dropdown
4. Enter instructor details:
   - Display Name: "John Smith"
   - Bio: "Certified personal trainer..."
   - Specializations: "Strength Training, Weight Loss"
   - Certifications: "NASM-CPT, CPR"
   - Toggle "Personal Trainer": ON
   - Hourly Rate: 50.00
   - Max Clients: 15
5. Click "Promote to Instructor" button

### Expected Results
- Success toast: "User promoted to instructor successfully!"
- Dialog closes automatically
- User appears in instructors table with:
  - Account Type: "✓ Linked"
  - Name and details as entered
- User can now log in and access trainer dashboard
- Instructor appears in Members page with purple "Instructor" badge

### Test Data
```
User Email: john.smith@example.com
Display Name: John Smith
Bio: Certified personal trainer with 5 years experience
Specializations: Strength Training, Weight Loss, HIIT
Certifications: NASM-CPT, ACE, CPR
Hourly Rate: 50.00
Max Clients: 15
Years Experience: 5
```

---

## TC-INST-002: Promote User to Instructor - From Members Page
**Priority:** High
**Type:** Functional

### Preconditions
- Admin is logged in
- Member exists (not admin, not instructor)

### Test Steps
1. Navigate to Admin → Members page
2. Find regular member row
3. Click graduation cap icon (🎓) in Actions column
4. Enter instructor details in dialog
5. Click "Promote to Instructor"

### Expected Results
- Success toast appears
- Member row now shows purple "Instructor" badge in Role column
- Graduation cap icon disappears from actions (button hidden)
- User appears in Instructors page
- Member list refreshes automatically

---

## TC-INST-003: Promote User - Duplicate Prevention
**Priority:** High
**Type:** Negative

### Preconditions
- Admin is logged in
- User is already an instructor

### Test Steps
1. Navigate to Admin → Instructors
2. Click "Promote User" button
3. Try to select user who is already instructor

### Expected Results
- User does NOT appear in dropdown (filtered out)
- Only non-instructor users shown in selection list
- Cannot attempt to promote same user twice

**Alternative Test:**
- If somehow promoted via direct function call:
- Error message: "User is already an instructor"
- No duplicate instructor record created

---

## TC-INST-004: Create Standalone Instructor (Guest)
**Priority:** Medium
**Type:** Functional

### Preconditions
- Admin is logged in

### Test Steps
1. Navigate to Admin → Instructors
2. Click "Add Instructor" button (NOT "Promote User")
3. Enter instructor details:
   - Name: "Jane External"
   - Email: "jane@external.com"
   - Phone: "555-1234"
   - Bio: "Guest yoga instructor"
   - Specialties: "Yoga, Meditation"
4. Click "Add Instructor"

### Expected Results
- Instructor created successfully
- Appears in instructors table
- Account Type shows: "○ Guest" (not linked)
- Cannot log into system (no user account)
- Used for external/contract instructors

### Test Data
```
Name: Jane External Trainer
Email: jane.external@gym.com
Phone: 555-9876
Specialties: Yoga, Pilates
Bio: Guest instructor teaching 2 classes per week
```

---

## TC-INST-005: Instructor Login - Trainer Dashboard Access
**Priority:** High
**Type:** Functional

### Preconditions
- User has been promoted to instructor
- Instructor has `is_personal_trainer = true`
- User is logged out

### Test Steps
1. Navigate to home page
2. Click "Login"
3. Enter instructor credentials
4. Click "Sign In"

### Expected Results
- Login successful
- User redirected to `/trainer-dashboard`
- Navigation shows "Trainer Dashboard" option
- Can access trainer-specific features:
  - View assigned clients
  - Create workout plans
  - Manage schedules
- App.tsx correctly detects trainer role via `instructors.user_id` match

### Test Data
```
Email: promoted.instructor@example.com
Password: Trainer123!@#
```

---

## TC-INST-006: Google Auth for Promoted Instructor
**Priority:** High
**Type:** Functional

### Preconditions
- User promoted to instructor
- Google auth configured
- User has Google account linked

### Test Steps
1. Navigate to home page
2. Click "Sign in with Google"
3. Select Google account (matches promoted instructor email)
4. Complete Google authentication

### Expected Results
- Login successful via Google OAuth
- Profile created/matched in `profiles` table
- App.tsx finds matching `instructors.user_id`
- User redirected to trainer dashboard (NOT member dashboard)
- Google auth works correctly for instructors

**This is the key test case that validates the instructor creation fix!**

---

## TC-INST-007: Filter Members by Role - Instructor
**Priority:** Medium
**Type:** Functional

### Preconditions
- Admin logged in
- Multiple members exist with different roles

### Test Steps
1. Navigate to Admin → Members
2. Click role filter dropdown
3. Select "Instructors"

### Expected Results
- Table shows only members with purple "Instructor" badge
- Admins filtered out
- Regular members filtered out
- Count matches number of promoted instructors
- Search still works within filtered results

---

## TC-INST-008: Assign Trainer to Member - Success
**Priority:** High
**Type:** Functional

### Preconditions
- Admin logged in
- Active instructor exists with `is_personal_trainer = true`
- Member exists without trainer

### Test Steps
1. Navigate to Admin → Members
2. Find member row
3. Click trainer icon (👥) in Actions column
4. Select trainer from dropdown
5. Select start date
6. Click "Assign Trainer"

### Expected Results
- Success toast: "Trainer assigned successfully"
- "Assigned Trainer" column shows trainer name
- Unassign button (X) appears next to trainer name
- Trainer can see member in their client list
- Member can view trainer's workout plans

### Test Data
```
Member: john.doe@example.com
Trainer: Jane Smith (Instructor)
Start Date: Today's date
```

---

## TC-INST-009: Unassign Trainer from Member
**Priority:** High
**Type:** Functional

### Preconditions
- Member has assigned trainer
- Admin logged in

### Test Steps
1. Navigate to Admin → Members
2. Find member with assigned trainer
3. Click X icon next to trainer name in "Assigned Trainer" column
4. Confirm unassignment in dialog

### Expected Results
- Confirmation dialog: "Are you sure you want to unassign this trainer?"
- After confirm:
  - Success toast: "Trainer unassigned successfully"
  - "Assigned Trainer" column changes to "-"
  - `trainer_assignments.status` updated to "completed"
  - Member removed from trainer's client list
  - Table refreshes automatically

---

## TC-INST-010: View Assigned Trainer - Member Perspective
**Priority:** Medium
**Type:** Functional

### Preconditions
- Member logged in
- Member has assigned trainer

### Test Steps
1. Login as member
2. Navigate to dashboard
3. View trainer section

### Expected Results
- Dashboard shows assigned trainer information
- Can view trainer's profile
- Can see assigned workout plans
- Can communicate with trainer (if messaging enabled)

---

## TC-INST-011: Instructor Visibility in Members Table
**Priority:** Medium
**Type:** Functional

### Preconditions
- Admin logged in
- Members with various roles exist

### Test Steps
1. Navigate to Admin → Members
2. Observe "Role" column for different users

### Expected Results
- **Admin users:** Blue "Admin" badge
- **Instructors:** Purple "Instructor" badge with 🎓 icon
- **Both Admin & Instructor:** Both badges displayed
- **Regular members:** Plain text "Member"
- Badges are color-coded and easily distinguishable

---

## TC-INST-012: Promote Button Hidden for Instructors
**Priority:** Medium
**Type:** Functional

### Preconditions
- Admin logged in
- Both instructors and regular members exist

### Test Steps
1. Navigate to Admin → Members
2. Find row for regular member
3. Observe Actions column
4. Find row for instructor
5. Observe Actions column

### Expected Results
- **Regular member:** Graduation cap (🎓) icon visible
- **Instructor:** Graduation cap icon HIDDEN
- **Admin:** Graduation cap icon HIDDEN
- Prevents accidental re-promotion
- UI adapts based on user role

---

## TC-INST-013: Instructor Account Types in Instructors Table
**Priority:** Medium
**Type:** Functional

### Preconditions
- Admin logged in
- Both linked and guest instructors exist

### Test Steps
1. Navigate to Admin → Instructors
2. Observe "Account Type" column

### Expected Results
- **Promoted instructors:** "✓ Linked" with green checkmark
- **Standalone instructors:** "○ Guest" with gray indicator
- Clear visual distinction between types
- Linked instructors can log in
- Guest instructors cannot log in

---

## TC-INST-014: Deactivate Instructor - With Active Clients
**Priority:** Medium
**Type:** Negative

### Preconditions
- Instructor has active trainer assignments
- Admin logged in

### Test Steps
1. Navigate to Admin → Instructors
2. Find instructor with active clients
3. Click toggle to deactivate
4. Confirm deactivation

### Expected Results
- Error message: "Cannot deactivate instructor with active client assignments"
- Instructor remains active
- Must unassign all clients first before deactivation allowed
- Protects data integrity

---

## TC-INST-015: Deactivate Instructor - No Active Clients
**Priority:** Medium
**Type:** Functional

### Preconditions
- Instructor has NO active assignments
- Admin logged in

### Test Steps
1. Navigate to Admin → Instructors
2. Find instructor without clients
3. Click toggle to deactivate
4. Confirm deactivation

### Expected Results
- Success toast: "Instructor deactivated successfully"
- Status changes to "Inactive"
- Instructor cannot access trainer dashboard
- Does not appear in trainer assignment dropdowns
- Can be reactivated later

---

## TC-INST-016: Multiple Trainer Assignments
**Priority:** Low
**Type:** Negative

### Preconditions
- Member already has assigned trainer
- Admin attempts to assign another trainer

### Test Steps
1. Navigate to Admin → Members
2. Find member with assigned trainer
3. Click assign trainer icon
4. Try to assign different trainer

### Expected Results
- Warning or error message
- Member can only have ONE active trainer at a time
- Must unassign current trainer before assigning new one
- OR system automatically replaces previous assignment

---

## TC-INST-017: Non-Admin Cannot Promote Users
**Priority:** High
**Type:** Security

### Preconditions
- Regular member logged in
- NOT admin

### Test Steps
1. Try to access Admin → Instructors page
2. If accessible, try clicking "Promote User"

### Expected Results
- **Option 1:** Cannot access admin pages (redirected)
- **Option 2:** "Promote User" button not visible
- **Option 3:** RPC function call fails with: "Only admins can create instructors"
- Security enforced at database level
- Regular users cannot bypass restrictions

---

## TC-INST-018: Instructor Profile Update
**Priority:** Medium
**Type:** Functional

### Preconditions
- Admin logged in
- Instructor exists

### Test Steps
1. Navigate to Admin → Instructors
2. Click edit icon for instructor
3. Update details:
   - Change bio
   - Update specializations
   - Change hourly rate
4. Click "Save Changes"

### Expected Results
- Success toast: "Instructor updated successfully"
- Changes reflected in instructors table
- Updated information visible to members
- `updated_at` timestamp refreshed

---

## TC-INST-019: Get Non-Instructor Users Function
**Priority:** Medium
**Type:** Functional

### Preconditions
- Database has mix of users, admins, and instructors

### Test Steps
1. Login as admin
2. Open "Promote User" dialog
3. Observe dropdown list

### Expected Results
- Only shows users who are NOT instructors
- Admins excluded from list
- Existing instructors excluded
- Each user shows: Name + Email
- Function `get_non_instructor_users()` works correctly

---

## TC-INST-020: Search Within Filtered Results
**Priority:** Low
**Type:** Functional

### Preconditions
- Admin logged in
- Multiple instructors exist

### Test Steps
1. Navigate to Admin → Members
2. Select filter: "Instructors"
3. Type in search box: "John"

### Expected Results
- Shows only instructors whose name contains "John"
- Both filter AND search applied together
- Results update dynamically as user types
- Clear search shows all instructors again

---

## TC-INST-021: Assigned Trainer Column Visibility
**Priority:** Medium
**Type:** Functional

### Preconditions
- Admin logged in
- Mix of members (with/without trainers)

### Test Steps
1. Navigate to Admin → Members
2. Observe "Assigned Trainer" column

### Expected Results
- **Member with trainer:** Shows trainer name + unassign button (X)
- **Member without trainer:** Shows "-"
- Column always visible (not hidden)
- Easy to see assignment status at a glance
- No need to click each member to check

---

## Test Summary

| Category | Total Tests | Priority High | Priority Medium | Priority Low |
|----------|-------------|---------------|-----------------|--------------|
| Instructor Management | 21 | 10 | 10 | 1 |

## Notes for Tester

### Environment Setup
- Ensure database functions are deployed:
  - `promote_user_to_instructor()`
  - `deactivate_instructor()`
  - `reactivate_instructor()`
  - `get_non_instructor_users()`
  - `update_instructor_details()`
- Verify RLS policies on `instructors` table
- Confirm `trainer_assignments` table exists

### Test Data Requirements

```sql
-- Admin User
INSERT INTO profiles (id, email, full_name, is_admin)
VALUES ('admin-uuid', 'admin@test.com', 'Admin User', true);

-- Regular Member (to be promoted)
INSERT INTO profiles (id, email, full_name, first_name, last_name)
VALUES ('member-uuid', 'member@test.com', 'John Doe', 'John', 'Doe');

-- Existing Instructor (already promoted)
INSERT INTO profiles (id, email, full_name)
VALUES ('instructor-uuid', 'trainer@test.com', 'Jane Smith');

INSERT INTO instructors (id, user_id, name, is_personal_trainer, is_active)
VALUES ('inst-uuid', 'instructor-uuid', 'Jane Smith', true, true);

-- Guest Instructor (no user account)
INSERT INTO instructors (id, user_id, name, email, is_active)
VALUES ('guest-uuid', NULL, 'External Yoga Teacher', 'yoga@external.com', true);

-- Member with Assigned Trainer
INSERT INTO trainer_assignments (id, member_id, trainer_id, status, start_date)
VALUES ('assignment-uuid', 'member-uuid', 'inst-uuid', 'active', NOW());
```

### Critical Paths to Test

1. **Instructor Creation Flow:**
   - User signup → Admin promotes → User logs in → Sees trainer dashboard

2. **Google Auth Flow:**
   - User signs up with Google → Admin promotes → User signs in with Google → Trainer dashboard

3. **Trainer Assignment Flow:**
   - Admin assigns trainer → Member sees trainer → Admin unassigns → Trainer removed

4. **Role Visibility Flow:**
   - Member promoted → Badge appears → Filter works → Promote button hides

### Known Issues / Edge Cases

1. **Race Condition:** If user is promoted while logged in, may need to log out/in to see changes
2. **Google Auth Cache:** Browser may cache old role, clear cookies if issues occur
3. **RLS Policies:** Ensure policies allow admins to read/write instructors table
4. **Null user_id:** Guest instructors have `user_id = NULL`, handle gracefully

### Bug Reporting Template

```
Bug ID: INST-XXX
Test Case: TC-INST-XXX
Severity: Critical/High/Medium/Low

Steps to Reproduce:
1. ...
2. ...
3. ...

Expected Result:
Actual Result:

Environment:
- Browser: Chrome 120
- OS: Windows 11
- User Role: Admin/Member/Instructor
- Database State: [Describe relevant data]

Screenshots/Videos:
Console Errors:
Network Requests: [If relevant]
```

### Regression Test Checklist

After ANY changes to instructor/trainer system, verify:
- ✅ Admin can promote users to instructors
- ✅ Promoted instructors can log in and access trainer dashboard
- ✅ Google auth works for promoted instructors
- ✅ Instructor badges visible in Members table
- ✅ Filter by instructor works
- ✅ Promote button hidden for existing instructors
- ✅ Trainer assignment/unassignment works
- ✅ Assigned trainer visible in table
- ✅ Guest instructors vs linked instructors distinction clear
- ✅ Cannot deactivate instructor with active clients

### Performance Considerations

- **fetchMembers():** 3 parallel database queries (profiles, instructors, assignments)
- Monitor performance with 100+ members, 50+ instructors
- Consider pagination if slow
- Index on `instructors.user_id` for fast lookups
- Index on `trainer_assignments.member_id` and `trainer_id`

---

## Acceptance Criteria

System is considered passing if:
1. All HIGH priority tests pass (10/10)
2. At least 80% of MEDIUM priority tests pass (8/10)
3. No CRITICAL bugs found
4. Google auth flow works end-to-end for instructors
5. No duplicate instructor records created
6. All role badges display correctly
7. Trainer assignment/unassignment works reliably
