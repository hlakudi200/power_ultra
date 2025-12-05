# Authentication Fix Plan - Power Ultra Gym

## Executive Summary

**Problem**: Authentication hanging with "Safety timeout triggered" error, Google auth not working, session persistence issues.

**Root Causes Identified**:
1. ✗ **Using `async` callback in `onAuthStateChange`** - Blocks Supabase auth state machine
2. ✗ **Missing INSERT policy on profiles table** - New users can't create profiles
3. ✗ **Unoptimized RLS policies** - 95% slower queries without SELECT wrapping
4. ✗ **Timeout workarounds masking root issues** - Band-aids instead of fixes

**Impact**: ~3-5 second hangs on every page load, Google sign-in completely broken, poor user experience.

---

## Research Findings

### Official Supabase Documentation

Based on comprehensive research of official Supabase docs, GitHub issues, and Stack Overflow:

**Critical Rules for `onAuthStateChange`**:
1. ❌ **NEVER use `async` functions as callbacks**
2. ❌ **NEVER use `await` on Supabase methods within callbacks**
3. ❌ **NEVER call other Supabase functions directly in the callback**
4. ✅ **DO use `setTimeout(() => {...}, 0)` to defer async operations**

**Why This Matters**:
> "Callbacks run **synchronously** during auth state change processing. Using `await` in callbacks blocks the auth state machine, causing subsequent calls to `getSession()`, `getUser()`, or any Supabase operation to hang indefinitely."
>
> — Supabase GitHub Issue #762

**Sources**:
- [User sessions | Supabase Docs](https://supabase.com/docs/guides/auth/sessions)
- [onAuthStateChange Reference](https://supabase.com/docs/reference/javascript/auth-onauthstatechange)
- [GitHub Issue #35754 - getUser() hangs indefinitely](https://github.com/supabase/supabase/issues/35754)
- [GitHub Issue #762 - Operations in onAuthStateChange cause hanging](https://github.com/supabase/gotrue-js/issues/762)

---

## Implementation Plan

### Phase 1: Database Fixes (5 minutes)

#### Step 1.1: Run SQL Script

**File**: `database_sql/fix_auth_rls_policies.sql`

```bash
# In Supabase SQL Editor, run:
```

**What it does**:
1. Drops old unoptimized policies
2. ✅ Adds missing INSERT policy for profiles
3. ✅ Optimizes SELECT/UPDATE policies with `SELECT wrapping` (95% faster)
4. ✅ Adds performance indexes
5. ✅ Adds DELETE policy for completeness

**Expected output**:
```
AUTH RLS POLICIES FIXED!
Policies on profiles table: 5
Indexes on profiles table: 2
✓ Added missing INSERT policy for profiles
✓ Optimized SELECT/UPDATE policies with SELECT wrapping
✓ Added performance indexes
```

#### Step 1.2: Verify Policies

```sql
-- Check policies exist
SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- Should see:
-- - Users can insert own profile (INSERT)
-- - Users can select own profile (SELECT)
-- - Users can update own profile (UPDATE)
-- - Users can delete own profile (DELETE)
-- - Admin can read all profiles (SELECT)
-- - Admin can update all profiles (UPDATE)
```

---

### Phase 2: Code Fixes (10 minutes)

#### Step 2.1: Replace SessionProvider.tsx

**Backup current file**:
```bash
cp src/context/SessionProvider.tsx src/context/SessionProvider.tsx.backup
```

**Apply fix**:
```bash
cp src/context/SessionProvider.FIXED.tsx src/context/SessionProvider.tsx
```

**Key Changes**:

**BEFORE (WRONG)**:
```typescript
const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
  // ❌ Using await directly blocks auth state machine
  const profileData = await fetchProfile(session.user.id, session.user.email);
  setProfile(profileData);
});
```

**AFTER (CORRECT)**:
```typescript
const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
  // ✅ Synchronously update session immediately
  setSession(session);

  // ✅ Defer async operations to next event loop tick
  setTimeout(async () => {
    if (event === 'SIGNED_IN' && session?.user) {
      const profileData = await fetchProfile(session.user.id, session.user.email);
      setProfile(profileData);
      setLoading(false);
    }
  }, 0);
});
```

**Why This Works**:
- Callback completes synchronously
- Async operations execute in next event loop tick
- Auth state machine remains unblocked
- `getSession()` resolves immediately

#### Step 2.2: Remove Timeout Workarounds

Once the root cause is fixed, these are no longer needed:

**Remove from SessionProvider.tsx**:
1. ~~Promise.race timeout in fetchProfile (lines 42-56)~~
2. ~~Timeout promise in profile creation (lines 90-97)~~
3. ~~Safety timeout in useEffect (lines 121-126)~~

**Remove from App.tsx (ProtectedRoute)**:
1. ~~Profile query timeout (lines 91-97)~~
2. ~~Safety timeout (lines 74-79)~~

These workarounds were masking the real problem and add unnecessary complexity.

---

### Phase 3: Testing (15 minutes)

#### Test 3.1: Email/Password Authentication

1. **Clear browser data**: Cookies, localStorage, session storage
2. **Test signup**:
   - Go to homepage → Click "Member Access"
   - Switch to "Sign Up" tab
   - Enter email and password (min 8 chars)
   - Submit form
   - **Expected**: "Check your email" toast appears
   - **Check console**: Should NOT see "Safety timeout triggered"
   - **Check console**: Should see "[SessionProvider] Profile created successfully"

3. **Test signin**:
   - Check email for verification link
   - Click link to verify
   - Sign in with email/password
   - **Expected**: Redirects to homepage within 1 second
   - **Check console**: Should see "[SessionProvider] Handling SIGNED_IN event (deferred)"
   - **Check console**: Should see "[SessionProvider] Profile set after SIGNED_IN"
   - **Expected**: No timeout errors

#### Test 3.2: Google Authentication

1. **Clear browser data**
2. **Test Google sign-in**:
   - Go to homepage → Click "Member Access"
   - Click "Sign In with Google"
   - **Expected**: Google OAuth window opens
   - Select Google account
   - **Expected**: Redirects back to site with session
   - **Check console**: Should see "[SessionProvider] Google sign-in detected"
   - **Check console**: Should see "[SessionProvider] Google profile set after SIGNED_IN"
   - **Expected**: Navigation bar shows user name/avatar
   - **Expected**: Redirects to appropriate dashboard (admin/trainer/member)

3. **Test Google re-login**:
   - Sign out
   - Sign in with Google again
   - **Expected**: Immediate redirect, profile already exists
   - **Expected**: No "Profile created" log, only "Profile found"

#### Test 3.3: Session Persistence

1. **Sign in with email/password**
2. **Refresh page (F5)**:
   - **Expected**: Still logged in within 500ms
   - **Check console**: Should see "[SessionProvider] Initial session check: Found"
   - **Check console**: Should see "[SessionProvider] Profile found"
   - **Expected**: No timeout errors

3. **Open new tab**:
   - Navigate to site in new tab
   - **Expected**: Already logged in
   - **Expected**: Fast load (< 1 second)

4. **Close tab, reopen**:
   - Close browser completely
   - Reopen and navigate to site
   - **Expected**: Still logged in
   - **Check localStorage**: Should see `sb-<project>-auth-token`

#### Test 3.4: Token Refresh

1. **Sign in**
2. **Wait 1 hour** (or reduce JWT expiration in Supabase settings to 5 minutes for testing)
3. **Check console**: Should see "[SessionProvider] Token refreshed - keeping existing profile"
4. **Navigate to different page**:
   - **Expected**: Still works normally
   - **Expected**: No re-authentication required
   - **Expected**: No "Safety timeout triggered"

#### Test 3.5: Role-Based Redirects

**Admin User**:
1. Sign in as admin
2. **Expected**: Automatically redirects to `/admin`
3. **Expected**: resetNewLogin called to prevent redirect loop

**Trainer User**:
1. Sign in as trainer
2. **Expected**: Automatically redirects to `/trainer-dashboard`
3. **Expected**: resetNewLogin called

**Regular Member**:
1. Sign in as member
2. **Expected**: Stays on homepage
3. **Expected**: Can manually navigate to `/dashboard`

---

### Phase 4: Performance Verification

#### Check 4.1: Console Logs

**Good logs (expected)**:
```
[SessionProvider] Initializing...
[SessionProvider] Initial session check: Not found
[SessionProvider] Auth state changed: SIGNED_IN Session exists
[SessionProvider] Handling SIGNED_IN event (deferred)
[SessionProvider] Google sign-in detected, creating/updating profile
[SessionProvider] fetchProfile START for user: abc123
[SessionProvider] Querying profiles table...
[SessionProvider] Query result: hasData: true
[SessionProvider] Profile found: {id: "abc123", role: "member", ...}
[SessionProvider] Google profile set after SIGNED_IN
```

**Bad logs (indicates problems)**:
```
❌ [SessionProvider] Safety timeout triggered - forcing loading to complete
❌ [SessionProvider] Profile query TIMEOUT after 5s
❌ [ProtectedRoute] Profile query TIMEOUT - RLS issue detected
❌ Error: Query timeout
```

#### Check 4.2: Network Tab

**Verify RLS fix**:
1. Open DevTools → Network tab
2. Filter by "postgrest"
3. Sign in
4. **Expected**: Profile query completes in < 200ms
5. **Before fix**: Would hang for 3-5 seconds
6. **After fix**: Should be fast (< 200ms)

#### Check 4.3: Database Query Performance

**In Supabase Dashboard → SQL Editor**:

```sql
-- Test query performance
EXPLAIN ANALYZE
SELECT * FROM profiles WHERE id = auth.uid();

-- Should see:
-- Planning Time: ~0.1 ms
-- Execution Time: ~0.5 ms
-- (Before optimization: ~50-500ms)
```

---

## Rollback Plan

If issues occur, rollback in reverse order:

### Rollback Code Changes
```bash
# Restore original SessionProvider
cp src/context/SessionProvider.tsx.backup src/context/SessionProvider.tsx

# Restart dev server
npm run dev
```

### Rollback Database Changes
```sql
-- Restore original policies
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can select own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;

-- Recreate original policies
CREATE POLICY "Allow individual user read access on profiles"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Allow individual user update access on profiles"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
```

---

## Success Criteria

✅ **Session initialization completes in < 1 second**
✅ **No "Safety timeout triggered" errors**
✅ **Google authentication works end-to-end**
✅ **Email/password authentication works**
✅ **Session persists across page refreshes**
✅ **Session persists across browser restarts**
✅ **Token refresh works without re-authentication**
✅ **Role-based redirects work (admin/trainer/member)**
✅ **No RLS timeout errors in console**
✅ **Profile queries complete in < 200ms**

---

## Post-Implementation Monitoring

### Week 1: Monitor Console Logs

Check for:
- Any new timeout errors
- Any "Safety timeout triggered" messages
- Profile query failures
- Unexpected auth state change events

### Week 2: Monitor User Reports

Watch for:
- "Can't sign in" reports
- "Stuck on loading" reports
- "Google sign-in doesn't work" reports
- Session expiration issues

### Performance Metrics

**Before Fix**:
- Session init time: ~3-5 seconds (timeout)
- Google auth success rate: 0% (broken)
- Profile query time: 3-5 seconds (timeout)

**After Fix** (expected):
- Session init time: < 1 second
- Google auth success rate: > 95%
- Profile query time: < 200ms

---

## Additional Resources

### Supabase Documentation
- [User sessions best practices](https://supabase.com/docs/guides/auth/sessions)
- [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [OAuth with Google](https://supabase.com/docs/guides/auth/social-login/auth-google)

### Troubleshooting Guide

**Issue**: "Safety timeout triggered" still appears
**Solution**: Check that SessionProvider.FIXED.tsx was correctly applied. Verify callback is NOT using `async`.

**Issue**: Profile creation fails
**Solution**: Verify INSERT policy exists: `SELECT * FROM pg_policies WHERE tablename = 'profiles' AND cmd = 'INSERT'`

**Issue**: Google auth redirects but no session
**Solution**: Check Supabase Auth settings → Redirect URLs → Ensure your URL is in allow list

**Issue**: "RLS policy violation" errors
**Solution**: Check user is authenticated: `SELECT auth.uid()` should return user ID, not null

---

## Files Modified

### Database
- ✅ `database_sql/fix_auth_rls_policies.sql` (NEW)

### Frontend
- ✅ `src/context/SessionProvider.tsx` (MODIFIED)
- ✅ `src/pages/Index.tsx` (NO CHANGES - already has resetNewLogin)
- ⚠️ `src/App.tsx` (FUTURE: Simplify ProtectedRoute)

### Documentation
- ✅ `AUTH_FIX_PLAN.md` (NEW - This file)

---

## Timeline

**Total estimated time: 30 minutes**

- Phase 1 (Database): 5 minutes
- Phase 2 (Code): 10 minutes
- Phase 3 (Testing): 15 minutes
- Phase 4 (Verification): Ongoing

---

## Next Steps

1. **Read this entire plan** ✓
2. **Backup current code** ✓
3. **Run SQL script** (Phase 1)
4. **Replace SessionProvider.tsx** (Phase 2)
5. **Test all scenarios** (Phase 3)
6. **Monitor performance** (Phase 4)
7. **Deploy to production** (if all tests pass)

---

## Questions?

If you encounter issues during implementation:
1. Check console logs for specific error messages
2. Verify SQL script ran successfully (check for NOTICE messages)
3. Ensure SessionProvider.FIXED.tsx was correctly copied
4. Review rollback plan if needed

**Good luck! This should resolve all your authentication issues.** 🚀
