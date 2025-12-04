import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useSession } from "@/context/SessionProvider";

const UpdatePasswordPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { session, loading: sessionLoading } = useSession();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    let mounted = true;

    const handleRecoveryToken = async () => {
      console.log('[UpdatePassword] Component mounted');
      console.log('[UpdatePassword] URL hash:', window.location.hash);

      // Extract tokens from URL hash
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const type = hashParams.get('type');
      const accessToken = hashParams.get('access_token');

      console.log('[UpdatePassword] Hash params:', { type, hasAccessToken: !!accessToken });

      // If no recovery token in URL, rely on existing session
      if (type !== 'recovery' || !accessToken) {
        console.log('[UpdatePassword] No recovery token, checking existing session...');

        if (sessionLoading) {
          console.log('[UpdatePassword] Waiting for SessionProvider...');
          return;
        }

        if (mounted) {
          setIsCheckingSession(false);
        }
        return;
      }

      // We have a recovery token - manually verify it
      console.log('[UpdatePassword] Recovery token found, verifying with Supabase...');

      try {
        // Use the access_token to set the session
        const { data: { session: recoverySession }, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: hashParams.get('refresh_token') || '',
        });

        if (error) {
          console.error('[UpdatePassword] Error setting session:', error);
          if (mounted) {
            setIsCheckingSession(false);
          }
          return;
        }

        if (recoverySession) {
          console.log('[UpdatePassword] Recovery session established successfully');
          if (mounted) {
            setIsCheckingSession(false);
          }
        } else {
          console.error('[UpdatePassword] No session returned from setSession');
          if (mounted) {
            setIsCheckingSession(false);
          }
        }
      } catch (error) {
        console.error('[UpdatePassword] Exception verifying recovery token:', error);
        if (mounted) {
          setIsCheckingSession(false);
        }
      }
    };

    handleRecoveryToken();

    return () => {
      mounted = false;
    };
  }, [sessionLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
        setError("Password must be at least 6 characters long.");
        return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      toast({
        title: "Password Updated",
        description: "Your password has been successfully updated. Please sign in.",
      });
      await supabase.auth.signOut();
      navigate("/");
    } catch (error: any) {
      setError(error.message);
      toast({
        title: "Error Updating Password",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Show loading while checking session
  if (sessionLoading || isCheckingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Verifying reset link...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error if no valid session after checking
  if (!session) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-background">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Invalid or Expired Link</CardTitle>
                    <CardDescription>
                        The password reset link is either invalid or has expired. Please request a new one.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={() => navigate("/")} className="w-full">Go to Homepage</Button>
                </CardContent>
            </Card>
        </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Update Your Password</CardTitle>
          <CardDescription>
            Enter and confirm your new password below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default UpdatePasswordPage;
