import { supabase } from "@/lib/supabaseClient";
import { Session, User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { handleGoogleSignIn } from "@/lib/authHelpers";

type Profile = {
  id: string;
  role: string;
  // Add other profile fields as needed
} | null;

type SessionContextType = {
  session: Session | null;
  profile: Profile;
  loading: boolean;
  isNewLogin: boolean;
  resetNewLogin: () => void;
};

const SessionContext = createContext<SessionContextType>({
  session: null,
  profile: null,
  loading: true,
  isNewLogin: false,
  resetNewLogin: () => {},
});

export const useSession = () => useContext(SessionContext);

export const SessionProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile>(null);
  const [loading, setLoading] = useState(true);
  const [isNewLogin, setIsNewLogin] = useState(false);

  // Helper to fetch profile for a given user
  // SIMPLIFIED: Removed timeouts since we're fixing the root cause
  const fetchProfile = async (userId: string, userEmail: string | undefined) => {
    console.log('[SessionProvider] fetchProfile START for user:', userId);

    try {
      console.log('[SessionProvider] Querying profiles table...');

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      console.log('[SessionProvider] Query result:', {
        hasData: !!profileData,
        error: profileError?.message,
      });

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('[SessionProvider] Error fetching profile:', profileError);
        return null;
      }

      // If no profile exists, create one
      if (!profileData) {
        console.log('[SessionProvider] No profile found, creating new profile...');

        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            email: userEmail,
            role: 'member',
          })
          .select()
          .single();

        if (createError) {
          console.error('[SessionProvider] Error creating profile:', createError);
          return null;
        }

        console.log('[SessionProvider] Profile created successfully:', newProfile);
        return newProfile;
      }

      console.log('[SessionProvider] Profile found:', profileData);
      return profileData;
    } catch (error) {
      console.error('[SessionProvider] Unexpected error in fetchProfile:', error);
      return null;
    }
  };

  useEffect(() => {
    console.log('[SessionProvider] Initializing...');

    // Step 1: Get initial session (following Supabase best practices)
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      console.log('[SessionProvider] Initial session check:', session ? 'Found' : 'Not found');

      if (error) {
        console.error('[SessionProvider] Error getting initial session:', error);
        setLoading(false);
        return;
      }

      setSession(session);

      // Fetch profile if session exists
      if (session?.user) {
        const profileData = await fetchProfile(session.user.id, session.user.email);
        setProfile(profileData);
      }

      setLoading(false);
    }).catch((error) => {
      console.error('[SessionProvider] getSession() failed:', error);
      setLoading(false);
    });

    // =====================================================
    // CRITICAL FIX: Synchronous callback with deferred async operations
    // This follows official Supabase best practices to prevent hanging
    // =====================================================

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[SessionProvider] Auth state changed:', event, session ? 'Session exists' : 'No session');

      // Synchronously update session state immediately
      setSession(session);

      // Defer all async operations to next event loop tick
      // This prevents blocking the auth state machine
      setTimeout(async () => {
        try {
          if (event === 'SIGNED_IN' && session?.user) {
            setIsNewLogin(true);
            console.log('[SessionProvider] Handling SIGNED_IN event (deferred)');

            // Handle Google sign-in profile creation
            if (session.user.app_metadata.provider === 'google') {
              console.log('[SessionProvider] Google sign-in detected, creating/updating profile');
              const result = await handleGoogleSignIn(session.user);
              if (result.success) {
                // Profile was created/updated by handleGoogleSignIn, just fetch it
                const profileData = await fetchProfile(session.user.id, session.user.email);
                setProfile(profileData);
                console.log('[SessionProvider] Google profile set after SIGNED_IN');
              } else {
                console.error('[SessionProvider] Failed to create Google profile:', result.error);
                setProfile(null);
              }
            } else {
              // For email/password sign-in, fetch or create profile
              const profileData = await fetchProfile(session.user.id, session.user.email);
              setProfile(profileData);
              console.log('[SessionProvider] Profile set after SIGNED_IN');
            }
            setLoading(false);

          } else if (event === 'SIGNED_OUT') {
            console.log('[SessionProvider] Handling SIGNED_OUT event');
            setIsNewLogin(false);
            setProfile(null);
            setLoading(false);

          } else if (event === 'PASSWORD_RECOVERY') {
            console.log('[SessionProvider] Handling PASSWORD_RECOVERY event');
            // For password recovery, we have a session but don't need to fetch profile yet
            setProfile(null);
            setLoading(false);

          } else if (event === 'TOKEN_REFRESHED') {
            console.log('[SessionProvider] Token refreshed - keeping existing profile');
            // Don't fetch profile on every token refresh - just keep existing session
            // This prevents unnecessary database calls every hour

          } else if (event === 'INITIAL_SESSION') {
            console.log('[SessionProvider] Handling INITIAL_SESSION event');
            if (session?.user) {
              const profileData = await fetchProfile(session.user.id, session.user.email);
              setProfile(profileData);
              console.log('[SessionProvider] Profile set after INITIAL_SESSION');
            }
            setLoading(false);

          } else if (session?.user) {
            // For other events, fetch profile
            console.log('[SessionProvider] Handling other event:', event);
            const profileData = await fetchProfile(session.user.id, session.user.email);
            setProfile(profileData);
            setLoading(false);

          } else {
            setProfile(null);
            setLoading(false);
          }
        } catch (error) {
          console.error('[SessionProvider] Error in deferred auth handler:', error);
          setProfile(null);
          setLoading(false);
        }
      }, 0); // Execute in next event loop tick
    });

    return () => {
      console.log('[SessionProvider] Cleaning up subscription');
      subscription?.unsubscribe();
    };
  }, []);

  const resetNewLogin = () => {
    setIsNewLogin(false);
  };

  return (
    <SessionContext.Provider value={{ session, profile, loading, isNewLogin, resetNewLogin }}>
      {children}
    </SessionContext.Provider>
  );
};
