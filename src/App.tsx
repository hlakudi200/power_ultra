import { useState, useEffect } from "react";
// Removed Toaster, Sonner, TooltipProvider imports as they move to Layout
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Outlet } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import SetupProfile from "./pages/SetupProfile";
import Dashboard from "./pages/Dashboard";
import WorkoutPlanPage from "./pages/WorkoutPlanPage";
import TrainerDashboard from "./pages/TrainerDashboard";
import ClientDetailView from "./pages/trainer/ClientDetailView";
import Layout from "./components/Layout"; // Import the Layout component

// Admin imports
import AdminDashboard from "./pages/admin/AdminDashboard";
import Members from "./pages/admin/Members";
import Classes from "./pages/admin/Classes";
import Schedule from "./pages/admin/Schedule";
import Bookings from "./pages/admin/Bookings";
import Inquiries from "./pages/admin/Inquiries";
import Memberships from "./pages/admin/Memberships";
import Instructors from "./pages/admin/Instructors";
import Analytics from "./pages/admin/Analytics";
import Settings from "./pages/admin/Settings";
import UpdatePasswordPage from "./pages/UpdatePassword";
import ActivateMembership from "./pages/ActivateMembership";

import { SessionProvider, useSession } from "./context/SessionProvider";
import { useToast } from "@/components/ui/use-toast"; // Keep useToast for ProtectedRoute
import { supabase } from "@/lib/supabaseClient"; // Keep supabase for ProtectedRoute


const queryClient = new QueryClient();

// Protected Route Wrapper with Role-Based Routing
const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { session, loading } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const [isMembershipChecked, setIsMembershipChecked] = useState(false);
  const [hasActiveMembership, setHasActiveMembership] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [userRole, setUserRole] = useState<{
    isAdmin: boolean;
    isTrainer: boolean;
  } | null>(null);

  // Effect 1: Check authentication status, fetch profile, and determine role
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const checkMembershipAndRole = async () => {
      console.log('[ProtectedRoute] Loading:', loading, 'Session:', session ? 'exists' : 'none');

      if (loading) return; // Wait for session to be loaded

      if (!session) {
        // Not authenticated
        console.log('[ProtectedRoute] No session, redirecting to home');
        navigate("/");
        toast({
          title: "Access Denied",
          description: "You must be logged in to access the dashboard.",
          variant: "destructive",
        });
        return;
      }

      // If we have a session, proceed with checks
      console.log('[ProtectedRoute] Session found, checking profile...');
      setIsProfileLoading(true);

      // Set a timeout to prevent hanging forever
      timeoutId = setTimeout(() => {
        console.error('Profile loading timeout - forcing completion');
        setIsProfileLoading(false);
        setIsMembershipChecked(true);
      }, 5000); // 5 second timeout

      try {
        // Fetch user profile
        console.log('[ProtectedRoute] Fetching profile from database...');

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("membership_expiry_date, is_admin, role")
          .eq("id", session.user.id)
          .single();

        console.log('[ProtectedRoute] Profile fetch result:', { profile, profileError });

        if (profileError) {
          console.error("[ProtectedRoute] Error fetching profile for membership check:", profileError);
          setHasActiveMembership(false);
          setUserRole({ isAdmin: false, isTrainer: false });
        } else {
          console.log('[ProtectedRoute] Profile found, checking role...');
          // Check if user is a trainer
          const { data: trainerData } = await supabase
            .from("instructors")
            .select("id, is_personal_trainer")
            .eq("user_id", session.user.id)
            .eq("is_personal_trainer", true)
            .maybeSingle();

          const isTrainer = !!trainerData;
          const isAdmin = profile?.role === 'admin'; // Using the safer role check

          console.log('[ProtectedRoute] Role check:', { isTrainer, isAdmin });
          setUserRole({ isAdmin, isTrainer });

          // Admins and trainers don't need active membership to access their dashboards
          if (isAdmin || isTrainer) {
            setHasActiveMembership(true);
            console.log('[ProtectedRoute] Admin/Trainer access granted');
          } else {
            const expiryDate = profile?.membership_expiry_date ? new Date(profile.membership_expiry_date) : null;
            const hasAccess = expiryDate && expiryDate > new Date();
            setHasActiveMembership(!!hasAccess);
            console.log('[ProtectedRoute] Membership check:', { expiryDate, hasAccess });
          }
        }
      } catch (error) {
        console.error('[ProtectedRoute] Unexpected error in checkMembershipAndRole:', error);
        setHasActiveMembership(false);
        setUserRole({ isAdmin: false, isTrainer: false });
      } finally {
        clearTimeout(timeoutId);
        setIsProfileLoading(false);
        setIsMembershipChecked(true); // Mark as checked
        console.log('[ProtectedRoute] Check complete');
      }
    };

    checkMembershipAndRole();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [session, loading, navigate, toast]);

  // Effect 2: Handle role-based redirection
  useEffect(() => {
    if (isMembershipChecked && !isProfileLoading && userRole) {
      const currentPath = location.pathname;

      // Admin auto-redirect to /admin from /dashboard or /trainer-dashboard
      if (userRole.isAdmin && (currentPath === "/dashboard" || currentPath === "/trainer-dashboard")) {
        navigate("/admin");
        return;
      }

      // Trainer auto-redirect to /trainer-dashboard from /dashboard (if not admin)
      if (userRole.isTrainer && !userRole.isAdmin && currentPath === "/dashboard") {
        navigate("/trainer-dashboard");
        return;
      }

      // Check membership for non-admin, non-trainer users trying to access dashboard
      if (!userRole.isAdmin && !userRole.isTrainer && !hasActiveMembership && currentPath === "/dashboard") {
        navigate("/");
        toast({
          title: "Access Denied",
          description: "An active membership is required to access the dashboard.",
          variant: "destructive",
        });
      }
    }
  }, [isMembershipChecked, hasActiveMembership, isProfileLoading, userRole, location.pathname, navigate, toast]);

  if (loading || isProfileLoading || !isMembershipChecked) {
    return <div className="min-h-screen flex items-center justify-center bg-background text-foreground">Loading user permissions...</div>;
  }

  return session && (hasActiveMembership || userRole?.isAdmin || userRole?.isTrainer) ? children : null;
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
        <Route path="/update-password" element={<UpdatePasswordPage />} />
        <Route path="/activate-membership" element={<ActivateMembership />} />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/workout-plan"
          element={
            <ProtectedRoute>
              <WorkoutPlanPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/trainer-dashboard"
          element={
            <ProtectedRoute>
              <TrainerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/trainer-dashboard/client/:assignmentId"
          element={
            <ProtectedRoute>
              <ClientDetailView />
            </ProtectedRoute>
          }
        />

        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Admin Routes (no Layout wrapper - AdminLayout is self-contained) */}
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/admin/members" element={<Members />} />
      <Route path="/admin/classes" element={<Classes />} />
      <Route path="/admin/schedule" element={<Schedule />} />
      <Route path="/admin/bookings" element={<Bookings />} />
      <Route path="/admin/inquiries" element={<Inquiries />} />
      <Route path="/admin/memberships" element={<Memberships />} />
      <Route path="/admin/instructors" element={<Instructors />} />
      <Route path="/admin/analytics" element={<Analytics />} />
      <Route path="/admin/settings" element={<Settings />} />
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
