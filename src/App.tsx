import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import SetupProfile from "./pages/SetupProfile";

import { SessionProvider, useSession } from "./context/SessionProvider";

const queryClient = new QueryClient();

// This component handles the redirection logic for new users
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
      <Route path="/" element={<Index />} />
      <Route path="/setup-profile" element={<SetupProfile />} />
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};


const App = () => (
  <QueryClientProvider client={queryClient}>
    <SessionProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </SessionProvider>
  </QueryClientProvider>
);

export default App;
