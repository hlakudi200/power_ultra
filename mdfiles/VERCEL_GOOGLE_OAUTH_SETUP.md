# Google OAuth Setup for Vercel Deployment

Your app is deployed at: `https://power-ultra-six.vercel.app/`

The OAuth callback is redirecting with the hash visible because the redirect URLs aren't properly configured. Here's how to fix it:

---

## 🔧 Step 1: Update Google Cloud Console

### 1. Go to Google Cloud Console
https://console.cloud.google.com

### 2. Select Your Project
Select the project where you created your OAuth Client ID

### 3. Navigate to Credentials
- Click **APIs & Services** → **Credentials**
- Find your OAuth 2.0 Client ID
- Click the **Edit** icon (pencil)

### 4. Update Authorized JavaScript Origins

**Add these URLs:**
```
https://power-ultra-six.vercel.app
https://vhlkwzpbogbmdsbzlzmh.supabase.co
```

### 5. Update Authorized Redirect URIs

**Add these URLs:**
```
https://vhlkwzpbogbmdsbzlzmh.supabase.co/auth/v1/callback
https://power-ultra-six.vercel.app
```

**Important Notes:**
- ✅ Use `https://` (not `http://`)
- ✅ NO trailing slash on the Vercel URL
- ✅ Include the Supabase callback URL
- ✅ Keep any localhost URLs for local development

### 6. Save Changes
Click **Save** at the bottom

⏰ **Wait 5-10 minutes** for Google to propagate the changes

---

## 🗄️ Step 2: Verify Supabase Configuration

### 1. Go to Supabase Dashboard
https://app.supabase.com

### 2. Select Your Project
Navigate to your Power Ultra Gym project

### 3. Check Authentication Settings
- Go to **Authentication** → **Providers**
- Click on **Google**
- Verify these settings:

**Google Provider Settings:**
- ✅ Enable Sign in with Google: **ON**
- ✅ Client ID: Your Google Client ID (already set)
- ✅ Client Secret: Your Google Client Secret (already set)

### 4. Check Redirect URLs

Go to **Authentication** → **URL Configuration**

**Site URL:**
```
https://power-ultra-six.vercel.app
```

**Redirect URLs (Add if not present):**
```
https://power-ultra-six.vercel.app/**
https://power-ultra-six.vercel.app
```

Click **Save**

---

## 🌐 Step 3: Update Your Code (If Needed)

The code should already handle this correctly with `redirectTo={window.location.origin}`, but let's verify:

### Check AuthDialog.tsx

The redirect should be:
```typescript
<Auth
  supabaseClient={supabase}
  appearance={{ theme: customTheme }}
  providers={['google']}
  redirectTo={window.location.origin}  // ✅ This is correct
  // ...
/>
```

This will automatically use:
- `http://localhost:8080` during local development
- `https://power-ultra-six.vercel.app` on Vercel

**No code changes needed** - this is already configured correctly!

---

## 🧪 Step 4: Test the Flow

### 1. Clear Browser Cache
- Open DevTools (F12)
- Right-click refresh button → **Empty Cache and Hard Reload**
- Or use Incognito/Private window

### 2. Test Sign In
1. Go to `https://power-ultra-six.vercel.app`
2. Click **Login/Sign Up**
3. Click **Sign in with Google**
4. Select your Google account
5. Grant permissions

### Expected Flow:
```
1. Click "Sign in with Google"
   ↓
2. Google popup opens
   ↓
3. User authenticates
   ↓
4. Redirect to: https://vhlkwzpbogbmdsbzlzmh.supabase.co/auth/v1/callback#access_token=...
   ↓
5. Supabase processes auth
   ↓
6. Redirect back to: https://power-ultra-six.vercel.app
   ↓
7. Hash cleaned up by SessionProvider
   ↓
8. Index.tsx detects session
   ↓
9. Shows "Redirecting..." spinner
   ↓
10. Redirects to: https://power-ultra-six.vercel.app/dashboard
```

### 3. What You Should See

✅ **Success:**
- Google popup closes
- Brief "Redirecting to your dashboard..." message
- Redirect to `/dashboard`
- Clean URL: `https://power-ultra-six.vercel.app/dashboard`
- Your profile with Google avatar visible

❌ **If Still Seeing Hash:**
- URL stays at: `https://power-ultra-six.vercel.app/#access_token=...`
- This means redirect URLs aren't configured correctly
- Go back to Step 1 and verify all URLs

---

## 🐛 Troubleshooting

### Issue: "Redirect URI Mismatch" Error

**Error message:**
```
Error 400: redirect_uri_mismatch
```

**Solution:**
1. Check Google Cloud Console → Credentials
2. Verify **Authorized redirect URIs** includes:
   - `https://vhlkwzpbogbmdsbzlzmh.supabase.co/auth/v1/callback`
3. Wait 5-10 minutes after saving
4. Try again in incognito window

---

### Issue: Hash Still Visible in URL

**URL looks like:**
```
https://power-ultra-six.vercel.app/#access_token=eyJ...&refresh_token=...
```

**Causes:**
1. Browser cached old redirect flow
2. Redirect URLs not configured in Google Console
3. Propagation delay (Google needs time to update)

**Solutions:**
1. Clear browser cache and cookies
2. Try in incognito/private window
3. Wait 10 minutes after saving Google Console changes
4. Check browser console for errors
5. Verify Supabase Site URL is set to `https://power-ultra-six.vercel.app`

---

### Issue: Stuck on Index Page, Not Redirecting

**Symptoms:**
- Google login works
- Redirects to `https://power-ultra-six.vercel.app`
- Hash clears
- But stays on index page (doesn't go to dashboard)

**Solution:**
1. Check browser console for errors
2. Verify profile was created in Supabase:
   ```sql
   SELECT * FROM profiles WHERE email = 'your-email@gmail.com';
   ```
3. If no profile, check SessionProvider error logs
4. May need to manually create profile in Supabase

---

## ✅ Verification Checklist

### Google Cloud Console
- [ ] Authorized JavaScript origins includes `https://power-ultra-six.vercel.app`
- [ ] Authorized JavaScript origins includes `https://vhlkwzpbogbmdsbzlzmh.supabase.co`
- [ ] Authorized redirect URIs includes `https://vhlkwzpbogbmdsbzlzmh.supabase.co/auth/v1/callback`
- [ ] Authorized redirect URIs includes `https://power-ultra-six.vercel.app`
- [ ] Changes saved
- [ ] Waited 10 minutes for propagation

### Supabase Dashboard
- [ ] Google provider enabled
- [ ] Client ID configured
- [ ] Client Secret configured
- [ ] Site URL is `https://power-ultra-six.vercel.app`
- [ ] Redirect URLs include `https://power-ultra-six.vercel.app/**`

### Testing
- [ ] Cleared browser cache
- [ ] Tested in incognito window
- [ ] Google popup opens
- [ ] Can select Google account
- [ ] No "redirect_uri_mismatch" error
- [ ] Redirects to dashboard
- [ ] Clean URL (no hash visible)
- [ ] Profile data saved (name, avatar)

---

## 📝 Complete Configuration Example

### Google Cloud Console - Authorized JavaScript Origins
```
http://localhost:8080
http://localhost:3000
https://power-ultra-six.vercel.app
https://vhlkwzpbogbmdsbzlzmh.supabase.co
```

### Google Cloud Console - Authorized Redirect URIs
```
http://localhost:8080
http://localhost:3000
https://vhlkwzpbogbmdsbzlzmh.supabase.co/auth/v1/callback
https://power-ultra-six.vercel.app
```

### Supabase - Authentication URL Configuration
**Site URL:**
```
https://power-ultra-six.vercel.app
```

**Redirect URLs:**
```
https://power-ultra-six.vercel.app/**
http://localhost:8080/**
http://localhost:3000/**
```

---

## 🚀 After Configuration

Once everything is configured:

1. **Google OAuth will work seamlessly**
2. **Users sign in with Google**
3. **Automatically redirect to dashboard**
4. **Profile data synced (name, email, avatar)**
5. **Clean URLs with no visible tokens**

---

## 🔐 Security Notes

**Never share:**
- Google Client Secret
- Supabase API keys
- Access tokens visible in that hash URL

**The hash with tokens is temporary:**
- It's part of OAuth flow
- Supabase processes it
- Our code cleans it up
- Users won't see it after proper configuration

---

**Setup Date:** November 29, 2024
**Vercel URL:** https://power-ultra-six.vercel.app
**Supabase Project:** vhlkwzpbogbmdsbzlzmh
