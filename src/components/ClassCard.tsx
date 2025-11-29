import { Clock, Users, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { WaitlistButton } from "./WaitlistButton";

interface ClassCardProps {
  name?: string;
  instructor?: string;
  time?: string;
  duration?: string;
  capacity?: string;
  intensity?: "Low" | "Medium" | "High" | string;
  description?: string;
  color?: "primary" | "secondary" | "accent" | string;
  onBook: () => void;
  isFull?: boolean;
  bookingCount?: number;
  maxCapacity?: number;
  scheduleId?: string;
  dayOfWeek?: string;
  onWaitlistChange?: () => void;
}

const intensityColors: { [key: string]: string } = {
  Low: "text-accent",
  Medium: "text-secondary",
  High: "text-primary",
};

const colorVariants: { [key: string]: string } = {
  primary: "bg-primary/10 border-primary/30 hover:border-primary/50",
  secondary: "bg-secondary/10 border-secondary/30 hover:border-secondary/50",
  accent: "bg-accent/10 border-accent/30 hover:border-accent/50",
};

const ClassCard = ({
  name = "Class",
  instructor = "N/A",
  time = "N/A",
  duration = "60 min",
  capacity = "N/A",
  intensity = "Medium",
  description = "No description available.",
  color = "primary",
  onBook,
  isFull = false,
  bookingCount,
  maxCapacity,
  scheduleId,
  dayOfWeek,
  onWaitlistChange,
}: ClassCardProps) => {
  const capacityDisplay = bookingCount !== undefined && maxCapacity !== undefined
    ? `${bookingCount}/${maxCapacity}`
    : capacity;

  const isNearlyFull = bookingCount !== undefined && maxCapacity !== undefined
    ? (bookingCount / maxCapacity) >= 0.8 && !isFull
    : false;

  return (
    <div
      className={cn(
        "group p-6 rounded-lg border-2 transition-all duration-300 hover-scale",
        colorVariants[color],
        isFull && "opacity-75"
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-2xl font-black text-foreground mb-1">{name}</h3>
            {isFull && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-destructive/10 text-destructive">
                FULL
              </span>
            )}
            {isNearlyFull && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700">
                FILLING UP
              </span>
            )}
          </div>
          <p className="text-muted-foreground font-semibold">with {instructor}</p>
        </div>
        <div className="flex items-center gap-1">
          <Flame className={cn("w-5 h-5", intensityColors[intensity])} />
          <span className={cn("text-sm font-bold", intensityColors[intensity])}>
            {intensity}
          </span>
        </div>
      </div>

      <p className="text-foreground/80 mb-4">{description}</p>

      <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          <span className="font-semibold">{time}</span>
        </div>
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4" />
          <span className={cn(
            "font-semibold",
            isFull && "text-destructive",
            isNearlyFull && "text-orange-600"
          )}>{capacityDisplay}</span>
        </div>
        <span className="font-semibold">{duration}</span>
      </div>

      <div className="space-y-2">
        <Button
          onClick={onBook}
          disabled={isFull}
          className="w-full bg-gradient-primary text-primary-foreground hover:shadow-glow font-bold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isFull ? "CLASS FULL" : "BOOK NOW"}
        </Button>

        {/* Waitlist button - shows when class is full or user is on waitlist */}
        {scheduleId && dayOfWeek && (
          <WaitlistButton
            scheduleId={scheduleId}
            className={name}
            classTime={time}
            dayOfWeek={dayOfWeek}
            isFull={isFull}
            onWaitlistChange={onWaitlistChange}
          />
        )}
      </div>
    </div>
  );
};

export default ClassCard;

