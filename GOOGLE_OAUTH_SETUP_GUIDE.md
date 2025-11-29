# Google OAuth Setup Guide - Power Ultra Gym

This guide will walk you through setting up Google OAuth authentication for your Power Ultra Gym application.

---

## 📋 Prerequisites

- ✅ Google Cloud Console account
- ✅ Google Client ID (already created)
- ✅ Google Client Secret
- ✅ Supabase project access
- ✅ Access to your project's environment variables

---

## 🚀 Phase 1: Configure Google OAuth in Supabase (15 minutes)

### Step 1: Access Supabase Dashboard

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Select your Power Ultra Gym project
3. Navigate to **Authentication** → **Providers** in the left sidebar

### Step 2: Enable Google Provider

1. Scroll down to find **Google** in the providers list
2. Click on **Google** to expand the configuration
3. Toggle **Enable Sign in with Google** to ON

### Step 3: Add Google Credentials

1. **Client ID**: Paste your Google Client ID (the one you already created)
2. **Client Secret**: Paste your Google Client Secret
   - If you don't have the secret, you'll need to get it from Google Cloud Console

3. **Authorized Redirect URIs**: Copy the redirect URI shown by Supabase
   - It will look like: `https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback`
   - **Important**: Save this URL - you'll need it for Google Cloud Console

4. Click **Save**

---

## 🔧 Phase 2: Configure Google Cloud Console (10 minutes)

### Step 1: Access Google Cloud Console

1. Go to [https://console.cloud.google.com](https://console.cloud.google.com)
2. Select your project (the one where you created the OAuth Client ID)
3. Navigate to **APIs & Services** → **Credentials**

### Step 2: Configure OAuth Consent Screen (if not done)

1. Click **OAuth consent screen** in the left sidebar
2. Configure the following:
   - **App name**: Power Ultra Gym
   - **User support email**: Your support email
   - **App logo** (optional): Upload your gym logo
   - **Authorized domains**: Add your domain (e.g., `powerultragym.com`)
   - **Developer contact email**: Your email

3. Click **Save and Continue**

4. **Scopes**: Add these scopes:
   - `email`
   - `profile`
   - `openid`

5. Click **Save and Continue**

### Step 3: Update OAuth Client Credentials

1. Go to **Credentials** tab
2. Find your OAuth 2.0 Client ID in the list
3. Click the **Edit** icon (pencil)

4. **Authorized JavaScript origins**: Add these URLs:
   ```
   http://localhost:5173
   http://localhost:3000
   https://your-production-domain.com
   ```

5. **Authorized redirect URIs**: Add these URLs:
   ```
   https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback
   http://localhost:5173
   http://localhost:3000
   ```
   Replace `[YOUR-PROJECT-REF]` with your actual Supabase project reference

6. Click **Save**

---

## 💾 Phase 3: Run Database Migration (2 minutes)

### Option A: Using Supabase CLI

```bash
# Navigate to your project directory
cd power-ultra-gym-site-main

# Run the migration
supabase db push

# Or if you want to run specific migration
supabase migration up
```

### Option B: Using Supabase Dashboard

1. Go to Supabase Dashboard → **SQL Editor**
2. Click **New Query**
3. Copy and paste the contents of `supabase/migrations/add_avatar_url_to_profiles.sql`
4. Click **Run**
5. Verify success message

### Verify Migration

Run this query in SQL Editor to verify:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name = 'avatar_url';
```

Expected result: Should show `avatar_url | text`

---

## 🧪 Phase 4: Testing (30 minutes)

### Test Checklist

#### 1. Test Google Sign-In Button Appears
- [ ] Open your app in browser
- [ ] Click on Login/Sign Up
- [ ] Verify "Sign in with Google" button is visible
- [ ] Button should have Google logo and correct styling

#### 2. Test Google Sign-In Flow
- [ ] Click "Sign in with Google"
- [ ] Google account selection popup appears
- [ ] Select a Google account
- [ ] Grant permissions
- [ ] Redirects back to app
- [ ] Success toast notification appears
- [ ] Dialog closes automatically

#### 3. Test Profile Data Extraction
- [ ] After Google sign-in, check browser DevTools → Network tab
- [ ] Look for `/rest/v1/profiles` request
- [ ] Verify profile data includes:
  - `first_name` (from Google full name)
  - `last_name` (from Google full name)
  - `email` (from Google account)
  - `avatar_url` (from Google profile picture)

#### 4. Test Avatar Display
- [ ] Navigate to Dashboard
- [ ] Check "Your Profile" card
- [ ] Google profile picture should be displayed in avatar
- [ ] If no picture: fallback initials should show
- [ ] Avatar should be round with proper styling

#### 5. Test Different Scenarios

**Scenario A: New Google User**
- [ ] Sign in with Google account never used before
- [ ] New profile created in database
- [ ] All Google data extracted correctly
- [ ] Avatar displays immediately

**Scenario B: Existing Email/Password User**
- [ ] User already has account with email/password
- [ ] Try to sign in with Google using same email
- [ ] Should handle gracefully (might create separate account or link)
- [ ] No errors thrown

**Scenario C: Return Google User**
- [ ] Sign out
- [ ] Sign in again with same Google account
- [ ] Existing profile loaded
- [ ] Avatar still displays
- [ ] All data preserved

#### 6. Test Error Handling

**Test cancelled sign-in:**
- [ ] Click "Sign in with Google"
- [ ] Close popup immediately
- [ ] Error message: "Sign-in popup was closed. Please try again."

**Test network error:**
- [ ] Open DevTools → Network tab
- [ ] Set to "Offline"
- [ ] Try Google sign-in
- [ ] Error message: "Network error. Please check your connection and try again."

---

## 🐛 Troubleshooting

### Issue: "Sign in with Google" Button Not Showing

**Possible causes:**
1. Google provider not enabled in Supabase
2. Supabase Auth UI not updated

**Solution:**
```bash
# Check Supabase configuration
supabase status

# Verify provider in Supabase Dashboard
Authentication → Providers → Google (should be ON)

# Update dependencies
npm update @supabase/auth-ui-react @supabase/supabase-js
```

---

### Issue: "Redirect URI Mismatch" Error

**Error message:** `redirect_uri_mismatch`

**Solution:**
1. Go to Google Cloud Console → Credentials
2. Edit your OAuth Client ID
3. Verify redirect URIs include:
   - `https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback`
4. Save changes
5. Wait 5-10 minutes for Google to propagate changes
6. Try again

---

### Issue: Avatar Not Displaying

**Possible causes:**
1. Migration not run
2. `avatar_url` column doesn't exist
3. Image blocked by CORS

**Solution:**

**Check 1: Verify column exists**
```sql
SELECT avatar_url FROM profiles LIMIT 1;
```

**Check 2: Check data**
```sql
SELECT id, email, avatar_url
FROM profiles
WHERE avatar_url IS NOT NULL;
```

**Check 3: Verify UserAvatar component**
- Open browser DevTools → Console
- Check for errors related to image loading
- Google images require `referrerPolicy="no-referrer"`
- This is already set in UserAvatar component

---

### Issue: Profile Data Not Saved

**Symptoms:**
- Google sign-in works
- But first_name, last_name, avatar_url are NULL

**Solution:**

**Check 1: Verify SessionProvider is handling Google auth**
```typescript
// In SessionProvider.tsx, add console.log for debugging
if (provider === 'google') {
  console.log('Google user metadata:', session.user.user_metadata);
  await handleGoogleSignIn(session.user);
}
```

**Check 2: Check RLS policies**
```sql
-- Verify users can insert/update their own profiles
SELECT * FROM pg_policies WHERE tablename = 'profiles';
```

**Check 3: Manual test**
Run this in SQL Editor after Google sign-in:
```sql
SELECT
  id,
  email,
  first_name,
  last_name,
  avatar_url,
  created_at
FROM profiles
WHERE email = 'your-google-email@gmail.com';
```

---

### Issue: "Pop-up Blocked" Error

**Symptoms:**
- Click Google sign-in
- Nothing happens
- Error in console: popup blocked

**Solution:**
1. Enable pop-ups for your site
2. Or use redirect mode instead:

```typescript
// In AuthDialog.tsx
<Auth
  supabaseClient={supabase}
  appearance={{ theme: customTheme }}
  providers={['google']}
  redirectTo={window.location.origin} // Add this
  view="sign_in" // Add this
/>
```

---

## 📊 Verification Queries

### Check if Google OAuth is working:

```sql
-- Count users by provider
SELECT
  raw_app_meta_data->>'provider' as provider,
  COUNT(*) as user_count
FROM auth.users
GROUP BY provider;

-- Expected output:
-- email    | 10
-- google   | 5
```

### Check profile data from Google:

```sql
-- View Google user profiles
SELECT
  p.email,
  p.first_name,
  p.last_name,
  p.avatar_url,
  u.raw_app_meta_data->>'provider' as auth_provider
FROM profiles p
JOIN auth.users u ON u.id = p.id
WHERE u.raw_app_meta_data->>'provider' = 'google';
```

### Check recent Google sign-ins:

```sql
-- View last 10 Google authentications
SELECT
  email,
  raw_user_meta_data->>'full_name' as google_name,
  raw_user_meta_data->>'avatar_url' as google_avatar,
  created_at,
  last_sign_in_at
FROM auth.users
WHERE raw_app_meta_data->>'provider' = 'google'
ORDER BY last_sign_in_at DESC
LIMIT 10;
```

---

## ✅ Final Checklist

### Supabase Configuration
- [ ] Google provider enabled in Supabase
- [ ] Client ID added
- [ ] Client Secret added
- [ ] Redirect URI copied

### Google Cloud Console
- [ ] OAuth consent screen configured
- [ ] Scopes added (email, profile, openid)
- [ ] Authorized JavaScript origins added
- [ ] Authorized redirect URIs added
- [ ] Supabase callback URL added

### Database
- [ ] Migration run successfully
- [ ] `avatar_url` column exists in profiles table
- [ ] RLS policies allow profile updates

### Code
- [ ] All new files created:
  - [ ] `src/lib/authHelpers.ts`
  - [ ] `src/lib/authErrors.ts`
  - [ ] `src/components/UserAvatar.tsx`
- [ ] Files updated:
  - [ ] `src/components/AuthDialog.tsx`
  - [ ] `src/context/SessionProvider.tsx`
  - [ ] `src/pages/Dashboard.tsx`

### Testing
- [ ] Google sign-in button appears
- [ ] Sign-in flow works end-to-end
- [ ] Profile data extracted and saved
- [ ] Avatar displays correctly
- [ ] Error handling works
- [ ] Different scenarios tested

---

## 🎯 Success Criteria

Your Google OAuth is successfully implemented when:

1. ✅ Users can click "Sign in with Google"
2. ✅ Google popup opens and allows account selection
3. ✅ User authenticates and popup closes
4. ✅ User is redirected to Dashboard
5. ✅ Profile shows:
   - Google profile picture in avatar
   - Full name extracted from Google
   - Email from Google account
6. ✅ On subsequent sign-ins, same profile loaded
7. ✅ Error messages are user-friendly
8. ✅ No console errors

---

## 📞 Support

If you encounter issues not covered in this guide:

1. **Check Supabase Logs**:
   - Dashboard → Logs → Auth Logs
   - Look for failed authentication attempts

2. **Check Browser Console**:
   - F12 → Console tab
   - Look for JavaScript errors

3. **Check Network Tab**:
   - F12 → Network tab
   - Filter by "auth" or "profiles"
   - Check for failed requests

4. **Verify Environment**:
   - Check `.env` file has correct Supabase URL and anon key
   - Restart dev server after any .env changes

---

## 🔐 Security Notes

1. **Never commit credentials**:
   - Google Client Secret should be in Supabase only
   - `.env` should be in `.gitignore`

2. **Production setup**:
   - Use environment-specific redirect URIs
   - Update authorized origins for production domain
   - Enable Google's "Verification" for published apps

3. **RLS Policies**:
   - Verify users can only update their own profiles
   - Admin users have appropriate elevated permissions

---

**Setup Complete! 🎉**

Users can now sign in with their Google accounts and their profile pictures will be automatically displayed throughout the app.
