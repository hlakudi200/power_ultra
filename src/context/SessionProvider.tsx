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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Handle Google sign-in specifically
      if (event === 'SIGNED_IN' && session?.user) {
        const provider = session.user.app_metadata.provider;

        // If user signed in with Google, extract and save profile data
        if (provider === 'google') {
          try {
            await handleGoogleSignIn(session.user);
          } catch (error) {
            console.error('Error handling Google sign-in:', error);
            // Continue anyway - auth succeeded even if profile update failed
          }
        }
      }

      setSession(session);
      setLoading(false);

      // Clean up hash from URL AFTER session is set
      // This ensures Supabase has processed the OAuth callback first
      if (event === 'SIGNED_IN' && window.location.hash && window.location.hash.includes('access_token')) {
        // Use setTimeout to ensure state updates have completed
        setTimeout(() => {
          window.history.replaceState(null, '', window.location.pathname);
        }, 100);
      }
    });

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      // Check if this is a Google OAuth session that needs profile setup
      if (session?.user) {
        const provider = session.user.app_metadata.provider;

        if (provider === 'google') {
          try {
            await handleGoogleSignIn(session.user);
          } catch (error) {
            console.error('Error handling Google sign-in on initial load:', error);
          }
        }
      }

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
