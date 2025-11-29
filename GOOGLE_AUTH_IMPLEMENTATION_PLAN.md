# Google OAuth Implementation Plan

## Current State Analysis

### ✅ What You Already Have

1. **Supabase Auth UI Component**
   - File: `src/components/AuthDialog.tsx`
   - Already includes `providers={['google']}` on line 92
   - Custom theme configured
   - Auto-closes on successful login

2. **Session Management**
   - File: `src/context/SessionProvider.tsx`
   - Handles auth state changes
   - Provides session across app
   - Listens to auth events

3. **Supabase Client**
   - File: `src/lib/supabaseClient.ts`
   - Properly configured with environment variables

4. **Google Client ID**
   - ✅ You have created Google OAuth Client ID

### ❌ What's Missing / Needs Configuration

1. **Supabase Project Configuration**
   - Google OAuth not configured in Supabase dashboard
   - Redirect URLs not set
   - Client ID/Secret not added to Supabase

2. **Profile Data Handling**
   - No logic to extract Google profile data
   - Missing first_name/last_name mapping from Google
   - No avatar URL handling

3. **Error Handling**
   - No specific error handling for OAuth failures
   - Missing user feedback for OAuth errors

4. **Post-OAuth Flow**
   - No automatic profile creation from Google data
   - Missing redirect to profile setup for new Google users

5. **Testing & Edge Cases**
   - No handling for cancelled OAuth
   - No handling for existing email conflicts

---

## 🎯 Implementation Plan

### Phase 1: Supabase Configuration (15 minutes)

#### Step 1.1: Configure Google OAuth in Supabase Dashboard

**Action Items:**
1. Go to Supabase Dashboard → Authentication → Providers
2. Find "Google" provider
3. Enable Google provider
4. Add your Google Client ID
5. Add your Google Client Secret
6. Configure redirect URLs

**Redirect URLs to Add:**
```
# Development
http://localhost:5173/**

# Production
https://your-domain.com/**

# Supabase callback (auto-filled)
https://<your-project-ref>.supabase.co/auth/v1/callback
```

**Scopes Required:**
```
https://www.googleapis.com/auth/userinfo.email
https://www.googleapis.com/auth/userinfo.profile
```

---

#### Step 1.2: Update Google Cloud Console

**Action Items:**
1. Go to Google Cloud Console → APIs & Services → Credentials
2. Click on your OAuth 2.0 Client ID
3. Add Authorized JavaScript origins:
   ```
   http://localhost:5173
   https://your-domain.com
   ```
4. Add Authorized redirect URIs:
   ```
   https://<your-project-ref>.supabase.co/auth/v1/callback
   http://localhost:5173/auth/callback (optional for local)
   ```

---

### Phase 2: Code Implementation (2-3 hours)

#### Step 2.1: Enhance AuthDialog Component

**File:** `src/components/AuthDialog.tsx`

**Changes Needed:**

1. **Add better error handling**
2. **Add loading states**
3. **Add success feedback**

**Updated Component:**

```typescript
// src/components/AuthDialog.tsx
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Auth } from "@supabase/auth-ui-react";
import { useSession } from "@/context/SessionProvider";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

interface AuthDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function AuthDialog({ isOpen, onOpenChange }: AuthDialogProps) {
  const { session } = useSession();
  const { toast } = useToast();
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (session && isOpen) {
      // Show success message
      toast({
        title: "Welcome!",
        description: "You've successfully logged in.",
      });
      onOpenChange(false);
    }
  }, [session, isOpen, onOpenChange, toast]);

  // Listen for auth errors
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        setAuthError(null);
        toast({
          title: "Login Successful",
          description: "Welcome to Power Ultra Gym!",
        });
      }

      if (event === 'USER_UPDATED') {
        console.log('User updated:', session?.user);
      }

      if (event === 'PASSWORD_RECOVERY') {
        toast({
          title: "Check your email",
          description: "We've sent you a password reset link.",
        });
      }
    });

    return () => subscription?.unsubscribe();
  }, [toast]);

  const customTheme = {
    // ... existing theme
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gym-darker text-white border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black">Login or Sign Up</DialogTitle>
        </DialogHeader>

        {authError && (
          <Alert variant="destructive" className="mb-4">
            <Info className="h-4 w-4" />
            <AlertDescription>{authError}</AlertDescription>
          </Alert>
        )}

        <div className="py-4">
          <Auth
            supabaseClient={supabase}
            appearance={{ theme: customTheme }}
            providers={['google']}
            redirectTo={window.location.origin}
            onlyThirdPartyProviders={false}
            showLinks={true}
            magicLink={false}
            view="sign_in"
          />
        </div>

        {/* Help text for Google sign-in */}
        <div className="text-sm text-muted-foreground text-center mt-2">
          <p>Sign in with Google for faster access</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**Key Improvements:**
- ✅ Error state handling
- ✅ Success toast notifications
- ✅ Auth event listening
- ✅ Better UX messaging
- ✅ Redirect configuration

---

#### Step 2.2: Handle Google Profile Data

**File:** Create `src/lib/authHelpers.ts`

**Purpose:** Extract and save Google profile data

```typescript
// src/lib/authHelpers.ts
import { supabase } from "./supabaseClient";
import { User } from "@supabase/supabase-js";

/**
 * Extract user profile data from Google OAuth
 */
export async function handleGoogleSignIn(user: User) {
  try {
    // Google user metadata structure:
    // user.user_metadata = {
    //   avatar_url: "https://...",
    //   email: "user@gmail.com",
    //   email_verified: true,
    //   full_name: "John Doe",
    //   iss: "https://accounts.google.com",
    //   name: "John Doe",
    //   phone_verified: false,
    //   picture: "https://...",
    //   provider_id: "...",
    //   sub: "..."
    // }

    const metadata = user.user_metadata;
    const fullName = metadata.full_name || metadata.name || "";
    const [firstName, ...lastNameParts] = fullName.split(" ");
    const lastName = lastNameParts.join(" ");

    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id, first_name, last_name")
      .eq("id", user.id)
      .single();

    // If profile exists and has name, don't override
    if (existingProfile?.first_name && existingProfile?.last_name) {
      console.log("Profile already complete");
      return;
    }

    // Update or create profile with Google data
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        email: user.email,
        first_name: firstName || null,
        last_name: lastName || null,
        avatar_url: metadata.avatar_url || metadata.picture || null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id'
      });

    if (profileError) {
      console.error("Error updating profile:", profileError);
      throw profileError;
    }

    console.log("Profile updated with Google data");
  } catch (error) {
    console.error("Error in handleGoogleSignIn:", error);
    throw error;
  }
}

/**
 * Check if user needs to complete profile setup
 */
export function needsProfileSetup(user: User | null): boolean {
  if (!user) return false;

  const metadata = user.user_metadata;
  const hasName = metadata.first_name && metadata.last_name;

  return !hasName;
}
```

---

#### Step 2.3: Update SessionProvider to Handle Google Auth

**File:** `src/context/SessionProvider.tsx`

**Enhanced version:**

```typescript
// src/context/SessionProvider.tsx
import { supabase } from "@/lib/supabaseClient";
import { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { handleGoogleSignIn } from "@/lib/authHelpers";

type SessionContextType = {
  session: Session | null;
  loading: boolean;
};

const SessionContext = createContext<SessionContextType>({
  session: null,
  loading: true,
});

export const useSession = () => useContext(SessionContext);

export const SessionProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event);

        // Handle Google sign-in
        if (event === 'SIGNED_IN' && session?.user) {
          const provider = session.user.app_metadata.provider;

          if (provider === 'google') {
            try {
              await handleGoogleSignIn(session.user);
            } catch (error) {
              console.error('Failed to handle Google sign-in:', error);
            }
          }
        }

        setSession(session);
        setLoading(false);
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  return (
    <SessionContext.Provider value={{ session, loading }}>
      {children}
    </SessionContext.Provider>
  );
};
```

**Key Changes:**
- ✅ Detects Google OAuth sign-ins
- ✅ Automatically extracts Google profile data
- ✅ Updates profile in database
- ✅ Handles errors gracefully

---

#### Step 2.4: Update Database Schema (If Needed)

**File:** Create `supabase/migrations/add_avatar_url_to_profiles.sql`

**Check if `avatar_url` column exists in profiles table:**

```sql
-- supabase/migrations/add_avatar_url_to_profiles.sql

-- Add avatar_url column if it doesn't exist
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
```

**Run migration:**
```bash
supabase db push
```

---

#### Step 2.5: Update App.tsx Routing

**File:** `src/App.tsx`

**Ensure profile setup redirect works for Google users:**

```typescript
// In AppRoutes component, around line 147-157

useEffect(() => {
  if (!loading && session) {
    const userMetadata = session.user.user_metadata;
    const provider = session.user.app_metadata.provider;

    // For Google users, check if name was extracted
    const hasName = userMetadata?.first_name && userMetadata?.last_name;

    // For email users, check user_metadata
    const hasNameEmail = userMetadata?.full_name ||
                         (userMetadata?.first_name && userMetadata?.last_name);

    // Redirect to profile setup if name is missing
    if (!hasName && !hasNameEmail && location.pathname !== "/setup-profile") {
      navigate("/setup-profile");
    }
  }
}, [session, loading, navigate, location]);
```

---

### Phase 3: Environment Configuration (5 minutes)

#### Step 3.1: Create .env.example

**File:** Create `.env.example`

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Google OAuth (these are set in Supabase dashboard, not needed in .env)
# GOOGLE_CLIENT_ID=your-client-id (configured in Supabase)
# GOOGLE_CLIENT_SECRET=your-client-secret (configured in Supabase)

# Application
VITE_APP_URL=http://localhost:5173
```

---

#### Step 3.2: Update .env (Local Development)

**File:** `.env` (create if doesn't exist)

```bash
VITE_SUPABASE_URL=https://your-actual-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-actual-anon-key
VITE_APP_URL=http://localhost:5173
```

---

### Phase 4: Testing & Error Handling (1-2 hours)

#### Step 4.1: Create Error Handler for OAuth

**File:** `src/lib/authErrors.ts`

```typescript
// src/lib/authErrors.ts

export function getAuthErrorMessage(error: any): string {
  const errorMsg = error?.message || error?.error_description || '';

  // Google OAuth specific errors
  if (errorMsg.includes('Email not confirmed')) {
    return 'Please verify your email address before signing in.';
  }

  if (errorMsg.includes('Invalid login credentials')) {
    return 'Invalid email or password. Please try again.';
  }

  if (errorMsg.includes('Email already registered')) {
    return 'This email is already registered. Please sign in instead.';
  }

  if (errorMsg.includes('access_denied')) {
    return 'Google sign-in was cancelled. Please try again.';
  }

  if (errorMsg.includes('popup_closed_by_user')) {
    return 'Sign-in popup was closed. Please try again.';
  }

  // Network errors
  if (errorMsg.includes('network') || errorMsg.includes('fetch')) {
    return 'Network error. Please check your connection and try again.';
  }

  // Generic fallback
  return 'An error occurred during sign-in. Please try again.';
}
```

---

#### Step 4.2: Update AuthDialog with Error Handling

```typescript
// In AuthDialog.tsx, add error listener

useEffect(() => {
  // Listen for OAuth errors from URL params
  const params = new URLSearchParams(window.location.search);
  const error = params.get('error');
  const errorDescription = params.get('error_description');

  if (error) {
    const message = getAuthErrorMessage({
      message: error,
      error_description: errorDescription
    });

    setAuthError(message);

    toast({
      title: "Authentication Error",
      description: message,
      variant: "destructive"
    });

    // Clean URL
    window.history.replaceState({}, '', window.location.pathname);
  }
}, [toast]);
```

---

### Phase 5: UI/UX Enhancements (1 hour)

#### Step 5.1: Add Google Button Styling

The Supabase Auth UI already handles Google button styling, but you can customize:

```typescript
// In AuthDialog.tsx customTheme object, add:

const customTheme = {
  default: {
    colors: {
      // ... existing colors
    },
    // Add custom CSS for Google button
    style: {
      button: {
        '.supabase-auth-ui_button-google': {
          backgroundColor: '#4285f4',
          color: 'white',
          border: 'none',
        }
      }
    }
  }
};
```

---

#### Step 5.2: Add Loading State During OAuth

**File:** `src/components/AuthDialog.tsx`

```typescript
const [isAuthenticating, setIsAuthenticating] = useState(false);

useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_IN') {
      setIsAuthenticating(false);
    }

    if (event === 'USER_UPDATED') {
      setIsAuthenticating(true);
    }
  });

  return () => subscription?.unsubscribe();
}, []);

// In JSX:
{isAuthenticating && (
  <div className="flex items-center justify-center p-4">
    <Loader2 className="h-6 w-6 animate-spin" />
    <span className="ml-2">Signing you in...</span>
  </div>
)}
```

---

## 🚨 Potential Gaps & Issues

### Gap 1: Email Conflict Handling

**Issue:** User tries to sign in with Google using email that's already registered with password

**Current State:** ❌ Not handled

**Solution:**
```typescript
// In authHelpers.ts

export async function checkEmailConflict(email: string, provider: string) {
  const { data: existingUser } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('email', email)
    .single();

  if (existingUser && provider !== 'google') {
    throw new Error('This email is already registered. Please sign in with your password.');
  }
}
```

---

### Gap 2: Profile Picture Display

**Issue:** Google provides avatar_url but app doesn't display it

**Current State:** ❌ Not implemented

**Solution:** Update dashboard components to show avatar

```typescript
// In Dashboard.tsx or ProfileSidebar component

{profile?.avatar_url ? (
  <img
    src={profile.avatar_url}
    alt="Profile"
    className="w-16 h-16 rounded-full"
  />
) : (
  <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
    <User className="w-8 h-8" />
  </div>
)}
```

---

### Gap 3: Account Linking

**Issue:** User with email/password wants to link Google account

**Current State:** ❌ Not possible

**Solution:** Add account linking in settings

```typescript
// In Settings/Profile page

async function linkGoogleAccount() {
  const { data, error } = await supabase.auth.linkIdentity({
    provider: 'google'
  });

  if (error) {
    toast({
      title: "Error linking account",
      description: error.message,
      variant: "destructive"
    });
  } else {
    toast({
      title: "Success!",
      description: "Google account linked successfully"
    });
  }
}
```

---

### Gap 4: Google Sign-In Button Not Appearing

**Issue:** Google button doesn't show in Auth UI

**Possible Causes:**
1. Provider not enabled in Supabase
2. Client ID not configured
3. Redirect URL mismatch
4. Cache issue

**Solution:**
1. Clear browser cache
2. Verify Supabase provider is enabled
3. Check browser console for errors
4. Test in incognito mode

---

### Gap 5: Redirect After Sign-In

**Issue:** User not redirected to correct page after Google sign-in

**Current State:** ⚠️ Partially handled

**Solution:**

```typescript
// Store intended destination before auth
localStorage.setItem('auth_redirect', window.location.pathname);

// After successful auth:
const redirect = localStorage.getItem('auth_redirect') || '/dashboard';
localStorage.removeItem('auth_redirect');
navigate(redirect);
```

---

### Gap 6: Google Account Deletion

**Issue:** User deletes Google account but app profile remains

**Current State:** ❌ Not handled

**Solution:** Add RLS policy

```sql
CREATE POLICY "Users can delete own account"
ON profiles FOR DELETE
USING (auth.uid() = id);
```

---

### Gap 7: Mobile OAuth Flow

**Issue:** OAuth popup might not work well on mobile

**Current State:** ⚠️ Not tested

**Solution:** Ensure redirect flow is used (not popup)

```typescript
// In AuthDialog.tsx Auth component
<Auth
  supabaseClient={supabase}
  providers={['google']}
  redirectTo={window.location.origin}
  view="sign_in"
  // This ensures redirect flow on mobile
  queryParams={{
    prompt: 'select_account'
  }}
/>
```

---

## 📋 Implementation Checklist

### Configuration (15 min)
- [ ] Enable Google provider in Supabase Dashboard
- [ ] Add Google Client ID to Supabase
- [ ] Add Google Client Secret to Supabase
- [ ] Configure redirect URLs in Supabase
- [ ] Update Google Cloud Console redirect URIs
- [ ] Add avatar_url column to profiles table

### Code Changes (2-3 hours)
- [ ] Create `src/lib/authHelpers.ts`
- [ ] Create `src/lib/authErrors.ts`
- [ ] Update `src/components/AuthDialog.tsx`
- [ ] Update `src/context/SessionProvider.tsx`
- [ ] Update `src/App.tsx` routing logic
- [ ] Create database migration for avatar_url
- [ ] Add error handling for OAuth failures

### Testing (1 hour)
- [ ] Test Google sign-in (new user)
- [ ] Test Google sign-in (existing user)
- [ ] Test email/password still works
- [ ] Test profile data extraction
- [ ] Test redirect after sign-in
- [ ] Test error scenarios (cancel, network error)
- [ ] Test on mobile device
- [ ] Test on different browsers

### UI/UX (1 hour)
- [ ] Add profile picture display
- [ ] Add loading states
- [ ] Add success messages
- [ ] Add error messages
- [ ] Test mobile responsiveness
- [ ] Add help text for Google sign-in

### Documentation
- [ ] Update README with Google OAuth setup
- [ ] Document environment variables
- [ ] Add troubleshooting guide

---

## 🚀 Quick Start Guide

### Step 1: Supabase Dashboard (5 min)

1. Go to https://app.supabase.com
2. Select your project
3. Navigate to Authentication → Providers
4. Click on "Google"
5. Toggle "Enable Sign in with Google"
6. Paste your Google Client ID
7. Paste your Google Client Secret
8. Save

### Step 2: Google Cloud Console (5 min)

1. Go to https://console.cloud.google.com
2. Select your project
3. Go to APIs & Services → Credentials
4. Click your OAuth 2.0 Client ID
5. Add to "Authorized redirect URIs":
   ```
   https://your-project.supabase.co/auth/v1/callback
   ```
6. Save

### Step 3: Code Implementation (2-3 hours)

1. Create `src/lib/authHelpers.ts` (copy from plan above)
2. Create `src/lib/authErrors.ts` (copy from plan above)
3. Update `src/components/AuthDialog.tsx` (copy from plan above)
4. Update `src/context/SessionProvider.tsx` (copy from plan above)
5. Run database migration for avatar_url
6. Test!

### Step 4: Test (30 min)

```bash
# Start dev server
npm run dev

# Open browser
http://localhost:5173

# Click Login
# Click "Sign in with Google"
# Verify profile data is saved
```

---

## 🐛 Troubleshooting

### Issue: Google button doesn't appear

**Check:**
1. Is provider enabled in Supabase?
2. Is `providers={['google']}` in Auth component?
3. Any console errors?
4. Try incognito mode

**Fix:**
- Clear cache
- Verify Supabase configuration
- Check network tab for failed requests

---

### Issue: Redirect URL mismatch error

**Error:** "redirect_uri_mismatch"

**Fix:**
1. Copy exact error URL
2. Add to Google Cloud Console redirect URIs
3. Add to Supabase allowed URLs

---

### Issue: Profile data not saving

**Check:**
1. Console logs for errors
2. Database RLS policies
3. Profiles table permissions

**Fix:**
- Check `handleGoogleSignIn` is being called
- Verify RLS policies allow upsert
- Check user has permission to update profiles

---

## 📊 Expected User Flow

```
1. User clicks "Login" → AuthDialog opens
2. User clicks "Sign in with Google" → Popup opens
3. User selects Google account → Popup closes
4. SessionProvider detects SIGNED_IN event
5. handleGoogleSignIn() extracts profile data
6. Profile updated in database
7. User redirected to dashboard (or profile setup if incomplete)
8. Success toast shown
9. AuthDialog closes
```

---

## ⏱️ Time Estimates

| Phase | Task | Time |
|-------|------|------|
| 1 | Supabase Config | 15 min |
| 2 | Code Implementation | 2-3 hours |
| 3 | Environment Setup | 5 min |
| 4 | Testing | 1-2 hours |
| 5 | UI/UX Polish | 1 hour |
| **TOTAL** | | **4-6 hours** |

---

**Ready to implement? Let's start with Phase 1!** 🚀
