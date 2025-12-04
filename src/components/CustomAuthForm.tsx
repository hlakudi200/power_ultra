import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Eye, EyeOff, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getAuthErrorMessage } from "@/lib/authErrors";

const PasswordStrengthIndicator = ({ password }: { password: string }) => {
  const getStrength = () => {
    let score = 0;
    if (!password) return 0;
    if (password.length >= 8) score++;
    if (/\d/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  };

  const strength = getStrength();
  const strengthText = ["", "Very Weak", "Weak", "Fair", "Good", "Strong"][strength];
  const color = ["", "bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-green-400", "bg-green-500"][strength];

  if (!password) return null;

  return (
    <div className="space-y-2">
        <div className="flex justify-between items-center">
            <Label className="text-xs">Password Strength</Label>
            <span className="text-xs font-bold">{strengthText}</span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
            <div className={`h-2 rounded-full transition-all duration-300 ${color}`} style={{ width: `${(strength / 5) * 100}%` }}></div>
        </div>
    </div>
  );
};

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 48 48"
    width="24px"
    height="24px"
    {...props}
  >
    <path
      fill="#FFC107"
      d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
    />
    <path
      fill="#FF3D00"
      d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
    />
    <path
      fill="#4CAF50"
      d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.223,0-9.657-3.356-11.303-8H6.306C9.656,39.663,16.318,44,24,44z"
    />
    <path
      fill="#1976D2"
      d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C42.02,35.622,44,30.138,44,24C44,22.659,43.862,21.35,43.611,20.083z"
    />
  </svg>
);

export function CustomAuthForm() {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [view, setView] = useState<'signin' | 'signup' | 'forgot_password'>('signin');

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin,
            },
        });
        if (error) throw error;
    } catch (error: any) {
        setError(getAuthErrorMessage(error));
    } finally {
        setLoading(false);
    }
  };
  
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (error: any) {
      setError(getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
        setError("Password must be at least 8 characters long.");
        return;
    }
    setError(null);
    setLoading(true);
    try {
      // Check if user already exists before attempting signup
      const { data: existingUsers, error: checkError } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', email)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 is "no rows returned" which is fine
        throw checkError;
      }

      if (existingUsers) {
        setError("This email is already registered. Please sign in instead.");
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      toast({
        title: "Check your email!",
        description: "We've sent a verification link to your email address.",
      });
      setEmail('');
      setPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      setError(getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      });
      if (error) throw error;
      toast({
        title: "Check your email",
        description: "A password reset link has been sent to your email address.",
      });
      setView('signin');
    } catch (error: any) {
      setError(getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  if (view === 'forgot_password') {
    return (
        <form onSubmit={handlePasswordReset} className="space-y-4 pt-4">
            <h3 className="font-semibold">Forgot Password</h3>
            <p className="text-sm text-muted-foreground">Enter your email to receive a password reset link.</p>
            {error && (
                <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>
            )}
            <div className="space-y-2">
                <Label htmlFor="email-forgot">Email</Label>
                <Input id="email-forgot" type="email" placeholder="m@example.com" required value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Reset Link
            </Button>
            <Button variant="link" size="sm" className="p-0" onClick={() => { setView('signin'); setError(null); }}>
                Back to Sign In
            </Button>
        </form>
    )
  }

  return (
    <Tabs defaultValue={view} onValueChange={(v) => setView(v as any)} className="w-full">
        <div className="space-y-2 py-4">
            <Button variant="outline" className="w-full flex items-center gap-2" onClick={handleGoogleSignIn} disabled={loading}>
                <GoogleIcon />
                Sign In with Google
            </Button>
        </div>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="signin">Sign In</TabsTrigger>
        <TabsTrigger value="signup">Sign Up</TabsTrigger>
      </TabsList>
      
      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Sign In Tab */}
      <TabsContent value="signin">
        <form onSubmit={handleSignIn} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="email-signin">Email</Label>
            <Input id="email-signin" type="email" placeholder="m@example.com" required value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2 relative">
            <Label htmlFor="password-signin">Password</Label>
            <Input id="password-signin" type={showPassword ? "text" : "password"} required value={password} onChange={e => setPassword(e.target.value)} />
            <Button type="button" variant="ghost" size="icon" className="absolute bottom-1 right-1 h-7 w-7" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          <div className="flex justify-end">
            <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => { setView('forgot_password'); setError(null); }}>
              Forgot Password?
            </Button>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign In
          </Button>
        </form>
      </TabsContent>

      {/* Sign Up Tab */}
      <TabsContent value="signup">
        <form onSubmit={handleSignUp} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="email-signup">Email</Label>
            <Input id="email-signup" type="email" placeholder="m@example.com" required value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2 relative">
            <Label htmlFor="password-signup">Password</Label>
            <Input id="password-signup" type={showPassword ? "text" : "password"} required value={password} onChange={e => setPassword(e.target.value)} />
             <Button type="button" variant="ghost" size="icon" className="absolute bottom-1 right-1 h-7 w-7" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          {password && <PasswordStrengthIndicator password={password} />}
          <div className="space-y-2">
            <Label htmlFor="confirm-password-signup">Confirm Password</Label>
            <Input id="confirm-password-signup" type={showPassword ? "text" : "password"} required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign Up
          </Button>
        </form>
      </TabsContent>
    </Tabs>
  );
}