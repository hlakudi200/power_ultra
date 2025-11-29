// src/components/AuthDialog.tsx
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Auth } from "@supabase/auth-ui-react";
import { useSession } from "@/context/SessionProvider";
import { useToast } from "@/hooks/use-toast";
import { getAuthErrorMessage } from "@/lib/authErrors";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";

interface AuthDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function AuthDialog({ isOpen, onOpenChange }: AuthDialogProps) {
  const { session } = useSession();
  const { toast } = useToast();
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (session && isOpen) {
      // Show success message
      setAuthSuccess("Successfully signed in!");
      toast({
        title: "Login Successful",
        description: "Welcome to Power Ultra Gym!",
      });

      // Close dialog after a brief moment
      setTimeout(() => {
        onOpenChange(false);
        setAuthSuccess(null);
      }, 1000);
    }
  }, [session, isOpen, onOpenChange, toast]);

  // Listen for auth errors
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        setAuthError(null);
        setAuthSuccess("Successfully signed in!");
      } else if (event === 'SIGNED_OUT') {
        setAuthError(null);
        setAuthSuccess(null);
      } else if (event === 'USER_UPDATED') {
        setAuthError(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Handle auth errors from Supabase Auth UI
  useEffect(() => {
    const handleAuthError = async () => {
      const { data: { session: currentSession }, error } = await supabase.auth.getSession();

      if (error) {
        const errorMessage = getAuthErrorMessage(error);
        setAuthError(errorMessage);
        toast({
          variant: "destructive",
          title: "Authentication Error",
          description: errorMessage,
        });
      }
    };

    if (isOpen) {
      handleAuthError();
    }
  }, [isOpen, toast]);

  // Matching the HSL values from the CSS variables in index.css
  const customTheme = {
    default: {
      colors: {
        brand: 'hsl(0, 85%, 55%)',
        brandAccent: 'hsl(0, 75%, 65%)',
        brandButtonText: 'white',
        defaultButtonBackground: 'hsl(0, 0%, 10%)',
        defaultButtonBackgroundHover: 'hsl(0, 0%, 15%)',
        defaultButtonBorder: 'hsl(0, 0%, 20%)',
        defaultButtonText: 'hsl(0, 0%, 98%)',
        dividerBackground: 'hsl(0, 0%, 20%)',
        inputBackground: 'hsl(0, 0%, 5%)',
        inputBorder: 'hsl(0, 0%, 20%)',
        inputBorderHover: 'hsl(0, 85%, 55%)',
        inputBorderFocus: 'hsl(0, 85%, 55%)',
        inputText: 'hsl(0, 0%, 98%)',
        inputLabelText: 'hsl(0, 0%, 65%)',
        inputPlaceholder: 'hsl(0, 0%, 35%)',
        messageText: '#ef4444', // Destructive color
        messageBackground: 'hsl(0, 84.2%, 60.2%, 0.1)',
        anchorTextColor: 'hsl(0, 0%, 65%)',
        anchorTextColorHover: 'hsl(0, 0%, 98%)',
      },
      space: {
        spaceSmall: '4px',
        spaceMedium: '8px',
        spaceLarge: '16px',
        labelBottomMargin: '8px',
        anchorBottomMargin: '4px',
        emailInputSpacing: '8px',
        socialAuthSpacing: '16px',
        buttonPadding: '12px 15px',
        inputPadding: '12px 15px',
      },
      fontSizes: {
        baseBodySize: '14px',
        baseInputSize: '14px',
        baseLabelSize: '14px',
        baseButtonSize: '14px',
      },
      fonts: {
        bodyFontFamily: `'Inter', sans-serif`,
        buttonFontFamily: `'Inter', sans-serif`,
        inputFontFamily: `'Inter', sans-serif`,
        labelFontFamily: `'Inter', sans-serif`,
      },
      borderWidths: {
        buttonBorderWidth: '1px',
        inputBorderWidth: '1px',
      },
      radii: {
        borderRadiusButton: '0.5rem',
        buttonBorderRadius: '0.5rem',
        inputBorderRadius: '0.5rem',
      },
    },
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gym-darker text-white border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black">Login or Sign Up</DialogTitle>
        </DialogHeader>

        {/* Success Alert */}
        {authSuccess && (
          <Alert className="bg-green-900/20 border-green-500 text-green-100">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>{authSuccess}</AlertDescription>
          </Alert>
        )}

        {/* Error Alert */}
        {authError && (
          <Alert className="bg-destructive/20 border-destructive text-destructive-foreground">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{authError}</AlertDescription>
          </Alert>
        )}

        <div className="py-4">
          <Auth
            supabaseClient={supabase}
            appearance={{ theme: customTheme }}
            providers={['google']}
            redirectTo={window.location.origin}
            localization={{
              variables: {
                sign_in: {
                  email_label: 'Email address',
                  password_label: 'Password',
                  button_label: 'Sign in',
                  social_provider_text: 'Sign in with {{provider}}',
                  link_text: "Already have an account? Sign in",
                },
                sign_up: {
                  email_label: 'Email address',
                  password_label: 'Create a password',
                  button_label: 'Sign up',
                  social_provider_text: 'Sign up with {{provider}}',
                  link_text: "Don't have an account? Sign up",
                },
              },
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
