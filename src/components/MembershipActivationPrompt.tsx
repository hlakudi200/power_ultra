import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, ShoppingBag, AlertCircle } from "lucide-react";

interface MembershipActivationPromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName?: string;
}

export const MembershipActivationPrompt = ({
  open,
  onOpenChange,
  userName = "Member",
}: MembershipActivationPromptProps) => {
  const navigate = useNavigate();

  const handleActivateCode = () => {
    navigate("/activate-membership");
    onOpenChange(false);
  };

  const handleViewPlans = () => {
    navigate("/memberships");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="bg-yellow-500/10 p-4 rounded-full">
              <AlertCircle className="h-12 w-12 text-yellow-500" />
            </div>
          </div>
          <DialogTitle className="text-center text-2xl">
            Welcome, {userName}!
          </DialogTitle>
          <DialogDescription className="text-center text-base pt-2">
            To access classes and book sessions, you need an active membership.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-6">
          {/* Option 1: Have Activation Code */}
          <div className="border border-primary/20 rounded-lg p-6 bg-primary/5">
            <div className="flex items-start gap-4">
              <div className="bg-primary/10 p-3 rounded-lg">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">
                  I Have an Activation Code
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  If you've already paid and received an activation code from our team,
                  enter it here to activate your membership instantly.
                </p>
                <Button
                  onClick={handleActivateCode}
                  className="w-full bg-gradient-primary text-primary-foreground hover:shadow-glow font-bold"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Enter Activation Code
                </Button>
              </div>
            </div>
          </div>

          {/* Option 2: View Membership Plans */}
          <div className="border border-border rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="bg-muted p-3 rounded-lg">
                <ShoppingBag className="h-6 w-6 text-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">
                  View Membership Plans
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Browse our membership options and send an inquiry to get started.
                  Our team will contact you with payment details.
                </p>
                <Button
                  onClick={handleViewPlans}
                  variant="outline"
                  className="w-full border-primary text-primary hover:bg-primary/10"
                >
                  <ShoppingBag className="mr-2 h-4 w-4" />
                  Browse Membership Plans
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <p className="text-xs text-center text-muted-foreground">
            Need help? Contact us at{" "}
            <a href="mailto:info@powerultragym.com" className="text-primary hover:underline">
              info@powerultragym.com
            </a>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
