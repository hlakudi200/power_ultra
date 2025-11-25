import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/context/SessionProvider";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";

interface MembershipInquiryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  plan: string;
}

export const MembershipInquiryDialog = ({
  isOpen,
  onClose,
  plan,
}: MembershipInquiryDialogProps) => {
  const { session } = useSession();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (session?.user) {
      setName(session.user.user_metadata?.full_name || "");
      setEmail(session.user.email || "");
      setPhone(session.user.user_metadata?.phone || "");
    } else {
      // Clear fields when user logs out or session is not available
      setName("");
      setEmail("");
      setPhone("");
    }
  }, [session, isOpen]);

  const handleSubmit = async () => {
    if (!name || !email) {
      toast({
        title: "Missing Information",
        description: "Please enter your name and email.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    const { error: insertError } = await supabase.from("membership_inquiries").insert({
      name,
      email,
      phone,
      plan,
      user_id: session?.user?.id || null,
    });

    if (insertError) {
      setIsLoading(false);
      toast({
        title: "Submission Failed",
        description:
          "Could not save your inquiry. Please try again. " + insertError.message,
        variant: "destructive",
      });
      return;
    }

    // Inquiry was saved, now try to send the email but don't block the UI
    try {
      const { error: invokeError } = await supabase.functions.invoke("send-inquiry-email", {
        body: { name, email },
      });
      if (invokeError) {
        // Log the error but don't show a failure toast to the user,
        // as their main action (the inquiry) was successful.
        console.error("Failed to send confirmation email:", invokeError);
      }
    } catch (e) {
      console.error("Unexpected error invoking email function:", e);
    }
    
    setIsLoading(false);
    toast({
      title: "Inquiry Sent!",
      description: "Thank you! We will get in touch with you shortly.",
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Membership Inquiry: {plan}</DialogTitle>
          <DialogDescription>
            Please provide your details below. Our team will contact you shortly to
            finalize your membership.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
              placeholder="Your full name"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="col-span-3"
              placeholder="your@email.com"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="phone" className="text-right">
              Phone
            </Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="col-span-3"
              placeholder="Optional: Your phone number"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "Submitting..." : "Submit Inquiry"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
