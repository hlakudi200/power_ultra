// src/context/SessionProvider.tsx
import { supabase } from "@/lib/supabaseClient";
import { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { handleGoogleSignIn } from "@/lib/authHelpers";

type SessionContextType = {
  session: Session | null;
  loading: boolean;
  isNewLogin: boolean;
};

const SessionContext = createContext<SessionContextType>({
  session: null,
  loading: true,
  isNewLogin: false,
});

export const useSession = () => useContext(SessionContext);

export const SessionProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isNewLogin, setIsNewLogin] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Handle Google sign-in specifically
      if (event === 'SIGNED_IN' && session?.user) {
        // Set flag to indicate this is a new login (not just session restore)
        setIsNewLogin(true);

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

      if (event === 'SIGNED_OUT') {
        setIsNewLogin(false);
      }

      setSession(session);
      setLoading(false);

      // Note: Hash cleanup will be handled by Index.tsx after redirect logic runs
      // This prevents race condition where hash is cleaned before redirect check
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
    <SessionContext.Provider value={{ session, loading, isNewLogin }}>
      {children}
    </SessionContext.Provider>
  );
};
