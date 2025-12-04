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
};

const SessionContext = createContext<SessionContextType>({
  session: null,
  profile: null,
  loading: true,
  isNewLogin: false,
});

export const useSession = () => useContext(SessionContext);

export const SessionProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile>(null);
  const [loading, setLoading] = useState(true);
  const [isNewLogin, setIsNewLogin] = useState(false);

  // Helper to fetch profile for a given user
  const fetchProfile = async (userId: string, userEmail: string | undefined) => {
    console.log('[SessionProvider] fetchProfile START for user:', userId);

    try {
      console.log('[SessionProvider] Querying profiles table...');

      // Add 5-second timeout to prevent infinite hanging
      const fetchPromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      const timeoutPromise = new Promise<{ data: null; error: { message: string; code: string } }>((_, reject) =>
        setTimeout(() => {
          console.error('[SessionProvider] Profile query TIMEOUT after 5s');
          reject({ data: null, error: { message: 'Query timeout', code: 'TIMEOUT' } });
        }, 5000)
      );

      const result = await Promise.race([fetchPromise, timeoutPromise]);
      const { data: profileData, error: profileError } = result;

      console.log('[SessionProvider] Query result:', {
        hasData: !!profileData,
        error: profileError?.message,
        errorCode: profileError?.code
      });

      // If timeout or error, return null and let app continue
      if (profileError) {
        if (profileError.code === 'TIMEOUT') {
          console.error('[SessionProvider] CRITICAL: Profile query timed out. Possible RLS or connection issue.');
          return null;
        }
        if (profileError.code !== 'PGRST116') {
          console.error('[SessionProvider] Error fetching profile:', profileError);
          return null;
        }
      }

      // If no profile exists, create one
      if (!profileData) {
        console.log('[SessionProvider] No profile found, creating new profile...');

        const createPromise = supabase
          .from('profiles')
          .insert({
            id: userId,
            email: userEmail,
            role: 'member',
          })
          .select()
          .single();

        const createTimeoutPromise = new Promise<{ data: null; error: { message: string } }>((_, reject) =>
          setTimeout(() => {
            console.error('[SessionProvider] Profile creation TIMEOUT after 5s');
            reject({ data: null, error: { message: 'Create timeout' } });
          }, 5000)
        );

        const createResult = await Promise.race([createPromise, createTimeoutPromise]);
        const { data: newProfile, error: createError } = createResult;

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
    });

    // Step 2: Listen for auth changes (following Supabase best practices)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[SessionProvider] Auth state changed:', event, session ? 'Session exists' : 'No session');

      setSession(session);

      if (event === 'SIGNED_IN' && session?.user) {
        setIsNewLogin(true);
        console.log('[SessionProvider] Handling SIGNED_IN event');

        try {
          // Handle Google sign-in profile creation
          if (session.user.app_metadata.provider === 'google') {
            await handleGoogleSignIn(session.user);
          }

          // Fetch or create profile
          const profileData = await fetchProfile(session.user.id, session.user.email);
          setProfile(profileData);
          console.log('[SessionProvider] Profile set after SIGNED_IN');
        } catch (error) {
          console.error('[SessionProvider] Error handling SIGNED_IN:', error);
          setProfile(null);
        } finally {
          setLoading(false);
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('[SessionProvider] Handling SIGNED_OUT event');
        setIsNewLogin(false);
        setProfile(null);
        setLoading(false);
      } else if (event === 'INITIAL_SESSION') {
        console.log('[SessionProvider] Handling INITIAL_SESSION event');
        if (session?.user) {
          try {
            const profileData = await fetchProfile(session.user.id, session.user.email);
            setProfile(profileData);
            console.log('[SessionProvider] Profile set after INITIAL_SESSION');
          } catch (error) {
            console.error('[SessionProvider] Error handling INITIAL_SESSION:', error);
            setProfile(null);
          }
        }
        setLoading(false);
      } else if (session?.user) {
        // For other events (TOKEN_REFRESHED, etc.), just update profile
        console.log('[SessionProvider] Handling other event:', event);
        try {
          const profileData = await fetchProfile(session.user.id, session.user.email);
          setProfile(profileData);
        } catch (error) {
          console.error('[SessionProvider] Error fetching profile:', error);
        }
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      console.log('[SessionProvider] Cleaning up subscription');
      subscription?.unsubscribe();
    };
  }, []);

  return (
    <SessionContext.Provider value={{ session, profile, loading, isNewLogin }}>
      {children}
    </SessionContext.Provider>
  );
};
