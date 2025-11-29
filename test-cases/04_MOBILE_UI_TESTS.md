# Mobile UI & Responsiveness Test Cases

## Overview
Test cases for mobile-optimized UI, touch interactions, and responsive design across devices.

---

## TC-MOBILE-001: Touch Target Size - Buttons
**Priority:** High
**Type:** UI/UX

### Preconditions
- Testing on mobile device or mobile viewport (375px width)

### Test Steps
1. Navigate to any page with buttons
2. Measure button tap area
3. Try tapping buttons

### Expected Results
- All buttons minimum 44px × 44px (iOS/Android standard)
- Easy to tap without missing
- No accidental taps on adjacent elements
- Visual feedback on tap (scale, color change)

### Locations to Check
- Log Workout dialog buttons
- Create Workout Plan dialog buttons
- Navigation buttons
- Form submit buttons
- Tab buttons in workout schedule

---

## TC-MOBILE-002: Rating Stars - Touch Interaction
**Priority:** High
**Type:** UI/UX

### Preconditions
- Mobile device or mobile viewport

### Test Steps
1. Open Log Workout dialog
2. Try tapping rating stars (1-5)
3. Tap different stars to change rating

### Expected Results
- Each star is minimum 44px touch target
- Easy to select without hitting wrong star
- Visual feedback on tap (scale animation: `active:scale-95`)
- Selected state clearly visible
- Can change rating easily

---

## TC-MOBILE-003: Dialog Layout - Mobile
**Priority:** High
**Type:** Responsive Design

### Preconditions
- Mobile viewport (< 640px width)

### Test Steps
1. Open Log Workout dialog on mobile
2. Observe layout and sizing

### Expected Results
- Dialog takes most of screen width
- Max height: 90vh (doesn't overflow)
- Scrollable if content overflows
- Title size: `text-xl` (smaller than desktop)
- All content visible and accessible
- No horizontal scroll

---

## TC-MOBILE-004: Button Stacking - Mobile
**Priority:** High
**Type:** Responsive Design

### Preconditions
- Mobile viewport

### Test Steps
1. Open any dialog with action buttons (Log Workout, Create Plan, etc.)
2. Observe button layout

### Expected Results
- Buttons stack vertically (`flex flex-col`)
- Each button full width
- Primary button appears FIRST (top)
- Secondary button appears second (bottom)
- Gap between buttons (8px minimum)
- Both buttons easily tappable

### Example
```
┌─────────────────────┐
│   Log Workout       │ ← Primary (first)
└─────────────────────┘
┌─────────────────────┐
│   Cancel            │ ← Secondary (second)
└─────────────────────┘
```

---

## TC-MOBILE-005: Desktop Button Order
**Priority:** Medium
**Type:** Responsive Design

### Preconditions
- Desktop viewport (≥ 640px width)

### Test Steps
1. Open dialog on desktop
2. Observe button layout

### Expected Results
- Buttons side by side (horizontal)
- Cancel on LEFT
- Primary action on RIGHT
- Order reversed from mobile using Tailwind order utilities

### Example
```
┌─────────────┐  ┌─────────────┐
│   Cancel    │  │ Log Workout │
└─────────────┘  └─────────────┘
```

---

## TC-MOBILE-006: Exercise Cards - Mobile Layout
**Priority:** High
**Type:** Responsive Design

### Preconditions
- Mobile viewport
- Viewing workout plan exercises

### Test Steps
1. View exercise list on mobile
2. Observe card layout

### Expected Results
- Exercise details stack vertically
- Stats in 2-column grid (not 4)
- Exercise name truncates if too long
- "Log Workout" button full width
- Comfortable padding (12px min)
- Easy to read all information

---

## TC-MOBILE-007: Weekly Tabs - Mobile Layout
**Priority:** High
**Type:** Responsive Design

### Preconditions
- Mobile viewport
- Viewing workout plan

### Test Steps
1. View weekly schedule tabs
2. Observe tab layout

### Expected Results
- Tabs wrap to 2-4 columns on mobile
- Each tab minimum 44px height
- Tab text readable (3-letter abbreviations: Mon, Tue, etc.)
- Active tab clearly highlighted
- Exercise count badges visible
- Can scroll horizontally if needed OR tabs wrap

---

## TC-MOBILE-008: Text Sizing - Responsive
**Priority:** Medium
**Type:** Responsive Design

### Test Steps
1. View same page on mobile and desktop
2. Compare text sizes

### Expected Results

**Mobile (< 640px):**
- Dialog titles: `text-xl` (20px)
- Body text: `text-sm` to `text-base`
- Button text: `text-sm`

**Desktop (≥ 640px):**
- Dialog titles: `text-2xl` (24px)
- Body text: `text-base` to `text-lg`
- Button text: `text-base`

All text readable without zooming.

---

## TC-MOBILE-009: Form Inputs - Mobile
**Priority:** High
**Type:** UI/UX

### Preconditions
- Mobile device

### Test Steps
1. Open form (login, registration, log workout)
2. Tap input fields
3. Enter data

### Expected Results
- Inputs minimum 44px height
- Text large enough to read (16px minimum to prevent zoom)
- Keyboard opens without breaking layout
- Input labels clearly associated with fields
- Validation errors visible and clear

---

## TC-MOBILE-010: Scrolling - Long Content
**Priority:** High
**Type:** Functional

### Preconditions
- Mobile viewport
- Dialog with long content list

### Test Steps
1. Open Create Workout Plan dialog with many exercises
2. Try scrolling through content

### Expected Results
- Smooth scrolling
- Content doesn't overflow viewport
- Header stays visible or scrolls naturally
- Buttons remain accessible (sticky or at bottom)
- No content cut off

---

## TC-MOBILE-011: Landscape Orientation
**Priority:** Medium
**Type:** Responsive Design

### Test Steps
1. Rotate mobile device to landscape
2. Navigate through app
3. Open dialogs

### Expected Results
- Layout adapts to landscape
- Content still accessible
- Dialogs don't overflow
- Buttons still reachable
- No critical content hidden

---

## TC-MOBILE-012: Tablet Layout (768px - 1024px)
**Priority:** Medium
**Type:** Responsive Design

### Test Steps
1. Test on tablet device or viewport
2. Navigate through features

### Expected Results
- Layout uses available space well
- Not just stretched mobile view
- Not cramped desktop view
- Comfortable spacing
- Readable text sizes
- Good use of columns where appropriate

---

## TC-MOBILE-013: Completion Badge - Mobile
**Priority:** Low
**Type:** UI/UX

### Preconditions
- Mobile viewport
- Exercise marked as completed

### Test Steps
1. View completed exercise card
2. Observe completion badge

### Expected Results
- Badge visible and clear
- Green checkmark icon visible
- Text may be abbreviated on mobile ("Done" vs "Completed")
- Doesn't overlap other elements
- Color contrast sufficient

---

## TC-MOBILE-014: Progress Bar - Mobile
**Priority:** Medium
**Type:** UI/UX

### Test Steps
1. View workout plan on mobile
2. Observe weekly progress bar

### Expected Results
- Progress bar fills based on percentage
- Percentage text readable
- Bar has minimum height (12px)
- Smooth fill animation
- Colors clearly indicate progress
- Full width of container

---

## TC-MOBILE-015: Navigation Menu - Mobile
**Priority:** High
**Type:** Responsive Design

### Test Steps
1. View navigation on mobile
2. Open menu if hamburger icon present

### Expected Results
- Hamburger menu icon on mobile (if applicable)
- Menu opens smoothly
- All nav items accessible
- Easy to close menu
- No overlap with content
- Touch-friendly spacing

---

## TC-MOBILE-016: Tap Feedback - Visual
**Priority:** High
**Type:** UI/UX

### Test Steps
1. Tap various interactive elements on mobile
2. Observe visual feedback

### Expected Results
- Buttons show active state on tap
- Scale animation: `active:scale-95` or similar
- Color change on tap
- Ripple effect (if implemented)
- No delay in feedback
- Clear indication of tap registration

---

## TC-MOBILE-017: Modal Overlay - Mobile
**Priority:** Medium
**Type:** UI/UX

### Test Steps
1. Open dialog/modal on mobile
2. Observe background and positioning

### Expected Results
- Background darkened/dimmed
- Modal centered on screen
- Can't interact with background
- Close button easily accessible
- Swipe down to close (if implemented)

---

## TC-MOBILE-018: Loading States - Mobile
**Priority:** Medium
**Type:** UI/UX

### Test Steps
1. Trigger loading state on mobile
2. Observe loading indicator

### Expected Results
- Loading spinner/skeleton visible
- Centered and appropriately sized
- Doesn't break layout
- Loading text readable
- Smooth transition when loaded

---

## TC-MOBILE-019: Error Messages - Mobile
**Priority:** Medium
**Type:** UI/UX

### Test Steps
1. Trigger error on mobile (validation, network, etc.)
2. Observe error display

### Expected Results
- Error messages visible
- Text readable without zooming
- Red/warning color clear
- Icon visible (if used)
- Doesn't overflow container
- Easy to dismiss

---

## TC-MOBILE-020: Toast Notifications - Mobile
**Priority:** Medium
**Type:** UI/UX

### Test Steps
1. Trigger toast notification on mobile
2. Observe positioning and readability

### Expected Results
- Toast positioned correctly (top or bottom)
- Full message visible
- Text readable
- Auto-dismiss after timeout
- Can manually dismiss
- Doesn't cover critical UI

---

## TC-MOBILE-021: Image Scaling - Mobile
**Priority:** Low
**Type:** Responsive Design

### Test Steps
1. View pages with images (gallery, hero, etc.)
2. Observe image sizing

### Expected Results
- Images scale to fit screen
- No horizontal overflow
- Maintain aspect ratio
- No distortion
- Lazy loading (if implemented)

---

## TC-MOBILE-022: Grid Layouts - Mobile
**Priority:** Medium
**Type:** Responsive Design

### Test Steps
1. View grid-based layouts (exercise stats, pricing cards, etc.)
2. Observe column behavior

### Expected Results
- Desktop: 4 columns → Mobile: 2 columns
- Or Desktop: 3 columns → Mobile: 1-2 columns
- Comfortable spacing
- No cramped layout
- All content visible

---

## TC-MOBILE-023: Workout Plan Header - Mobile
**Priority:** Medium
**Type:** Responsive Design

### Test Steps
1. View workout plan on mobile
2. Observe header card with title, badge, goals

### Expected Results
- Title readable (wraps if needed)
- Week badge visible
- Goals section stacks vertically
- Progress bar full width
- Gradient background visible
- All content accessible

---

## TC-MOBILE-024: Horizontal Overflow Prevention
**Priority:** High
**Type:** Bug Prevention

### Test Steps
1. Navigate entire app on 320px width (iPhone SE)
2. Check for horizontal scroll

### Expected Results
- NO horizontal scrolling anywhere
- All content fits within viewport
- Text wraps or truncates appropriately
- Images scale down
- Tables scroll horizontally if needed (not whole page)

---

## TC-MOBILE-025: Font Scaling - Accessibility
**Priority:** Low
**Type:** Accessibility

### Test Steps
1. Increase device font size (Settings → Display → Font Size)
2. Navigate app
3. Observe text rendering

### Expected Results
- Text scales appropriately
- Layout doesn't break
- Important content still visible
- Buttons still tappable
- May require some scrolling (acceptable)

---

## TC-MOBILE-026: Dark Mode - Mobile (If Implemented)
**Priority:** Low
**Type:** UI/UX

### Test Steps
1. Enable dark mode on device
2. Open app
3. Navigate through features

### Expected Results
- App respects dark mode preference
- Colors invert appropriately
- Sufficient contrast maintained
- All text readable
- No bright white flashes

---

## TC-MOBILE-027: Pull to Refresh (If Implemented)
**Priority:** Low
**Type:** Feature

### Test Steps
1. On mobile, pull down on workout plan or dashboard
2. Observe behavior

### Expected Results
- Refresh indicator appears
- Data reloads
- Smooth animation
- Updates reflected after refresh

---

## TC-MOBILE-028: Mobile Performance
**Priority:** High
**Type:** Performance

### Test Steps
1. Test app on mid-range mobile device
2. Navigate between pages
3. Open/close dialogs
4. Scroll through lists

### Expected Results
- Smooth 60fps animations
- No lag on interactions
- Fast page transitions
- Images load quickly
- No janky scrolling

---

## Test Summary

| Category | Total Tests | Priority High | Priority Medium | Priority Low |
|----------|-------------|---------------|-----------------|--------------|
| Mobile UI | 28 | 11 | 12 | 5 |

## Device Testing Matrix

| Device Type | Width | Test Priority | Notes |
|-------------|-------|---------------|-------|
| iPhone SE | 320px | High | Smallest common viewport |
| iPhone 12/13 | 390px | High | Most common iPhone |
| iPhone 14 Pro Max | 430px | Medium | Large iPhone |
| iPad Mini | 768px | Medium | Small tablet |
| iPad Pro | 1024px | Low | Large tablet |
| Android Phone | 360px - 412px | High | Most common Android |

## Browser Testing

**Mobile Browsers:**
- Safari iOS (iPhone, iPad)
- Chrome Mobile (Android)
- Firefox Mobile
- Samsung Internet (Android)

**Desktop Testing Mobile View:**
- Chrome DevTools (use device emulation)
- Firefox Responsive Design Mode
- Safari Responsive Design Mode

## Key Measurements

### Touch Targets
- Minimum: 44px × 44px
- Comfortable: 48px × 48px
- Ideal: 56px × 56px

### Font Sizes
- Minimum body text: 16px (prevents zoom on iOS)
- Headings: 20px - 32px
- Small text: 14px (use sparingly)

### Spacing
- Minimum padding: 12px
- Comfortable padding: 16px
- Section spacing: 24px - 32px

### Breakpoints (Tailwind)
- sm: 640px
- md: 768px
- lg: 1024px
- xl: 1280px
- 2xl: 1536px

## Common Mobile Issues to Watch For

1. **Horizontal Scroll:** Content wider than viewport
2. **Tiny Touch Targets:** Buttons/links < 44px
3. **Text Too Small:** Body text < 16px (causes zoom on iOS)
4. **Keyboard Overlap:** Input obscured when keyboard opens
5. **Fixed Positioning Issues:** Header/footer behaving oddly on mobile
6. **Hover States:** Don't work on mobile (ensure tap alternatives)
7. **Viewport Units:** 100vh can be problematic on mobile browsers
8. **Click Delay:** 300ms delay on some mobile browsers (use touch events)

## Testing Tools

- Chrome DevTools Device Mode
- BrowserStack (real devices)
- Sauce Labs (real devices)
- Physical devices (iOS and Android)
- Responsive design testing sites

## Bug Reporting Template

```
Bug ID: MOBILE-XXX
Test Case: TC-MOBILE-XXX
Device: iPhone 13, iOS 16.5
Viewport: 390px × 844px
Browser: Safari Mobile
Severity: Critical/High/Medium/Low

Steps to Reproduce:
1. ...
2. ...

Expected Result:
Actual Result:
Screenshot/Recording:
```

## Notes for Tester

### Critical Mobile UX Rules
1. All touch targets minimum 44px
2. No horizontal scroll
3. Buttons stack vertically on mobile
4. Primary action button comes first (top) on mobile
5. Text readable without zooming
6. Smooth scrolling and animations

### Quick Mobile Check
1. Open on 375px viewport
2. Navigate through all major features
3. Tap all buttons and links
4. Fill out all forms
5. Check for horizontal scroll
6. Verify all text is readable
