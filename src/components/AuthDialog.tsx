// src/components/AuthDialog.tsx
import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Auth } from "@supabase/auth-ui-react";
import { useSession } from "@/context/SessionProvider";

interface AuthDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function AuthDialog({ isOpen, onOpenChange }: AuthDialogProps) {
  const { session } = useSession();

  useEffect(() => {
    if (session && isOpen) {
      // Automatically close the auth dialog if user logs in while it's open
      onOpenChange(false);
    }
  }, [session, isOpen, onOpenChange]);

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
        <div className="py-4">
          <Auth
            supabaseClient={supabase}
            appearance={{ theme: customTheme }}
            providers={['google']}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
