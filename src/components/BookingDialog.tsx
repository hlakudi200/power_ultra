import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/context/SessionProvider";
import { supabase } from "@/lib/supabaseClient";

interface BookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className: string;
  classTime: string;
  scheduleId: string;
}

const BookingDialog = ({
  open,
  onOpenChange,
  className,
  classTime,
  scheduleId,
}: BookingDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { session } = useSession();

  const handleConfirm = async () => {
    if (!session) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to book a class.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("bookings").insert({
        schedule_id: scheduleId,
        user_id: session.user.id,
      });

      if (error) {
        // Handle potential unique constraint violation (already booked)
        if (error.code === '23505') {
          throw new Error("You have already booked this class.");
        }
        throw new Error(error.message);
      }

      toast({
        title: "Booking Confirmed!",
        description: `You've been booked for ${className} at ${classTime}.`,
      });

      // Non-blocking call to send confirmation email
      try {
        const { error: invokeError } = await supabase.functions.invoke("send-booking-confirmation", {
          body: {
            name: session.user.user_metadata?.full_name || session.user.email,
            email: session.user.email,
            className,
            classTime,
          },
        });
        if (invokeError) {
          console.error("Failed to send booking confirmation email:", invokeError);
        }
      } catch (e) {
        console.error("Unexpected error invoking email function:", e);
      }

      onOpenChange(false);
    } catch (error: any)
    {
      toast({
        title: "Booking Failed",
        description: error.message || "There was an error processing your booking. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-foreground">
            Confirm Your Booking
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            You are about to book a spot for{" "}
            <span className="text-primary font-bold">{className}</span> at{" "}
            <span className="text-primary font-bold">{classTime}</span>.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 text-center text-foreground">
          Are you sure you want to confirm this booking?
        </div>
        <DialogFooter>
          <div className="flex gap-4 w-full">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              onClick={handleConfirm}
              className="flex-1 bg-gradient-primary text-primary-foreground hover:shadow-glow font-bold"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Booking..." : "Confirm Booking"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BookingDialog;
