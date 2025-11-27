import { useEffect, useState } from "react";
import { useSession } from "@/context/SessionProvider";
import { supabase } from "@/lib/supabaseClient";
import { useNavigate } from "react-router-dom";

interface AdminUser {
  id: string;
  email: string;
  role: "super_admin" | "admin" | "staff" | "instructor" | null;
  is_admin: boolean;
  first_name: string | null;
  last_name: string | null;
}

export function useAdminAuth() {
  const { session, loading: sessionLoading } = useSession();
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (sessionLoading) return;

      if (!session) {
        setLoading(false);
        setError("Not authenticated");
        navigate("/");
        return;
      }

      try {
        // Fetch user profile to check admin status
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id, email, role, is_admin, first_name, last_name")
          .eq("id", session.user.id)
          .single();

        if (profileError) throw profileError;

        if (!profile || !profile.is_admin) {
          setError("Unauthorized: Admin access required");
          navigate("/");
          return;
        }

        setAdminUser(profile as AdminUser);
        setError(null);
      } catch (err: any) {
        console.error("Admin auth error:", err);
        setError(err.message || "Failed to verify admin status");
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [session, sessionLoading, navigate]);

  return { adminUser, loading, error, isAdmin: !!adminUser };
}
