# Profile Data Sync Fix

## 🐛 The Problem You Found

When users sign up and complete the onboarding form:
- ✅ Data saves to `auth.users.user_metadata` (that's why navigation shows the name)
- ❌ Data **doesn't** save to `profiles` table (that's why you can't make them admin)

## ✅ The Solution

I've fixed this in **TWO ways** so it works going forward AND fixes existing users:

---

## Fix 1: Updated Onboarding Form

**File:** `src/pages/SetupProfile.tsx`

**What changed:**
- Now saves data to **BOTH** `auth.users.user_metadata` AND `profiles` table
- Uses `upsert` to create profile if it doesn't exist
- Better error handling

**Result:** New users will have data in both places automatically! ✓

---

## Fix 2: Database Trigger System

**File:** `fix_user_profile_sync.sql`

**What it does:**
1. **Creates triggers** that auto-sync `auth.users` ↔ `profiles`
2. **Backfills existing users** - Copies data from auth to profiles for all users
3. **Keeps them in sync** - Any future metadata updates sync automatically

**To apply this fix:**

### Step 1: Run the SQL Script

Open **Supabase SQL Editor** and run:
```sql
-- Copy and paste entire contents of fix_user_profile_sync.sql
```

### Step 2: Verify It Worked

You'll see a message like:
```
=== USER PROFILE SYNC COMPLETE ===
Auth users: 5
Profiles: 5
Missing profiles: 0
All users have profiles! ✓
```

### Step 3: Check Your Data

Run this query to see all users with their profile data:
```sql
SELECT
    p.id,
    p.email,
    p.first_name,
    p.last_name,
    p.phone,
    p.is_admin,
    p.role,
    p.membership_expiry_date
FROM public.profiles p
ORDER BY p.updated_at DESC;
```

You should now see ALL your users with their names and phone numbers!

---

## Now You Can Make Users Admin!

After running the fix, you can make any user an admin:

```sql
-- Use the email from the query above
UPDATE public.profiles
SET is_admin = true, role = 'super_admin'
WHERE email = 'user-email@example.com';
```

---

## How It Works Going Forward

### When a new user signs up:
1. **Google OAuth** → Creates user in `auth.users`
2. **Trigger fires** → Automatically creates entry in `profiles` table
3. **User completes onboarding** → Updates both `auth.users.user_metadata` AND `profiles` table
4. **Trigger fires again** → Ensures everything stays in sync

### When user metadata updates:
1. **Onboarding form** → Saves to `auth.users.user_metadata` AND `profiles`
2. **Trigger also fires** → Double-checks sync (backup safety)
3. **Result** → Data always consistent!

---

## What Gets Synced

From `auth.users.user_metadata` to `profiles`:
- ✅ `first_name`
- ✅ `last_name`
- ✅ `phone`
- ✅ `email` (from auth.users.email)

Plus these stay in profiles only:
- `is_admin`
- `role`
- `membership_id`
- `membership_expiry_date`
- `full_name` (if used)
- `updated_at`

---

## Testing Checklist

- [ ] Run `fix_user_profile_sync.sql` in Supabase
- [ ] Verify "All users have profiles! ✓" message
- [ ] Run `SELECT * FROM profiles` - see all users
- [ ] Make one user admin with UPDATE query
- [ ] Log in as that admin user
- [ ] Navigate to `/admin` - dashboard loads!
- [ ] Sign up a NEW test user
- [ ] Complete onboarding form
- [ ] Check profiles table - new user appears!

---

## Troubleshooting

### "Permission denied for table profiles"
**Problem:** RLS policies blocking the trigger
**Solution:** The trigger uses `SECURITY DEFINER` which bypasses RLS - should work fine

### "User not found in profiles after onboarding"
**Problem:** Trigger might not have fired
**Solution:**
1. Check if trigger exists:
   ```sql
   SELECT * FROM pg_trigger WHERE tgname LIKE '%auth_user%';
   ```
2. Manually insert the profile:
   ```sql
   INSERT INTO public.profiles (id, email, first_name, last_name, phone)
   SELECT id, email,
          raw_user_meta_data->>'first_name',
          raw_user_meta_data->>'last_name',
          raw_user_meta_data->>'phone'
   FROM auth.users
   WHERE email = 'problem-user@example.com';
   ```

### Still seeing NULL names in profiles
**Problem:** Old data wasn't synced
**Solution:** Re-run the backfill section of the SQL script, or manually update:
```sql
UPDATE public.profiles p
SET
  first_name = au.raw_user_meta_data->>'first_name',
  last_name = au.raw_user_meta_data->>'last_name',
  phone = au.raw_user_meta_data->>'phone'
FROM auth.users au
WHERE p.id = au.id;
```

---

## Summary

**Before:** Onboarding data only in `auth.users.user_metadata`
**After:** Data in BOTH `auth.users.user_metadata` AND `profiles` table
**Benefit:** Can now make users admin, track memberships, and manage profiles properly!

**Files Changed:**
1. ✅ `src/pages/SetupProfile.tsx` - Now saves to profiles table
2. ✅ `fix_user_profile_sync.sql` - Database triggers and backfill

**Next Steps:**
1. Run `fix_user_profile_sync.sql`
2. Make yourself admin
3. Access `/admin` dashboard!

🎉 Problem solved!
