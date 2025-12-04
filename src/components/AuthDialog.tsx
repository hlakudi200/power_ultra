import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSession } from "@/context/SessionProvider";
import { useToast } from "@/hooks/use-toast";
import { CustomAuthForm } from "./CustomAuthForm";
import { Dumbbell } from "lucide-react";

interface AuthDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function AuthDialog({ isOpen, onOpenChange }: AuthDialogProps) {
  const { session } = useSession();
  const { toast } = useToast();
  
  useEffect(() => {
    if (session && isOpen) {
      toast({
        title: "Login Successful",
        description: "Welcome to Power Ultra Gym!",
      });

      // Close dialog after a brief moment
      setTimeout(() => {
        onOpenChange(false);
      }, 1000);
    }
  }, [session, isOpen, onOpenChange, toast]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gym-darker text-white border-border">
        <DialogHeader>
            <div className="flex items-center justify-center gap-2 text-2xl font-black tracking-tight group mb-4">
              <Dumbbell className="w-8 h-8 text-primary" />
              <span className="text-foreground">
                POWER <span className="text-primary">ULTRA</span>
              </span>
            </div>
          <DialogTitle className="text-2xl font-black text-center">Member Access</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <CustomAuthForm />
          {/* TODO: Add back Google provider button */}
        </div>
      </DialogContent>
    </Dialog>
  );
}
