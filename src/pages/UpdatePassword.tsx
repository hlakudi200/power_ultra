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

      // WAIT for SessionProvider to finish loading first
      // This is critical because detectSessionInUrl might be processing the URL
      if (sessionLoading) {
        console.log('[UpdatePassword] Waiting for SessionProvider to finish...');
        return;
      }

      console.log('[UpdatePassword] SessionProvider finished. Session:', session ? 'exists' : 'none');

      // If SessionProvider already established a session, we're done!
      if (session) {
        console.log('[UpdatePassword] Session already established by SessionProvider ✅');
        if (mounted) {
          setIsCheckingSession(false);
        }
        return;
      }

      // No recovery token in URL and no session
      if (type !== 'recovery' || !accessToken) {
        console.log('[UpdatePassword] No recovery token and no session - invalid link');
        if (mounted) {
          setIsCheckingSession(false);
        }
        return;
      }

      // SessionProvider didn't establish session, but we have a recovery token
      // This means detectSessionInUrl failed, so we manually set the session
      console.log('[UpdatePassword] Manually setting session with recovery token...');

      try {
        // Add timeout to prevent hanging
        const setSessionPromise = supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: hashParams.get('refresh_token') || '',
        });

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('setSession timeout')), 5000)
        );

        const result = await Promise.race([setSessionPromise, timeoutPromise]) as any;

        if (result instanceof Error) {
          console.error('[UpdatePassword] setSession timed out after 5s');
          // Show the form anyway - user might still be able to update password
          if (mounted) {
            setIsCheckingSession(false);
          }
          return;
        }

        const { data: { session: recoverySession }, error } = result;

        if (error) {
          console.error('[UpdatePassword] Error setting session:', error);
          if (mounted) {
            setIsCheckingSession(false);
          }
          return;
        }

        if (recoverySession) {
          console.log('[UpdatePassword] Recovery session established successfully ✅');
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
        console.error('[UpdatePassword] Exception setting session:', error);
        if (mounted) {
          setIsCheckingSession(false);
        }
      }
    };

    handleRecoveryToken();

    return () => {
      mounted = false;
    };
  }, [session, sessionLoading]);

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
