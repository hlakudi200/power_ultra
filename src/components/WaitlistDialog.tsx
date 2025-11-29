import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Users, Clock, Bell } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface WaitlistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className: string;
  classTime: string;
  dayOfWeek: string;
  waitlistCount: number;
  onConfirm: () => void;
  isLoading: boolean;
}

export function WaitlistDialog({
  open,
  onOpenChange,
  className,
  classTime,
  dayOfWeek,
  waitlistCount,
  onConfirm,
  isLoading,
}: WaitlistDialogProps) {
  const estimatedPosition = waitlistCount + 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-foreground flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Join Waitlist
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            This class is currently full. Join the waitlist to get notified when a spot opens up.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Class Info */}
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
            <h3 className="font-semibold text-foreground mb-1">{className}</h3>
            <p className="text-sm text-muted-foreground">
              {dayOfWeek} at {classTime}
            </p>
          </div>

          {/* Waitlist Info */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 p-2 rounded-lg mt-1">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground">Your Position</p>
                <p className="text-sm text-muted-foreground">
                  You'll be <span className="font-bold text-primary">#{estimatedPosition}</span> in line
                  {waitlistCount > 0 && (
                    <span className="text-xs ml-1">
                      ({waitlistCount} {waitlistCount === 1 ? "person" : "people"} ahead of you)
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-green-500/10 p-2 rounded-lg mt-1">
                <Bell className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground">We'll Notify You</p>
                <p className="text-sm text-muted-foreground">
                  You'll receive an email and in-app notification when a spot becomes available
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-yellow-500/10 p-2 rounded-lg mt-1">
                <Clock className="h-4 w-4 text-yellow-500" />
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground">24-Hour Booking Window</p>
                <p className="text-sm text-muted-foreground">
                  Once notified, you'll have 24 hours to book the class before the spot goes to the next person
                </p>
              </div>
            </div>
          </div>

          {/* Important Notice */}
          <Alert>
            <AlertDescription className="text-xs">
              By joining the waitlist, you agree to check your notifications regularly.
              Spots can become available at any time, and you must book within 24 hours of being notified.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <div className="flex gap-3 w-full">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              onClick={onConfirm}
              className="flex-1 bg-gradient-primary text-primary-foreground hover:shadow-glow font-bold"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Joining...
                </>
              ) : (
                <>
                  <Users className="mr-2 h-4 w-4" />
                  Join Waitlist
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
