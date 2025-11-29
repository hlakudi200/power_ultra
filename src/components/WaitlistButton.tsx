import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Users, X, Clock } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useSession } from "@/context/SessionProvider";
import { useToast } from "@/hooks/use-toast";
import { WaitlistDialog } from "./WaitlistDialog";

interface WaitlistButtonProps {
  scheduleId: string;
  className: string;
  classTime: string;
  dayOfWeek: string;
  isFull: boolean;
  onWaitlistChange?: () => void;
}

interface WaitlistEntry {
  id: string;
  queue_position: number;
  status: string;
  expires_at: string | null;
}

export function WaitlistButton({
  scheduleId,
  className,
  classTime,
  dayOfWeek,
  isFull,
  onWaitlistChange,
}: WaitlistButtonProps) {
  const { session } = useSession();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [waitlistEntry, setWaitlistEntry] = useState<WaitlistEntry | null>(null);
  const [waitlistCount, setWaitlistCount] = useState(0);
  const [showDialog, setShowDialog] = useState(false);
  const [hasActiveBooking, setHasActiveBooking] = useState(false);

  // Fetch user's waitlist status and total waitlist count
  useEffect(() => {
    if (session?.user?.id) {
      fetchWaitlistStatus();
    }
  }, [session?.user?.id, scheduleId]);

  const fetchWaitlistStatus = async () => {
    if (!session?.user?.id) return;

    try {
      // Check if user has an active booking for this class
      const { data: bookingData, error: bookingError } = await supabase
        .from("bookings")
        .select("id")
        .eq("schedule_id", scheduleId)
        .eq("user_id", session.user.id)
        .in("status", ["confirmed", "pending"])
        .maybeSingle();

      setHasActiveBooking(!!bookingData);

      // Get user's waitlist entry
      const { data: userEntry, error: userError } = await supabase
        .from("waitlist")
        .select("id, queue_position, status, expires_at")
        .eq("schedule_id", scheduleId)
        .eq("user_id", session.user.id)
        .in("status", ["waiting", "notified"]) // Only active entries
        .single();

      if (!userError && userEntry) {
        setWaitlistEntry(userEntry);
      } else {
        setWaitlistEntry(null);
      }

      // Get total waitlist count
      const { data: countData, error: countError } = await supabase
        .from("waitlist")
        .select("id", { count: "exact", head: true })
        .eq("schedule_id", scheduleId)
        .eq("status", "waiting");

      if (!countError && countData !== null) {
        setWaitlistCount((countData as any).count || 0);
      }
    } catch (error) {
      console.error("Error fetching waitlist status:", error);
    }
  };

  const handleJoinWaitlist = async () => {
    if (!session?.user?.id) {
      toast({
        title: "Authentication Required",
        description: "Please log in to join the waitlist.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Check if user already has an active booking for this class
      const { data: existingBooking, error: bookingCheckError } = await supabase
        .from("bookings")
        .select("id, status")
        .eq("schedule_id", scheduleId)
        .eq("user_id", session.user.id)
        .in("status", ["confirmed", "pending"])
        .maybeSingle();

      if (bookingCheckError) {
        console.error("Error checking existing booking:", bookingCheckError);
        throw new Error("Failed to verify booking status. Please try again.");
      }

      if (existingBooking) {
        toast({
          title: "Already Booked",
          description: "You already have a booking for this class. You cannot join the waitlist.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Get next position using the database function
      const { data: positionData, error: positionError } = await supabase
        .rpc("get_next_waitlist_position", { p_schedule_id: scheduleId });

      if (positionError) throw positionError;

      const nextPosition = positionData || 1;

      // Insert waitlist entry
      const { error: insertError } = await supabase
        .from("waitlist")
        .insert({
          schedule_id: scheduleId,
          user_id: session.user.id,
          queue_position: nextPosition,
          status: "waiting",
        });

      if (insertError) {
        if (insertError.code === "23505") {
          // Unique constraint violation
          throw new Error("You are already on the waitlist for this class.");
        }
        throw insertError;
      }

      // Create notification for user
      await supabase.from("notifications").insert({
        user_id: session.user.id,
        type: "waitlist_joined",
        title: "Joined Waitlist",
        message: `You're #${nextPosition} in line for ${className} on ${dayOfWeek} at ${classTime}.`,
        related_id: scheduleId,
      });

      toast({
        title: "Added to Waitlist!",
        description: `You're #${nextPosition} in line. We'll notify you when a spot opens up.`,
      });

      await fetchWaitlistStatus();
      onWaitlistChange?.();
      setShowDialog(false);
    } catch (error: any) {
      toast({
        title: "Failed to Join Waitlist",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeaveWaitlist = async () => {
    if (!waitlistEntry) return;

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from("waitlist")
        .delete()
        .eq("id", waitlistEntry.id);

      if (error) throw error;

      toast({
        title: "Removed from Waitlist",
        description: "You've been removed from the waitlist for this class.",
      });

      setWaitlistEntry(null);
      await fetchWaitlistStatus();
      onWaitlistChange?.();
    } catch (error: any) {
      toast({
        title: "Failed to Leave Waitlist",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Don't show if user already has an active booking
  if (hasActiveBooking) {
    return null;
  }

  // Don't show if class is not full and user is not on waitlist
  if (!isFull && !waitlistEntry) {
    return null;
  }

  // User is on waitlist
  if (waitlistEntry) {
    const isNotified = waitlistEntry.status === "notified";
    const expiresAt = waitlistEntry.expires_at ? new Date(waitlistEntry.expires_at) : null;
    const timeRemaining = expiresAt ? Math.max(0, expiresAt.getTime() - new Date().getTime()) : 0;
    const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));

    return (
      <div className="space-y-2">
        {isNotified ? (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
            <div className="flex items-center gap-2 text-green-400 mb-1">
              <Clock className="h-4 w-4" />
              <span className="font-semibold text-sm">Spot Available!</span>
            </div>
            <p className="text-xs text-muted-foreground">
              You have {hoursRemaining} hours to book. Book now before it expires!
            </p>
          </div>
        ) : (
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm text-foreground">
                  On Waitlist
                </span>
              </div>
              <span className="text-xs font-bold text-primary">
                #{waitlistEntry.queue_position} in line
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              We'll notify you when a spot opens up
            </p>
          </div>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={handleLeaveWaitlist}
          disabled={isLoading}
          className="w-full border-destructive text-destructive hover:bg-destructive/10"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <X className="h-4 w-4 mr-2" />
          )}
          Leave Waitlist
        </Button>
      </div>
    );
  }

  // Class is full, show join waitlist button
  return (
    <>
      <Button
        variant="outline"
        size="lg"
        onClick={() => setShowDialog(true)}
        disabled={isLoading}
        className="w-full border-primary text-primary hover:bg-primary/10"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <Users className="h-4 w-4 mr-2" />
        )}
        Join Waitlist
        {waitlistCount > 0 && (
          <span className="ml-2 text-xs bg-primary/20 px-2 py-0.5 rounded-full">
            {waitlistCount} waiting
          </span>
        )}
      </Button>

      <WaitlistDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        className={className}
        classTime={classTime}
        dayOfWeek={dayOfWeek}
        waitlistCount={waitlistCount}
        onConfirm={handleJoinWaitlist}
        isLoading={isLoading}
      />
    </>
  );
}
