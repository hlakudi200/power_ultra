import { useState } from "react";
import { useSession } from "@/context/SessionProvider";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, CheckCircle, XCircle, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ActivateMembership() {
  const { session } = useSession();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [activationCode, setActivationCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activationResult, setActivationResult] = useState<{
    success: boolean;
    message: string;
    membership_name?: string;
    new_expiry_date?: string;
  } | null>(null);

  const formatCodeInput = (value: string) => {
    // Remove all non-alphanumeric characters
    const cleaned = value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();

    // Format as PUGS-XXXX-XXXX-XXXX
    const parts = [];
    if (cleaned.length > 0) parts.push(cleaned.substring(0, 4));
    if (cleaned.length > 4) parts.push(cleaned.substring(4, 8));
    if (cleaned.length > 8) parts.push(cleaned.substring(8, 12));
    if (cleaned.length > 12) parts.push(cleaned.substring(12, 16));

    return parts.join("-");
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCodeInput(e.target.value);
    setActivationCode(formatted);
  };

  const handleActivate = async () => {
    if (!session) {
      toast({
        title: "Authentication Required",
        description: "Please log in to activate your membership.",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    if (!activationCode || activationCode.length < 19) {
      toast({
        title: "Invalid Code",
        description: "Please enter a complete activation code.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setActivationResult(null);

    try {
      const { data, error } = await supabase.rpc("redeem_activation_code", {
        p_code: activationCode,
      });

      if (error) {
        console.error("Error redeeming code:", error);
        throw error;
      }

      // Check the result
      if (data && data.length > 0) {
        const result = data[0];
        setActivationResult(result);

        if (result.success) {
          toast({
            title: "Membership Activated!",
            description: result.message,
          });

          // Redirect to dashboard after 3 seconds
          setTimeout(() => {
            navigate("/dashboard");
          }, 3000);
        } else {
          toast({
            title: "Activation Failed",
            description: result.message,
            variant: "destructive",
          });
        }
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (error: any) {
      console.error("Error activating membership:", error);
      toast({
        title: "Activation Failed",
        description: error.message || "Failed to activate membership. Please try again.",
        variant: "destructive",
      });
      setActivationResult({
        success: false,
        message: error.message || "An error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isLoading) {
      handleActivate();
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Activate Your Membership</CardTitle>
          <CardDescription>
            Enter the activation code you received to activate your gym membership
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Activation Code Input */}
          <div className="space-y-2">
            <Label htmlFor="activation-code">Activation Code</Label>
            <Input
              id="activation-code"
              type="text"
              placeholder="PUGS-XXXX-XXXX-XXXX"
              value={activationCode}
              onChange={handleCodeChange}
              onKeyPress={handleKeyPress}
              maxLength={19}
              disabled={isLoading || (activationResult?.success ?? false)}
              className="text-center font-mono text-lg tracking-wider"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground text-center">
              Format: PUGS-XXXX-XXXX-XXXX
            </p>
          </div>

          {/* Activation Result */}
          {activationResult && (
            <div
              className={`p-4 rounded-lg border ${
                activationResult.success
                  ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                  : "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
              }`}
            >
              <div className="flex items-start gap-3">
                {activationResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p
                    className={`font-medium ${
                      activationResult.success
                        ? "text-green-900 dark:text-green-100"
                        : "text-red-900 dark:text-red-100"
                    }`}
                  >
                    {activationResult.success ? "Success!" : "Failed"}
                  </p>
                  <p
                    className={`text-sm mt-1 ${
                      activationResult.success
                        ? "text-green-700 dark:text-green-200"
                        : "text-red-700 dark:text-red-200"
                    }`}
                  >
                    {activationResult.message}
                  </p>
                  {activationResult.success && activationResult.membership_name && (
                    <div className="mt-3 space-y-1">
                      <p className="text-sm font-medium text-green-900 dark:text-green-100">
                        Membership: {activationResult.membership_name}
                      </p>
                      {activationResult.new_expiry_date && (
                        <p className="text-sm text-green-700 dark:text-green-200">
                          Valid until:{" "}
                          {new Date(activationResult.new_expiry_date).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            }
                          )}
                        </p>
                      )}
                    </div>
                  )}
                  {activationResult.success && (
                    <p className="text-xs text-green-600 dark:text-green-300 mt-3">
                      Redirecting to dashboard in 3 seconds...
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Activate Button */}
          <Button
            onClick={handleActivate}
            disabled={isLoading || !activationCode || (activationResult?.success ?? false)}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Activating...
              </>
            ) : activationResult?.success ? (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Activated
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Activate Membership
              </>
            )}
          </Button>

          {/* Help Text */}
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground text-center">
              Don't have an activation code?
            </p>
            <p className="text-sm text-center mt-1">
              <Button
                variant="link"
                className="p-0 h-auto font-normal text-primary"
                onClick={() => navigate("/memberships")}
              >
                View membership plans
              </Button>
              {" or "}
              <Button
                variant="link"
                className="p-0 h-auto font-normal text-primary"
                onClick={() => navigate("/contact")}
              >
                contact us
              </Button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
