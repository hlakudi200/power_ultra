// src/context/SessionProvider.tsx
import { supabase } from "@/lib/supabaseClient";
import { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";

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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

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
