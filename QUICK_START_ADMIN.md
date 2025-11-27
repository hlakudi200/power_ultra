# Quick Start: Admin Dashboard Setup

## 🚀 Simple 3-Step Setup (No Permission Issues!)

### Step 1: Sync Your User Data

Open **Supabase SQL Editor** and run:
```
simple_profile_sync.sql
```

This will:
- ✅ Copy all user data from auth.users to profiles table
- ✅ Show you a report of all users
- ✅ Work around Supabase permission restrictions

You'll see output like:
```
====================================
PROFILE SYNC REPORT
====================================
Total auth.users: 3
Total profiles: 3
Profiles with names: 3
Profiles without names: 0
Auth users missing profiles: 0
====================================
✓ All users have profiles!
✓ All profiles have names!
```

Plus a table showing all your users!

---

### Step 2: Set Up Admin System

Open **Supabase SQL Editor** and run:
```
admin_schema.sql
```

This creates:
- Admin roles system
- Dashboard stats functions
- Audit logging
- All admin tables

---

### Step 3: Make Yourself Admin

Find your email from the table in Step 1, then run:

```sql
UPDATE public.profiles
SET is_admin = true, role = 'super_admin'
WHERE email = 'your-email-here@example.com';
```

**Verify it worked:**
```sql
SELECT email, first_name, last_name, is_admin, role
FROM public.profiles
WHERE is_admin = true;
```

---

## ✅ Done! Access Your Admin Panel

1. **Log in** to your website (if not already)
2. **Navigate to:** `http://localhost:8080/admin` (or your domain)
3. **See your dashboard!** 🎉

---

## 🔧 What If You Get Errors?

### "Permission denied" / "must be owner of relation"
**Solution:** Use `simple_profile_sync.sql` instead of `fix_user_profile_sync.sql`
- The simple version doesn't need auth.users permissions
- It's safe and does the same job!

### "Column does not exist"
**Solution:** The scripts handle this automatically with `IF NOT EXISTS` checks

### "No data showing in dashboard"
**Problem:** No members/bookings yet
**Solution:** Normal for new installations - stats will populate as you use the site

---

## 📊 What You Get

### Dashboard Shows:
- Total members
- Active/expired memberships
- Classes count
- Today's bookings
- New members this week
- Unread inquiries

### Sidebar Menu:
- Dashboard (✓ Working now!)
- Members (Phase 2 - coming next)
- Classes (Phase 2)
- Schedule (Phase 2)
- Bookings (Phase 2)
- Inquiries (Phase 2)
- Memberships (Phase 2)
- Analytics (Phase 5)
- Settings (Phase 5)

---

## 🎯 Future User Signups (Already Fixed!)

The updated `SetupProfile.tsx` now saves to **both** places:
1. `auth.users.user_metadata` (for session)
2. `profiles` table (for admin features)

So all **new users** will automatically have complete profile data! ✓

---

## 🆘 Quick Troubleshooting

### Can't access /admin - redirected to homepage
```sql
-- Make sure you're set as admin
SELECT is_admin, role FROM public.profiles WHERE email = 'your-email@example.com';

-- If is_admin is false or NULL:
UPDATE public.profiles SET is_admin = true, role = 'super_admin' WHERE email = 'your-email@example.com';
```

### Dashboard shows "0" for everything
**This is normal!** Stats populate as you get:
- Members signing up
- Classes being created
- Bookings being made
- Inquiries submitted

### Still see old user data issues
```sql
-- Re-run the sync manually
INSERT INTO public.profiles (id, email, first_name, last_name, phone)
SELECT id, email,
       raw_user_meta_data->>'first_name',
       raw_user_meta_data->>'last_name',
       raw_user_meta_data->>'phone'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;
```

---

## ✨ All Set!

You now have:
- ✅ All user data synced
- ✅ Admin system installed
- ✅ Admin access granted
- ✅ Dashboard running
- ✅ Future signups automated

**Next:** Ready for **Phase 2: Member Management**? Let me know! 💪
