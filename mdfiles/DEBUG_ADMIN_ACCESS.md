# Debug Admin Access Issue

## Let's Find the Problem Together

### Step 1: Check Your Database

Run these queries in **Supabase SQL Editor**:

```sql
-- 1. Check if your profile exists
SELECT
    id,
    email,
    first_name,
    last_name,
    is_admin,
    role,
    membership_expiry_date
FROM public.profiles
ORDER BY updated_at DESC;
```

**What to look for:**
- Is your email in the list?
- Is `is_admin` = `true`?
- Is `role` = `super_admin`?

---

```sql
-- 2. Check if you're logged in (get current user ID)
-- Run this to see what user Supabase thinks you are:
SELECT auth.uid() as my_user_id;
```

**Copy the user ID**, then:

```sql
-- 3. Check YOUR specific profile
SELECT * FROM public.profiles
WHERE id = 'PASTE-YOUR-USER-ID-HERE';
```

---

### Step 2: Check Browser Console

1. Open your website
2. Press **F12** (open developer tools)
3. Go to **Console** tab
4. Try navigating to `/admin`
5. **Take a screenshot** of any errors in red

---

### Step 3: Check Network Tab

1. Still in developer tools (F12)
2. Go to **Network** tab
3. Try navigating to `/admin`
4. Look for any failed requests (shown in red)
5. Click on them and check the **Response** tab

---

### Step 4: Common Issues & Fixes

#### Issue A: "Profile not found" or NULL
**Fix:**
```sql
-- Run simple_profile_sync.sql again
-- Then manually ensure your profile exists:
INSERT INTO public.profiles (id, email, first_name, last_name, is_admin, role)
SELECT
    id,
    email,
    raw_user_meta_data->>'first_name',
    raw_user_meta_data->>'last_name',
    true,
    'super_admin'
FROM auth.users
WHERE email = 'your-email@example.com'
ON CONFLICT (id) DO UPDATE
SET is_admin = true, role = 'super_admin';
```

#### Issue B: "Unauthorized: Admin access required"
**Fix:**
```sql
UPDATE public.profiles
SET is_admin = true, role = 'super_admin'
WHERE email = 'your-email@example.com';
```

#### Issue C: Redirected to homepage immediately
**Problem:** The redirect happens too fast - might be useAdminAuth or AppRoutes

**Debug:**
Add this temporarily to see what's happening:

Open browser console (F12) and run:
```javascript
// Check current session
await supabase.auth.getSession()

// Check your profile
await supabase.from('profiles').select('*').eq('id', 'YOUR-USER-ID').single()
```

#### Issue D: "Access Denied - Active membership required"
This means the ProtectedRoute is still checking membership even though we fixed it.

**Fix:** Make sure you've rebuilt the app:
```bash
npm run build
# or
npm run dev
```

Then refresh the browser with **Ctrl+Shift+R** (hard refresh)

---

### Step 5: Try Direct Database Fix

If all else fails, let's force it:

```sql
-- Nuclear option - make sure EVERYTHING is set
UPDATE public.profiles
SET
    is_admin = true,
    role = 'super_admin',
    membership_expiry_date = '2099-12-31'  -- Far future date
WHERE email = 'your-email@example.com';
```

This gives you admin access AND a "membership" just to bypass everything.

---

## What to Tell Me

Please run the queries above and tell me:

1. **Your email shows in profiles?** (Yes/No)
2. **is_admin value?** (true/false/NULL)
3. **role value?** (super_admin/NULL/other)
4. **Any errors in browser console?** (paste them)
5. **What happens when you go to /admin?** (redirects? error? blank page?)
6. **Are you logged in?** (Can you see your name in navigation?)

With this info, I can pinpoint exactly what's wrong! 🔍
