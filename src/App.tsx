import { useState, useEffect } from "react";
// Removed Toaster, Sonner, TooltipProvider imports as they move to Layout
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Outlet } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import SetupProfile from "./pages/SetupProfile";
import Dashboard from "./pages/Dashboard";
import Layout from "./components/Layout"; // Import the Layout component

import { SessionProvider, useSession } from "./context/SessionProvider";
import { useToast } from "@/components/ui/use-toast"; // Keep useToast for ProtectedRoute
import { supabase } from "@/lib/supabaseClient"; // Keep supabase for ProtectedRoute


const queryClient = new QueryClient();

// Protected Route Wrapper
const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { session, loading } = useSession();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isMembershipChecked, setIsMembershipChecked] = useState(false);
  const [hasActiveMembership, setHasActiveMembership] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(true);

  // Effect 1: Check authentication status and fetch profile
  useEffect(() => {
    const checkMembership = async () => {
      if (!loading && !session) {
        // Not authenticated
        navigate("/");
        toast({
          title: "Access Denied",
          description: "You must be logged in to access the dashboard.",
          variant: "destructive",
        });
        return;
      }

      if (session && !isMembershipChecked) {
        setIsProfileLoading(true);
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("membership_expiry_date")
          .eq("id", session.user.id)
          .single();

        if (profileError) {
          console.error("Error fetching profile for membership check:", profileError);
          setHasActiveMembership(false); // Assume no active membership on error
        } else {
          const expiryDate = profile?.membership_expiry_date ? new Date(profile.membership_expiry_date) : null;
          setHasActiveMembership(expiryDate && expiryDate > new Date());
        }
        setIsProfileLoading(false);
        setIsMembershipChecked(true);
      }
    };

    checkMembership();
  }, [session, loading, navigate, isMembershipChecked, toast]);

  // Effect 2: Handle redirection based on membership status
  useEffect(() => {
    if (isMembershipChecked && !hasActiveMembership && !isProfileLoading) {
      navigate("/"); // Redirect if no active membership
      toast({
        title: "Access Denied",
        description: "An active membership is required to access the dashboard.",
        variant: "destructive",
      });
    }
  }, [isMembershipChecked, hasActiveMembership, isProfileLoading, navigate, toast]);

  if (loading || isProfileLoading || !isMembershipChecked) {
    return <div className="min-h-screen flex items-center justify-center bg-background text-foreground">Loading user permissions...</div>;
  }

  return session && hasActiveMembership ? children : null; // Render children if authenticated AND has active membership
};

// This component handles the redirection logic for new users and all app routes
const AppRoutes = () => {
  const { session, loading } = useSession();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && session) {
      const userMetadata = session.user.user_metadata;
      const hasName = userMetadata?.first_name && userMetadata?.last_name;

      // Redirect to profile setup if name is missing and not already on the setup page
      if (!hasName && location.pathname !== "/setup-profile") {
        navigate("/setup-profile");
      }
    }
  }, [session, loading, navigate, location]);

  return (
    <Routes>
      <Route path="/" element={<Layout />}> {/* Use Layout as parent for all main routes */}
        <Route index element={<Index />} /> {/* Index route for / */}
        <Route path="/setup-profile" element={<SetupProfile />} />
        
        {/* Protected Routes */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />

        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
};


const App = () => (
  <QueryClientProvider client={queryClient}>
    <SessionProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
    </SessionProvider>
  </QueryClientProvider>
);

export default App;
