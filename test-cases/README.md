# Power Ultra Gym - Test Cases Documentation

## Welcome Tester! 👋

This folder contains comprehensive test documentation for the Power Ultra Gym application.

---

## 📁 Folder Contents

### Getting Started Documents

1. **`00_FEATURE_OVERVIEW.md`** ⭐ **START HERE**
   - Complete overview of the application
   - User roles and capabilities
   - All features explained
   - Recent enhancements
   - Database schema overview
   - Testing priorities

2. **`TESTING_CHECKLIST.md`** ⭐ **USE THIS DAILY**
   - Step-by-step testing guide
   - Execution order
   - Daily report templates
   - Bug report templates
   - Smoke test checklist
   - Sign-off criteria

---

### Test Case Documents

3. **`01_AUTHENTICATION_TESTS.md`**
   - **15 test cases**
   - Login, registration, logout
   - Password reset
   - Session management
   - Profile setup

4. **`02_ROLE_BASED_ROUTING_TESTS.md`**
   - **23 test cases**
   - Auto-redirect functionality
   - Access control
   - Role priorities (admin vs trainer vs member)
   - Edge cases

5. **`03_WORKOUT_TRACKING_TESTS.md`**
   - **28 test cases**
   - Viewing workout plans
   - Logging workouts
   - Weekly progress tracking
   - Duplicate prevention
   - Week transitions

6. **`04_MOBILE_UI_TESTS.md`**
   - **28 test cases**
   - Touch target sizes
   - Responsive layouts
   - Mobile interactions
   - Cross-device testing

7. **`05_CLASS_BOOKING_TESTS.md`** ⭐ NEW
   - **28 test cases**
   - Browse and filter classes
   - Book and cancel bookings
   - Capacity management
   - Next occurrence calculation
   - Booking history

8. **`06_WAITLIST_TESTS.md`** ⭐ NEW
   - **28 test cases**
   - Join and leave waitlist
   - Automatic notifications
   - Position tracking
   - Edge function processing
   - Waitlist ordering

---

## 🚀 Quick Start Guide

### Step 1: Read Overview
```
📖 Read: 00_FEATURE_OVERVIEW.md
⏱️ Time: 30 minutes
```

This gives you context about the application, user roles, and what features exist.

---

### Step 2: Set Up Environment
```
✅ Create test user accounts
✅ Verify database access
✅ Set up browser testing tools
✅ Prepare mobile devices
```

See `TESTING_CHECKLIST.md` → "Pre-Testing Setup" section for details.

---

### Step 3: Start Testing
```
Day 1-2: Authentication + Role-Based Routing
Day 3-4: Workout Tracking + Plan Creation
Day 5: Mobile UI Testing
Day 6-7: Additional Features
Day 8: Regression + Cross-Browser
```

Follow the execution order in `TESTING_CHECKLIST.md`.

---

### Step 4: Report Bugs
```
Use the bug report template in TESTING_CHECKLIST.md
Include: screenshots, steps, environment details
Log in bug tracking system
```

---

## 📊 Test Coverage Summary

| Test Suite | Test Cases | Priority | Estimated Time |
|------------|-----------|----------|----------------|
| Authentication | 15 | Critical | 2-3 hours |
| Role-Based Routing | 23 | Critical | 3-4 hours |
| Workout Tracking | 28 | Critical | 4-5 hours |
| Mobile UI | 28 | Critical | 4-5 hours |
| Class Booking | 28 | Critical | 4-5 hours |
| Waitlist System | 28 | High | 3-4 hours |
| **TOTAL** | **150** | - | **21-26 hours** |

---

## 🎯 Testing Priorities

### Must Test (Critical)
1. ✅ Authentication (can users login?)
2. ✅ Role-based routing (right dashboards?)
3. ✅ Workout logging (core feature works?)
4. ✅ Mobile UI (usable on phones?)

### Should Test (High)
5. Class booking
6. Trainer assignment
7. Workout plan creation
8. Member management

### Nice to Test (Medium/Low)
9. Analytics
10. Settings
11. Notifications

---

## 🧪 Test User Accounts

Use these credentials for testing:

```
ADMIN
Email: admin@test.com
Password: Admin123!@#
Route: /admin

TRAINER
Email: trainer@test.com
Password: Trainer123!@#
Route: /trainer-dashboard

MEMBER (Active)
Email: member@test.com
Password: Member123!@#
Route: /dashboard

MEMBER (Expired)
Email: expired@test.com
Password: Expired123!@#
Route: / (denied)
```

---

## 📱 Devices to Test

### Mobile
- iPhone SE (320px) - Smallest
- iPhone 12/13 (390px) - Most common
- Android phone (360px-412px)

### Tablet
- iPad (768px)
- Android tablet

### Desktop
- 1920px+ (standard desktop)

---

## 🌐 Browsers to Test

### Desktop
- ✅ Chrome
- ✅ Firefox
- ✅ Safari
- ✅ Edge

### Mobile
- ✅ Safari iOS
- ✅ Chrome Mobile

---

## 🐛 Bug Severity Guide

**Critical (P0)**
- App crashes
- Can't login
- Data loss
- Security vulnerabilities

**High (P1)**
- Major feature broken
- Affects many users
- No workaround

**Medium (P2)**
- Feature partially broken
- Workaround exists
- Affects some users

**Low (P3)**
- Visual/cosmetic issues
- Minor bugs
- Edge cases

---

## 📋 Daily Checklist

### Every Testing Day:

1. ✅ Clear browser cache
2. ✅ Review test cases for the day
3. ✅ Execute test cases
4. ✅ Document results
5. ✅ Report bugs found
6. ✅ Update testing checklist
7. ✅ Submit daily report

---

## 🔑 Key Testing Concepts

### Duplicate Prevention
- Only ONE workout log per exercise per day
- Logging again = UPDATE (not create new)

### Weekly Tracking
- Weeks auto-calculated from plan start date
- New week = fresh completion status
- Historical data preserved

### Role Priority
- Admin > Trainer > Member
- Admin+Trainer = goes to /admin

### Touch Targets
- Minimum 44px × 44px for mobile
- All buttons should be easy to tap

---

## 📞 Need Help?

### Questions About Features?
- Check `00_FEATURE_OVERVIEW.md`
- Review specific test case document
- Check code comments

### Questions About Testing?
- Check `TESTING_CHECKLIST.md`
- Review bug report template
- Contact development team

### Found a Critical Bug?
- Report immediately
- Use bug report template
- Include screenshot/video
- Tag as "Critical"

---

## 📈 Test Progress Tracking

Use this table to track your progress:

```
✅ = Complete
⏳ = In Progress
❌ = Not Started
🐛 = Bugs Found

[ ] Authentication Tests - __ / 15
[ ] Role-Based Routing - __ / 23
[ ] Workout Tracking - __ / 28
[ ] Mobile UI Tests - __ / 28
```

---

## 🎓 Testing Best Practices

### DO ✅
- Clear cache before testing
- Test on real devices when possible
- Take screenshots of every bug
- Test both success and failure scenarios
- Check browser console for errors
- Verify data in database
- Retest after fixes

### DON'T ❌
- Skip test cases
- Test only on desktop
- Report bugs without reproduction steps
- Ignore console errors
- Use production data
- Test features in isolation

---

## 📝 Documentation Standards

### When Writing Bug Reports:
1. Clear, descriptive title
2. Exact steps to reproduce
3. What SHOULD happen
4. What ACTUALLY happens
5. Screenshots/video
6. Environment details

### When Updating Test Cases:
1. Mark test as PASS or FAIL
2. Add notes for future reference
3. Document any variations found
4. Update expected results if needed

---

## 🏆 Sign-Off Criteria

### Ready for Production:
- ✅ All critical tests pass
- ✅ No P0/P1 bugs open
- ✅ Smoke tests pass on all browsers
- ✅ Mobile testing complete
- ✅ Regression testing done
- ✅ Test report submitted

---

## 📦 Deliverables

### At End of Testing:

1. **Test Execution Report**
   - Summary of all tests run
   - Pass/fail rates
   - Bug summary

2. **Bug List**
   - All bugs found and logged
   - Status of each bug
   - Severity breakdown

3. **Test Evidence**
   - Screenshots
   - Videos
   - Console logs

4. **Recommendations**
   - Suggestions for improvements
   - Additional test scenarios
   - Feedback on documentation

---

## 🗂️ File Structure

```
test-cases/
├── README.md (this file)
├── 00_FEATURE_OVERVIEW.md
├── TESTING_CHECKLIST.md
├── 01_AUTHENTICATION_TESTS.md
├── 02_ROLE_BASED_ROUTING_TESTS.md
├── 03_WORKOUT_TRACKING_TESTS.md
└── 04_MOBILE_UI_TESTS.md
```

---

## 🔄 Document Updates

This documentation is a living resource. If you find:
- Missing test scenarios
- Outdated information
- Unclear instructions
- Additional edge cases

Please:
1. Document your findings
2. Share with the team
3. Update test cases if authorized

---

## ⚡ Quick Reference

### Most Important Test Cases

**Authentication:**
- TC-AUTH-001 (Register)
- TC-AUTH-005 (Login)
- TC-AUTH-008 (Logout)

**Routing:**
- TC-ROUTE-001 (Admin redirect)
- TC-ROUTE-002 (Trainer redirect)
- TC-ROUTE-003 (Member redirect)

**Workout:**
- TC-WORKOUT-006 (Log workout)
- TC-WORKOUT-007 (Duplicate prevention)
- TC-WORKOUT-010 (Weekly progress)

**Mobile:**
- TC-MOBILE-001 (Touch targets)
- TC-MOBILE-004 (Button stacking)
- TC-MOBILE-024 (No horizontal scroll)

---

## 🎯 Success Metrics

### Testing is successful when:
- ✅ All users can login and access correct dashboard
- ✅ Workout logging works without creating duplicates
- ✅ Weekly progress calculates correctly
- ✅ Mobile UI is fully usable (no horizontal scroll, proper touch targets)
- ✅ No critical or high priority bugs remain
- ✅ Application performs well across browsers and devices

---

## 💡 Tips for Efficient Testing

1. **Start with smoke tests** - Quick sanity check
2. **Test critical paths first** - Login, routing, core features
3. **Use browser DevTools** - Inspect network, console, responsive mode
4. **Test on real devices** - Emulation is good, but real devices are better
5. **Document as you go** - Don't wait until end of day
6. **Retest immediately** - After bugs are fixed
7. **Think like a user** - Try to break the app
8. **Report early** - Don't batch bugs

---

## 🚨 Red Flags to Watch For

- Infinite redirect loops
- Flash of wrong content
- Horizontal scrolling on mobile
- Tiny buttons (< 44px)
- Console errors
- Slow page loads (> 5 seconds)
- Data not persisting
- Session not maintained
- Duplicate records created

---

## 📞 Support Contacts

**Technical Questions:**
[Development Team Contact]

**Bug Tracking:**
[Bug System URL]

**Test Environment Issues:**
[DevOps Contact]

**Urgent/Critical Bugs:**
[Emergency Contact]

---

## ✨ Final Notes

- Quality is everyone's responsibility
- No question is too small
- When in doubt, ask
- Testing is a critical phase - take your time
- Your feedback improves the product
- Thank you for your thorough testing!

---

**Happy Testing! 🧪🎉**

*Remember: The goal is not just to find bugs, but to ensure users have a great experience.*
