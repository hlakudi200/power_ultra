import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, X, Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "@/context/SessionProvider";
import { AuthDialog } from "./AuthDialog";
import { NotificationBell } from "./NotificationBell";
import { supabase } from "@/lib/supabaseClient";
import { Link, useNavigate, useLocation } from "react-router-dom"; // Import Link, useNavigate, and useLocation

import { useToast } from "@/hooks/use-toast";

const navLinks = [
  { name: "Home", href: "#home" },
  { name: "About", href: "#about" },
  { name: "Services", href: "#services" },
  { name: "Schedule", href: "#schedule" },
  { name: "Gallery", href: "#gallery" },
  { name: "Pricing", href: "#pricing" },
  { name: "Contact", href: "#contact" },
];

const trainerNavLinks = [
  { name: "Dashboard", href: "/trainer-dashboard" },
  { name: "Clients", href: "/trainer-dashboard/clients" },
];

const Navigation = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const { session, profile } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const isTrainerDashboard = location.pathname.startsWith('/trainer-dashboard');
  const isTrainer = profile?.role === 'trainer';

  const currentNavLinks = isTrainer && isTrainerDashboard ? trainerNavLinks : navLinks;
  
  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (href: string) => {
    // If not on the homepage, navigate to homepage first, then handle scroll
    if (location.pathname !== "/") {
      navigate(`/${href}`); // Navigate to /#section
    } else {
      // If already on homepage, just scroll
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
    setIsMobileMenuOpen(false); // Close mobile menu regardless
  };

  const handleLogout = async () => {
    try {
      toast({ title: "Logging out..." });
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      toast({
        title: "Logged out successfully",
        description: "You have been signed out of your account.",
      });
      navigate("/"); // Navigate to home after logout
    } catch (error) {
      toast({
        title: "Logout failed",
        description: "There was an error signing out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const AuthButton = () => {
    if (!session) {
      return (
        <Button
          size="lg"
          onClick={() => setIsAuthDialogOpen(true)}
          className="bg-gradient-primary text-primary-foreground hover:shadow-glow transition-all duration-300 font-bold"
        >
          Login
        </Button>
      );
    }

    const { user_metadata } = session.user;
    const displayName = (user_metadata?.first_name && user_metadata?.last_name)
      ? `${user_metadata.first_name} ${user_metadata.last_name}`
      : session.user.email;

    return (
      <div className="flex items-center gap-2 flex-wrap">
        <NotificationBell />
        <span className="text-sm font-medium text-foreground hidden sm:inline truncate" title={displayName}>
          {displayName}
        </span>
        <Button variant="outline" onClick={handleLogout} className="border-primary text-primary hover:bg-primary/10 hover:text-primary">
          Logout
        </Button>
      </div>
    );
  };

  return (
    <>
      <nav
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          isScrolled
            ? "bg-background/95 backdrop-blur-md shadow-strong"
            : "bg-transparent"
        )}
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <a
              href="#home"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection("#home");
              }}
              className="flex items-center gap-2 text-2xl font-black tracking-tight group"
            >
              <Dumbbell className="w-8 h-8 text-primary group-hover:rotate-180 transition-transform duration-500" />
              <span className="text-foreground">
                POWER <span className="text-primary">ULTRA</span>
              </span>
            </a>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {currentNavLinks.map((link) => (
                <Button
                  key={link.name}
                  variant="ghost"
                  onClick={() => {
                    if (link.href.startsWith('/')) {
                      navigate(link.href);
                    } else {
                      scrollToSection(link.href);
                    }
                  }}
                  className="text-foreground hover:text-primary hover:bg-primary/10 transition-all duration-300 font-semibold"
                >
                  {link.name}
                </Button>
              ))}
              {session && !isTrainerDashboard && (
                <Button
                  key="Dashboard"
                  variant="ghost"
                  onClick={() => {
                    navigate("/dashboard");
                    setIsMobileMenuOpen(false);
                  }}
                  className="text-foreground hover:text-primary hover:bg-primary/10 transition-all duration-300 font-semibold"
                >
                  Dashboard
                </Button>
              )}
            </div>

            {/* Auth Button */}
            <div className="hidden md:flex">
              <AuthButton />
            </div>

            {/* Mobile Menu */}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" className="text-foreground">
                  {isMobileMenuOpen ? (
                    <X className="h-6 w-6" />
                  ) : (
                    <Menu className="h-6 w-6" />
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="bg-background border-l border-border p-0"
              >
                <div className="flex h-full flex-col">
                  <div className="border-b border-border p-6">
                    <div className="flex items-center gap-2 text-2xl font-black tracking-tight">
                      <Dumbbell className="h-8 w-8 text-primary" />
                      <span className="text-foreground">
                        POWER <span className="text-primary">ULTRA</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6">
                    <div className="flex flex-col gap-4">
                      {currentNavLinks.map((link) => (
                        <button
                          key={link.name}
                          onClick={() => {
                            if (link.href.startsWith('/')) {
                               navigate(link.href)
                            } else {
                               scrollToSection(link.href)
                            }
                            setIsMobileMenuOpen(false);
                          }}
                          className="text-left text-lg font-semibold text-foreground transition-colors duration-300 hover:text-primary py-2"
                        >
                          {link.name}
                        </button>
                      ))}
                      {session && !isTrainerDashboard && (
                        <button
                          key="Dashboard"
                          onClick={() => {
                            navigate("/dashboard");
                            setIsMobileMenuOpen(false);
                          }}
                          className="text-left text-lg font-semibold text-foreground transition-colors duration-300 hover:text-primary py-2"
                        >
                          Dashboard
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-auto border-t border-border p-6">
                    <AuthButton />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>
      <AuthDialog isOpen={isAuthDialogOpen} onOpenChange={setIsAuthDialogOpen} />
    </>
  );
};


export default Navigation;
