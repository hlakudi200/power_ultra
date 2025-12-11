import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, CheckCircle, Copy, Ticket } from "lucide-react";

interface Membership {
  id: string;
  name: string;
  price: number;
  duration_months: number;
}

interface GenerateActivationCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
  memberName: string;
  memberEmail: string;
  onSuccess: () => void;
}

export const GenerateActivationCodeDialog = ({
  open,
  onOpenChange,
  memberId,
  memberName,
  memberEmail,
  onSuccess,
}: GenerateActivationCodeDialogProps) => {
  const { toast } = useToast();
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMemberships, setLoadingMemberships] = useState(true);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  const [selectedMembershipId, setSelectedMembershipId] = useState<string>("");
  const [customDuration, setCustomDuration] = useState<string>("");
  const [expiresInDays, setExpiresInDays] = useState<string>("30");
  const [notes, setNotes] = useState("");
  const [externalReference, setExternalReference] = useState("");

  useEffect(() => {
    if (open) {
      fetchMemberships();
      resetForm();
    }
  }, [open]);

  const fetchMemberships = async () => {
    setLoadingMemberships(true);
    const { data, error } = await supabase
      .from("memberships")
      .select("id, name, price, duration_months")
      .eq("is_active", true)
      .order("price", { ascending: true });

    if (error) {
      console.error("Error fetching memberships:", error);
      toast({
        title: "Error",
        description: "Failed to load membership plans",
        variant: "destructive",
      });
    } else {
      setMemberships(data || []);
    }
    setLoadingMemberships(false);
  };

  const resetForm = () => {
    setSelectedMembershipId("");
    setCustomDuration("");
    setExpiresInDays("30");
    setNotes("");
    setExternalReference("");
    setGeneratedCode(null);
  };

  const handleGenerate = async () => {
    if (!selectedMembershipId) {
      toast({
        title: "Validation Error",
        description: "Please select a membership plan",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Call the generate_activation_code function
      const { data, error } = await supabase.rpc("generate_activation_code", {
        p_membership_id: selectedMembershipId,
        p_duration_months: customDuration ? parseInt(customDuration) : null,
        p_expires_in_days: parseInt(expiresInDays),
        p_notes: notes || null,
        p_external_reference: externalReference || null,
      });

      if (error) {
        console.error("Error generating code:", error);
        throw error;
      }

      // Check the result
      if (data && data.length > 0 && data[0].success) {
        const code = data[0].code;
        setGeneratedCode(code);
        toast({
          title: "Code Generated!",
          description: `Activation code created for ${memberName}`,
        });
        onSuccess();
      } else {
        throw new Error(data[0]?.message || "Failed to generate code");
      }
    } catch (error: any) {
      console.error("Error generating code:", error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate activation code",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode);
      toast({
        title: "Copied!",
        description: "Activation code copied to clipboard",
      });
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset after a delay to avoid flash
    setTimeout(resetForm, 300);
  };

  const selectedMembership = memberships.find(
    (m) => m.id === selectedMembershipId
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-primary" />
            Generate Activation Code
          </DialogTitle>
          <DialogDescription>
            Create an activation code for <strong>{memberName}</strong> ({memberEmail})
          </DialogDescription>
        </DialogHeader>

        {!generatedCode ? (
          <>
            <div className="space-y-4 py-4">
              {/* Membership Plan Selection */}
              <div className="space-y-2">
                <Label htmlFor="membership">Membership Plan *</Label>
                {loadingMemberships ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading plans...
                  </div>
                ) : (
                  <Select
                    value={selectedMembershipId}
                    onValueChange={setSelectedMembershipId}
                  >
                    <SelectTrigger id="membership">
                      <SelectValue placeholder="Select a membership plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {memberships.map((membership) => (
                        <SelectItem
                          key={membership.id}
                          value={membership.id}
                        >
                          {membership.name} - R{membership.price} ({membership.duration_months}{" "}
                          {membership.duration_months === 1 ? "month" : "months"})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Selected Plan Details */}
              {selectedMembership && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-foreground">
                        {selectedMembership.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Duration: {customDuration || selectedMembership.duration_months}{" "}
                        months
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Price: R{selectedMembership.price}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Custom Duration */}
              <div className="space-y-2">
                <Label htmlFor="duration">
                  Custom Duration (months){" "}
                  <span className="text-xs text-muted-foreground">Optional</span>
                </Label>
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  placeholder={
                    selectedMembership
                      ? `Default: ${selectedMembership.duration_months} months`
                      : "e.g., 3"
                  }
                  value={customDuration}
                  onChange={(e) => setCustomDuration(e.target.value)}
                />
              </div>

              {/* Code Expiry */}
              <div className="space-y-2">
                <Label htmlFor="expiry">
                  Code Expires In (days) *
                </Label>
                <Input
                  id="expiry"
                  type="number"
                  min="1"
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Code can be redeemed within this period
                </p>
              </div>

              {/* External Reference */}
              <div className="space-y-2">
                <Label htmlFor="reference">
                  Payment Reference{" "}
                  <span className="text-xs text-muted-foreground">Optional</span>
                </Label>
                <Input
                  id="reference"
                  placeholder="e.g., INV-12345, Bank Transfer #789"
                  value={externalReference}
                  onChange={(e) => setExternalReference(e.target.value)}
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">
                  Notes <span className="text-xs text-muted-foreground">Optional</span>
                </Label>
                <Textarea
                  id="notes"
                  placeholder="e.g., Payment received via bank transfer"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button onClick={handleGenerate} disabled={loading || !selectedMembershipId}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Ticket className="mr-2 h-4 w-4" />
                    Generate Code
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            {/* Success State - Show Generated Code */}
            <div className="space-y-6 py-6">
              <div className="flex items-center justify-center">
                <div className="bg-green-500/10 p-4 rounded-full">
                  <CheckCircle className="h-16 w-16 text-green-500" />
                </div>
              </div>

              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold">Code Generated Successfully!</h3>
                <p className="text-sm text-muted-foreground">
                  Share this code with {memberName}
                </p>
              </div>

              <div className="bg-muted p-6 rounded-lg space-y-4">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-2">ACTIVATION CODE</p>
                  <p className="text-3xl font-mono font-bold tracking-wider text-primary">
                    {generatedCode}
                  </p>
                </div>

                <Button
                  onClick={handleCopyCode}
                  variant="outline"
                  className="w-full"
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Code
                </Button>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-sm">
                <p className="font-semibold text-blue-600 mb-2">Next Steps:</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Copy the code above</li>
                  <li>Send it to {memberName} via email, SMS, or WhatsApp</li>
                  <li>User can redeem at: /activate-membership</li>
                  <li>Code expires in {expiresInDays} days</li>
                </ol>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={handleClose} className="w-full">
                Done
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
