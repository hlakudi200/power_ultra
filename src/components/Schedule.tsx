import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import ClassCard from "./ClassCard";
import BookingDialog from "./BookingDialog";
import { supabase } from "@/lib/supabaseClient";
import { ScheduledClass } from "@/types/supabase";
import { useSession } from "@/context/SessionProvider";
import { AuthDialog } from "./AuthDialog";
import { MembershipRequiredDialog } from "./MembershipRequiredDialog";

const fetchSchedule = async () => {
  const { data, error } = await supabase
    .from("schedule")
    .select(
      `
      id,
      day_of_week,
      start_time,
      end_time,
      max_capacity,
      is_cancelled,
      cancellation_reason,
      classes (
        id,
        name,
        description
      ),
      instructors (
        name
      )
    `
    )
    .eq("is_cancelled", false); // Only show active classes to members

  if (error) {
    throw new Error("Failed to fetch schedule: " + error.message);
  }

  // Fetch booking counts for each schedule
  if (data && data.length > 0) {
    const scheduleWithBookings = await Promise.all(
      data.map(async (schedule: any) => {
        const today = new Date().toISOString().split('T')[0];
        const { count } = await supabase
          .from("bookings")
          .select("*", { count: "exact", head: true })
          .eq("schedule_id", schedule.id)
          .gte("class_date", today)
          .eq("status", "confirmed");

        // Transform arrays to single objects for type compatibility
        return {
          ...schedule,
          classes: Array.isArray(schedule.classes) ? schedule.classes[0] : schedule.classes,
          instructors: Array.isArray(schedule.instructors) ? schedule.instructors[0] : schedule.instructors,
          booking_count: count || 0,
        };
      })
    );

    return scheduleWithBookings as ScheduledClass[];
  }

  return [];
};

const days = [
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" },
];

const Schedule = () => {
  const [selectedDay, setSelectedDay] = useState("monday");
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [isMembershipDialogOpen, setIsMembershipDialogOpen] = useState(false);
  const { session } = useSession();
  
  const [bookingDialog, setBookingDialog] = useState<{
    open: boolean;
    className: string;
    classTime: string;
    scheduleId: string;
  }>({
    open: false,
    className: "",
    classTime: "",
    scheduleId: "",
  });

  const [pendingBooking, setPendingBooking] = useState<{
    className: string;
    classTime: string;
    scheduleId: string;
  } | null>(null);

  const { data: schedule, isLoading, error, refetch } = useQuery({
    queryKey: ["schedule"],
    queryFn: fetchSchedule,
  });

  const handleBooking = async (
    className: string,
    classTime: string,
    scheduleId: string
  ) => {
    if (session) {
      // User is logged in, check for active membership
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("membership_expiry_date")
        .eq("id", session.user.id)
        .single();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
        // Optionally, show a toast or error message to the user
        return;
      }
      
      const expiryDate = profile?.membership_expiry_date ? new Date(profile.membership_expiry_date) : null;
      const hasActiveMembership = expiryDate && expiryDate > new Date();

      if (hasActiveMembership) {
        setBookingDialog({
          open: true,
          className,
          classTime,
          scheduleId,
        });
      } else {
        setIsMembershipDialogOpen(true);
      }
    } else {
      // User is not logged in, set pending action and open auth dialog
      setPendingBooking({ className, classTime, scheduleId });
      setIsAuthDialogOpen(true);
    }
  };

  // This effect handles the user flow after they log in
  useEffect(() => {
    if (session && pendingBooking) {
      handleBooking(
        pendingBooking.className,
        pendingBooking.classTime,
        pendingBooking.scheduleId
      );
      setPendingBooking(null); // Clear the pending booking
    }
  }, [session, pendingBooking]);

  const handleViewPlans = () => {
    setIsMembershipDialogOpen(false);
    const pricingSection = document.querySelector("#pricing");
    if (pricingSection) {
      pricingSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(":");
    const date = new Date();
    date.setHours(parseInt(hours, 10));
    date.setMinutes(parseInt(minutes, 10));
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <section
      id="schedule"
      className="py-24 bg-background relative overflow-hidden"
    >
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,hsl(var(--primary)/0.08),transparent_40%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,hsl(var(--accent)/0.08),transparent_40%)]" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-5xl md:text-6xl font-black text-foreground mb-4">
            CLASS <span className="text-primary">SCHEDULE</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose from our diverse range of classes led by expert trainers
          </p>
        </div>

        {/* Weekly Schedule */}
        {isLoading && (
          <div className="space-y-8">
            {/* Skeleton for tab navigation */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-md" />
              ))}
            </div>
            {/* Skeleton for class cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-64 w-full rounded-lg" />
              ))}
            </div>
          </div>
        )}
        {error && (
          <div className="text-center py-12 bg-card/30 rounded-lg border border-destructive/50">
            <p className="text-xl text-destructive font-semibold mb-2">
              Failed to Load Schedule
            </p>
            <p className="text-muted-foreground">
              Could not load schedule. Please check your connection and try again later.
            </p>
          </div>
        )}
        {schedule && (
          <Tabs
            value={selectedDay}
            onValueChange={setSelectedDay}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 md:grid-cols-7 mb-12 bg-card/50 backdrop-blur-sm h-auto flex-wrap">
              {days.map((day) => (
                <TabsTrigger
                  key={day.value}
                  value={day.value}
                  className="text-sm md:text-base font-bold data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground py-3"
                >
                  {day.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {days.map((day) => (
              <TabsContent
                key={day.value}
                value={day.value}
                className="animate-fade-in"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {schedule
                    .filter((c) => c.day_of_week.toLowerCase() === day.value)
                    .map(
                      (c) =>
                        c.classes && (
                          <ClassCard
                            key={c.id}
                            name={c.classes.name}
                            instructor={c.instructors?.name || "TBA"}
                            time={formatTime(c.start_time)}
                            description={
                              c.classes.description || "No description available."
                            }
                            bookingCount={c.booking_count}
                            maxCapacity={c.max_capacity}
                            isFull={(c.booking_count || 0) >= (c.max_capacity || 20)}
                            onBook={() =>
                              handleBooking(
                                c.classes!.name,
                                formatTime(c.start_time),
                                c.id
                              )
                            }
                            duration="60 min"
                            capacity={`${c.max_capacity} spots`}
                            intensity="Medium"
                            color="primary"
                            scheduleId={c.id}
                            dayOfWeek={c.day_of_week}
                            onWaitlistChange={() => refetch()}
                          />
                        )
                    )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}

        {/* Info Section */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-card/30 backdrop-blur-sm border-2 border-primary/30 rounded-lg p-6 text-center">
            <div className="text-4xl font-black text-primary mb-2">45+</div>
            <p className="text-foreground font-semibold">Classes Per Week</p>
          </div>
          <div className="bg-card/30 backdrop-blur-sm border-2 border-secondary/30 rounded-lg p-6 text-center">
            <div className="text-4xl font-black text-secondary mb-2">15+</div>
            <p className="text-foreground font-semibold">Expert Instructors</p>
          </div>
          <div className="bg-card/30 backdrop-blur-sm border-2 border-accent/30 rounded-lg p-6 text-center">
            <div className="text-4xl font-black text-accent mb-2">ALL</div>
            <p className="text-foreground font-semibold">Fitness Levels</p>
          </div>
        </div>
      </div>

      <BookingDialog
        open={bookingDialog.open}
        onOpenChange={(open) => setBookingDialog({ ...bookingDialog, open })}
        className={bookingDialog.className}
        classTime={bookingDialog.classTime}
        scheduleId={bookingDialog.scheduleId}
      />
      <AuthDialog 
        isOpen={isAuthDialogOpen} 
        onOpenChange={(open) => { // Use onOpenChange with boolean parameter
          setIsAuthDialogOpen(open);
          if (!open) { // If dialog is being closed
            setPendingBooking(null); // Cancel pending booking if auth dialog is closed
          }
        }} 
      />
      <MembershipRequiredDialog 
        isOpen={isMembershipDialogOpen}
        onClose={() => setIsMembershipDialogOpen(false)}
        onConfirm={handleViewPlans}
      />
    </section>
  );
};

export default Schedule;
