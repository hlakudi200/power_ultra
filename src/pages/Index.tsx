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
  const { session, loading, isNewLogin } = useSession();
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

  // Effect to redirect ONLY admins and trainers after login
  // Regular members can browse public pages freely
  useEffect(() => {
    const checkAndRedirect = async () => {
      if (loading) return;

      // Only redirect if this is a new login (not a page reload with existing session)
      if (session && isNewLogin) {
        setIsCheckingRole(true);

        try {
          // Poll for profile with retries to handle new Google user profile creation
          let profile = null;
          let retries = 0;
          const maxRetries = 5;

          while (!profile && retries < maxRetries) {
            const { data, error } = await supabase
              .from("profiles")
              .select("is_admin")
              .eq("id", session.user.id)
              .maybeSingle();

            if (data) {
              profile = data;
              break;
            }

            if (error && !error.message.includes('not found')) {
              console.error("Error fetching profile:", error);
              break;
            }

            // Profile doesn't exist yet, wait and retry
            await new Promise(resolve => setTimeout(resolve, 200));
            retries++;
          }

          if (!profile) {
            console.error("Profile not found after", retries, "retries");
            setIsCheckingRole(false);
            return;
          }

          // Admins go to admin dashboard automatically
          if (profile.is_admin === true) {
            // Clean up OAuth hash before redirect
            if (window.location.hash) {
              window.history.replaceState(null, '', window.location.pathname);
            }
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

          // Trainers go to trainer dashboard automatically
          if (trainerData) {
            // Clean up OAuth hash before redirect
            if (window.location.hash) {
              window.history.replaceState(null, '', window.location.pathname);
            }
            navigate("/trainer-dashboard", { replace: true });
            return;
          }

          // Regular members: DO NOT auto-redirect
          // Let them browse public pages
          // They can use "Dashboard" button in navigation to go to dashboard manually
          // Clean up OAuth hash for regular members too
          if (window.location.hash) {
            window.history.replaceState(null, '', window.location.pathname);
          }
          setIsCheckingRole(false);
        } catch (error) {
          console.error("Error in role check:", error);
          setIsCheckingRole(false);
        }
      } else {
        setIsCheckingRole(false);
      }
    };

    checkAndRedirect();
  }, [session, loading, isNewLogin, navigate]);

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
