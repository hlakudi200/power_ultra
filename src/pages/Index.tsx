import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSession } from "@/context/SessionProvider";
import { supabase } from "@/lib/supabaseClient";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Services from "@/components/Services";
import Schedule from "@/components/Schedule";
import Gallery from "@/components/Gallery";
import Pricing from "@/components/Pricing";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";

const Index = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, loading } = useSession();
  const [isCheckingRole, setIsCheckingRole] = useState(false);

  // Effect to scroll to hash on load or hash change
  useEffect(() => {
    // Only handle navigation hashes (like #features), not OAuth callback hashes
    if (location.hash && !location.hash.includes('access_token') && !location.hash.includes('error')) {
      const element = document.querySelector(location.hash);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }, [location.hash]);

  // Effect to redirect logged-in users ONLY after OAuth callback
  // This allows logged-in members to browse public pages while still
  // redirecting them automatically after Google sign-in
  useEffect(() => {
    const checkAndRedirect = async () => {
      if (loading) return;

      // Only redirect if coming from OAuth (has hash with tokens)
      const hasOAuthCallback = location.hash && location.hash.includes('access_token');

      if (session && hasOAuthCallback) {
        setIsCheckingRole(true);

        try {
          // Small delay to ensure profile creation completes for new Google users
          // This handles the race condition where OAuth creates session before profile
          await new Promise(resolve => setTimeout(resolve, 500));

          // Check if user is admin
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("is_admin")
            .eq("id", session.user.id)
            .single();

          if (profileError) {
            console.error("Error fetching profile:", profileError);
            setIsCheckingRole(false);
            return;
          }

          // Admins go to admin dashboard
          if (profile?.is_admin) {
            navigate("/admin", { replace: true });
            return;
          }

          // Check if user is a trainer
          const { data: trainerData, error: trainerError } = await supabase
            .from("instructors")
            .select("id")
            .eq("user_id", session.user.id)
            .eq("is_personal_trainer", true)
            .maybeSingle();

          if (trainerError) {
            console.error("Error checking trainer status:", trainerError);
          }

          // Trainers go to trainer dashboard
          if (trainerData) {
            navigate("/trainer-dashboard", { replace: true });
            return;
          }

          // Regular members go to member dashboard
          navigate("/dashboard", { replace: true });
        } catch (error) {
          console.error("Error in role check:", error);
        } finally {
          setIsCheckingRole(false);
        }
      } else {
        setIsCheckingRole(false);
      }
    };

    checkAndRedirect();
  }, [session, loading, navigate, location.hash]);

  // Show loading state while checking role and redirecting
  if (session && isCheckingRole) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Navigation component is now handled by Layout.tsx */}
      <section id="home">
        <Hero />
      </section>
      <section id="about">
        <About />
      </section>
      <section id="services">
        <Services />
      </section>
      <section id="schedule">
        <Schedule />
      </section>
      <section id="gallery">
        <Gallery />
      </section>
      <section id="pricing">
        <Pricing />
      </section>
      <section id="contact">
        <Contact />
      </section>
      <Footer />
    </main>
  );
};

export default Index;
