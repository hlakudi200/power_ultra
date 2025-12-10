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
import { Loader2, Check, Zap } from "lucide-react";

interface Membership {
  id: string;
  name: string;
  price: number;
  duration_months: number;
}

interface QuickActivateMembershipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
  memberName: string;
  onSuccess: () => void;
}

export const QuickActivateMembershipDialog = ({
  open,
  onOpenChange,
  memberId,
  memberName,
  onSuccess,
}: QuickActivateMembershipDialogProps) => {
  const { toast } = useToast();
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMemberships, setLoadingMemberships] = useState(true);

  const [selectedMembershipId, setSelectedMembershipId] = useState<string>("");
  const [customDuration, setCustomDuration] = useState<string>("");
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
    setNotes("");
    setExternalReference("");
  };

  const handleActivate = async () => {
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
      // Call the admin_activate_membership function
      const { data, error } = await supabase.rpc("admin_activate_membership", {
        p_user_id: memberId,
        p_membership_id: selectedMembershipId,
        p_duration_months: customDuration ? parseInt(customDuration) : null,
        p_notes: notes || null,
        p_external_reference: externalReference || null,
      });

      if (error) {
        console.error("Error activating membership:", error);
        throw error;
      }

      // Check the result
      if (data && data.length > 0 && data[0].success) {
        toast({
          title: "Membership Activated!",
          description: data[0].message,
        });
        onSuccess();
        onOpenChange(false);
      } else {
        throw new Error(data[0]?.message || "Failed to activate membership");
      }
    } catch (error: any) {
      console.error("Error activating membership:", error);
      toast({
        title: "Activation Failed",
        description: error.message || "Failed to activate membership",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedMembership = memberships.find(
    (m) => m.id === selectedMembershipId
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Quick Activate Membership
          </DialogTitle>
          <DialogDescription>
            Activate membership for <strong>{memberName}</strong> after receiving
            external payment
          </DialogDescription>
        </DialogHeader>

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
                      value={membership.id.toString()}
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
                <Check className="h-5 w-5 text-primary mt-0.5" />
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

          {/* Custom Duration (Optional) */}
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
            <p className="text-xs text-muted-foreground">
              Override the default plan duration if needed
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
            <p className="text-xs text-muted-foreground">
              External payment system reference or receipt number
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">
              Notes <span className="text-xs text-muted-foreground">Optional</span>
            </Label>
            <Textarea
              id="notes"
              placeholder="e.g., Paid via bank transfer on 2024-12-10"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Additional notes about this activation (for audit trail)
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleActivate} disabled={loading || !selectedMembershipId}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Activating...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" />
                Activate Membership
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
