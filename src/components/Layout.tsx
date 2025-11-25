import { Outlet } from "react-router-dom";
import Navigation from "./Navigation";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

const Layout = () => {
  return (
    <>
      <Navigation />
      <main>
        <Outlet /> {/* This is where the child routes will be rendered */}
      </main>
      <TooltipProvider>
        <Toaster />
        <Sonner />
      </TooltipProvider>
    </>
  );
};

export default Layout;
