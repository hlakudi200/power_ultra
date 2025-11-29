# Bug Report Template

Use this template to report bugs found during testing.

---

## Bug Information

**Bug ID:** [AUTO-GENERATED or BUG-XXX]
**Report Date:** [Date]
**Reported By:** [Tester Name]
**Test Case:** TC-[CATEGORY]-[NUMBER]
**Feature/Module:** [Feature name]

---

## Bug Details

### Title
**[Clear, concise title describing the issue]**

Example: "Login button disabled after entering valid credentials"

### Severity
**Select One:**
- [ ] 🔴 **Critical (P0)** - System crash, data loss, security issue, cannot login
- [ ] 🟠 **High (P1)** - Major feature broken, affects many users, no workaround
- [ ] 🟡 **Medium (P2)** - Feature partially broken, workaround exists, affects some users
- [ ] 🟢 **Low (P3)** - Minor visual issue, cosmetic, edge case

### Priority
**Select One:**
- [ ] **P0** - Fix immediately, blocks testing/release
- [ ] **P1** - Fix before release
- [ ] **P2** - Fix if time permits
- [ ] **P3** - Fix in future release

### Type
**Select One:**
- [ ] Functional Bug
- [ ] UI/Visual Bug
- [ ] Performance Issue
- [ ] Security Issue
- [ ] Data Integrity Issue
- [ ] Compatibility Issue
- [ ] Usability Issue
- [ ] Responsive Design Issue
- [ ] Other: [Specify]

---

## Environment

### Browser/Device Information

| Field | Value |
|-------|-------|
| Browser | [e.g., Chrome 119.0] |
| Operating System | [e.g., Windows 11 / iOS 17 / Android 13] |
| Device | [e.g., Desktop / iPhone 13 / Galaxy S22] |
| Screen Resolution | [e.g., 1920x1080 / 390x844] |
| Viewport Size | [e.g., 1920px / 375px] |

### Application Information

| Field | Value |
|-------|-------|
| Environment | [Development / Staging / Production] |
| URL | [Full URL where bug occurred] |
| Version/Build | [e.g., v1.0.0 / Release Candidate 1] |
| Database | [Test DB / Staging DB] |

### User Account

| Field | Value |
|-------|-------|
| User Type | [Admin / Trainer / Member] |
| Email | [test account email] |
| User ID | [If known] |

---

## Reproduction Steps

**Preconditions:**
- [Any setup required before reproducing]
- [Example: User must have active membership]
- [Example: Class must be at full capacity]

**Steps to Reproduce:**
1. [First step - be specific]
2. [Second step - include exact values entered]
3. [Third step - describe actions taken]
4. [Continue numbering for all steps]

**Example:**
```
1. Navigate to https://test.powerultragym.com
2. Click "Login" button in navigation
3. Enter email: "member@test.com"
4. Enter password: "Test123!@#"
5. Click "Sign In" button
6. Observe the button state
```

---

## Expected vs Actual Results

### Expected Result
**What SHOULD happen:**

[Describe the expected behavior clearly]

Example: "Button should process login and redirect user to /dashboard"

### Actual Result
**What ACTUALLY happens:**

[Describe what actually occurred]

Example: "Button remains disabled, no redirect occurs, no error message shown"

---

## Impact

**Business Impact:**
[Describe how this affects the business/users]

Example: "Users cannot login, blocking all functionality. Critical blocker for production release."

**Affected Users:**
- [ ] All users
- [ ] Admin users only
- [ ] Trainer users only
- [ ] Member users only
- [ ] Mobile users only
- [ ] Desktop users only
- [ ] Specific browser users: [Specify]

**Frequency:**
- [ ] Always happens (100%)
- [ ] Usually happens (>75%)
- [ ] Sometimes happens (25-75%)
- [ ] Rarely happens (<25%)

---

## Evidence

### Screenshots

**Screenshot 1:** [Attach or link to screenshot]
- Description: [What screenshot shows]

**Screenshot 2:** [Attach or link to screenshot]
- Description: [What screenshot shows]

### Video Recording

**Video Link:** [Link to screen recording]
- Description: [What video demonstrates]

### Console Errors

```
[Paste console errors here]

Example:
Uncaught TypeError: Cannot read property 'id' of undefined
    at Login.tsx:45
    at onClick (Button.tsx:12)
```

### Network Errors

**Failed Request:**
```
Request URL: https://api.powerultragym.com/auth/login
Status Code: 500 Internal Server Error
Response: {"error": "Database connection timeout"}
```

### Database State (If Applicable)

```sql
-- Query to show issue in database
SELECT * FROM bookings WHERE user_id = 'xxx';

-- Result showing problem
```

---

## Additional Information

### Workaround
**Is there a workaround?**
- [ ] Yes - [Describe workaround]
- [ ] No workaround available

**Workaround Steps:**
1. [Step 1]
2. [Step 2]

### Related Bugs
**Related to:**
- BUG-XXX: [Title]
- BUG-YYY: [Title]

### First Occurrence
- [ ] First time seeing this bug
- [ ] Seen before in: [Previous build/version]
- [ ] Regression from: [Previous working version]

### Reproducibility
- [ ] Reproduces every time
- [ ] Reproduces intermittently
- [ ] Cannot reproduce consistently

### Notes
[Any additional context, observations, or information]

Example:
- Bug only occurs when class is exactly at capacity (20/20)
- Works fine on Chrome, fails on Safari
- Issue started after recent deployment on Nov 20

---

## Root Cause Analysis (For Developers)

**Root Cause:** [To be filled by developer]

**Code Location:** [File path and line number]

**Fix Description:** [Brief description of fix]

**Fix Verification:** [How to verify fix works]

---

## Testing Notes

### Regression Testing Required?
- [ ] Yes - Test cases: [List test cases to retest]
- [ ] No

### Test Cases to Update?
- [ ] Yes - [Which test cases need updating]
- [ ] No

---

## Status Tracking

| Field | Value |
|-------|-------|
| Current Status | Open / In Progress / Resolved / Closed |
| Assigned To | [Developer name] |
| Target Fix Date | [Date] |
| Actual Fix Date | [Date] |
| Fixed in Build | [Build/Version number] |
| Verified By | [Tester name] |
| Verification Date | [Date] |

---

## Developer Response

**Developer Comments:**
[Developer's notes about the bug]

**Code Changes:**
- [File 1] - [Description of change]
- [File 2] - [Description of change]

**Deployment Date:** [Date]

---

## Verification

**Verified By:** [Tester name]
**Verification Date:** [Date]
**Verification Status:** ✅ VERIFIED / ❌ NOT FIXED / ⚠️ PARTIALLY FIXED

**Verification Notes:**
[Any notes from verification testing]

**Regression Impact:**
- [ ] No new issues introduced
- [ ] New issues found: [List bug IDs]

---

## Sign-off

**Reported By:** [Tester signature] | Date: [Date]
**Verified By:** [Tester signature] | Date: [Date]
**Closed By:** [Project Manager signature] | Date: [Date]

---

## Attachments

1. [Screenshot1.png]
2. [Video_recording.mp4]
3. [Console_log.txt]
4. [Network_trace.har]

---

**Bug Report Version:** 1.0
**Template Last Updated:** November 2024

---

*End of Bug Report*

---

## Quick Reference - Bug Severity Guidelines

### 🔴 Critical (P0)
- Application crashes or freezes
- Data loss or corruption
- Security vulnerabilities
- Cannot login / complete authentication
- Complete feature failure (0% working)
- Production deployment blocked

### 🟠 High (P1)
- Major feature broken (>50% not working)
- Affects majority of users
- No workaround available
- Serious usability issue
- Incorrect calculations/data
- Major performance degradation

### 🟡 Medium (P2)
- Feature partially works (some scenarios fail)
- Affects some users
- Workaround exists but inconvenient
- Moderate usability issue
- Minor performance issue
- UI inconsistency affecting function

### 🟢 Low (P3)
- Cosmetic/visual issues
- Typos or grammar
- Minor UI inconsistencies
- Edge case scenarios
- Enhancement requests
- Nice-to-have improvements

---

## Bug Lifecycle

```
1. NEW (Just reported)
      ↓
2. OPEN (Confirmed by dev team)
      ↓
3. IN PROGRESS (Developer working on fix)
      ↓
4. RESOLVED (Fix deployed to test environment)
      ↓
5. VERIFIED (Tester confirmed fix works)
      ↓
6. CLOSED (Bug is done)

Alternative paths:
- REJECTED (Not a bug / Working as designed)
- DEFERRED (Fix postponed to future release)
- DUPLICATE (Same as another bug)
```
