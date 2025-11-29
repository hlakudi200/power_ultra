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
  const [isCheckingRole, setIsCheckingRole] = useState(true);

  // Effect to scroll to hash on load or hash change
  useEffect(() => {
    if (location.hash) {
      const element = document.querySelector(location.hash);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }, [location.hash]);

  // Effect to redirect logged-in users to their appropriate dashboard
  useEffect(() => {
    const checkAndRedirect = async () => {
      if (loading) return;

      if (session) {
        setIsCheckingRole(true);

        try {
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
            navigate("/admin");
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
            navigate("/trainer-dashboard");
            return;
          }

          // Regular members go to member dashboard
          navigate("/dashboard");
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
  }, [session, loading, navigate]);

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
