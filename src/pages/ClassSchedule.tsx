import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Calendar, Clock, Users, CheckCircle2, XCircle } from "lucide-react";
import { useSession } from "@/context/SessionProvider";

interface ScheduleItem {
  id: string;
  class_id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  max_capacity: number;
  classes?: {
    name: string;
    description?: string;
    instructor?: string;
  };
  booking_count: number;
  user_booked: boolean;
  user_booking_id?: string;
}

export default function ClassSchedule() {
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState<string | null>(null);
  const { session } = useSession();
  const { toast } = useToast();

  const daysOfWeek = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  useEffect(() => {
    if (session) {
      fetchSchedule();
    }
  }, [session]);

  const fetchSchedule = async () => {
    if (!session) return;

    setLoading(true);

    // Fetch all schedule items
    const { data: scheduleData, error: scheduleError } = await supabase
      .from("schedule")
      .select(`
        *,
        classes (
          name,
          description,
          image_url
        ),
        instructors (
          name
        )
      `)
      .eq("is_cancelled", false)
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true });

    if (scheduleError) {
      console.error("Error fetching schedule:", scheduleError);
      toast({
        title: "Error",
        description: "Failed to load class schedule",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Fetch booking counts and user's bookings for each schedule item
    if (scheduleData && scheduleData.length > 0) {
      const scheduleWithBookings = await Promise.all(
        scheduleData.map(async (schedule: any) => {
          const today = new Date().toISOString().split('T')[0];

          // Get booking count
          const { count } = await supabase
            .from("bookings")
            .select("*", { count: "exact", head: true })
            .eq("schedule_id", schedule.id)
            .gte("class_date", today)
            .eq("status", "confirmed");

          // Check if user has booked this class
          const { data: userBooking } = await supabase
            .from("bookings")
            .select("id")
            .eq("schedule_id", schedule.id)
            .eq("user_id", session.user.id)
            .gte("class_date", today)
            .eq("status", "confirmed")
            .maybeSingle();

          // Transform arrays to single objects for type compatibility
          return {
            ...schedule,
            classes: Array.isArray(schedule.classes) ? schedule.classes[0] : schedule.classes,
            instructors: Array.isArray(schedule.instructors) ? schedule.instructors[0] : schedule.instructors,
            booking_count: count || 0,
            user_booked: !!userBooking,
            user_booking_id: userBooking?.id,
          };
        })
      );

      setScheduleItems(scheduleWithBookings);
    } else {
      setScheduleItems([]);
    }

    setLoading(false);
  };

  const handleBookClass = async (
    scheduleId: string,
    maxCapacity: number,
    currentBookings: number,
    dayOfWeek: string,
    startTime: string,
    endTime: string
  ) => {
    if (!session) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to book classes",
        variant: "destructive",
      });
      return;
    }

    // Check capacity
    if (currentBookings >= maxCapacity) {
      toast({
        title: "Class Full",
        description: "This class is at full capacity",
        variant: "destructive",
      });
      return;
    }

    // Check for overlapping bookings on the same day
    const userBookingsOnDay = scheduleItems.filter(
      (item) => item.day_of_week === dayOfWeek && item.user_booked
    );

    for (const booking of userBookingsOnDay) {
      const bookingStart = booking.start_time;
      const bookingEnd = booking.end_time;

      // Check if times overlap
      const newStartMinutes = timeToMinutes(startTime);
      const newEndMinutes = timeToMinutes(endTime);
      const existingStartMinutes = timeToMinutes(bookingStart);
      const existingEndMinutes = timeToMinutes(bookingEnd);

      if (
        (newStartMinutes >= existingStartMinutes && newStartMinutes < existingEndMinutes) ||
        (newEndMinutes > existingStartMinutes && newEndMinutes <= existingEndMinutes) ||
        (newStartMinutes <= existingStartMinutes && newEndMinutes >= existingEndMinutes)
      ) {
        toast({
          title: "Time Conflict",
          description: `You already have "${booking.classes?.name}" booked at ${bookingStart} - ${bookingEnd} on ${dayOfWeek}`,
          variant: "destructive",
        });
        return;
      }
    }

    setBookingLoading(scheduleId);

    const { error } = await supabase
      .from("bookings")
      .insert([
        {
          user_id: session.user.id,
          schedule_id: scheduleId,
          status: "confirmed",
        },
      ]);

    setBookingLoading(null);

    if (error) {
      console.error("Error booking class:", error);
      toast({
        title: "Booking Failed",
        description: error.message || "Failed to book class. Please try again.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Class booked successfully!",
      });
      fetchSchedule(); // Refresh to show updated booking status
    }
  };

  // Helper function to convert time string to minutes
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!bookingId) return;

    setBookingLoading(bookingId);

    const { error } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", bookingId);

    setBookingLoading(null);

    if (error) {
      console.error("Error cancelling booking:", error);
      toast({
        title: "Cancellation Failed",
        description: "Failed to cancel booking. Please try again.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Booking cancelled successfully",
      });
      fetchSchedule(); // Refresh to show updated booking status
    }
  };

  const groupedByDay = daysOfWeek.map((day) => ({
    day,
    items: scheduleItems.filter((item) => item.day_of_week === day),
  }));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading schedule...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Class Schedule</h1>
          <p className="text-muted-foreground">
            Browse and book your favorite classes
          </p>
        </div>

        {/* Weekly Schedule */}
        <div className="space-y-6">
          {groupedByDay.map(({ day, items }) => (
            <div key={day} className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <Calendar className="h-6 w-6 text-primary" />
                {day}
              </h2>

              {items.length === 0 ? (
                <p className="text-muted-foreground text-sm">No classes scheduled</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {items.map((item) => {
                    const bookingCount = item.booking_count || 0;
                    const maxCapacity = item.max_capacity || 20;
                    const isFull = bookingCount >= maxCapacity;
                    const spotsLeft = maxCapacity - bookingCount;
                    const isNearlyFull = spotsLeft <= 5 && !isFull;

                    return (
                      <div
                        key={item.id}
                        className={`p-4 rounded-lg border ${
                          item.user_booked
                            ? "border-primary bg-primary/5"
                            : "border-border bg-background"
                        }`}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-semibold text-lg text-foreground">
                              {item.classes?.name || "Unknown Class"}
                            </h3>
                            {item.classes?.instructor && (
                              <p className="text-sm text-muted-foreground">
                                with {item.classes.instructor}
                              </p>
                            )}
                          </div>
                          {item.user_booked && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                              <CheckCircle2 className="h-3 w-3" />
                              Booked
                            </span>
                          )}
                        </div>

                        <div className="space-y-2 mb-4">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span>
                              {item.start_time} - {item.end_time}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className={
                              isFull ? "text-destructive font-medium" :
                              isNearlyFull ? "text-orange-500 font-medium" :
                              "text-muted-foreground"
                            }>
                              {bookingCount}/{maxCapacity} spots filled
                            </span>
                            {isNearlyFull && !isFull && (
                              <span className="text-xs text-orange-500">
                                (Only {spotsLeft} left!)
                              </span>
                            )}
                          </div>
                        </div>

                        {item.classes?.description && (
                          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                            {item.classes.description}
                          </p>
                        )}

                        {item.user_booked ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => handleCancelBooking(item.user_booking_id!)}
                            disabled={bookingLoading === item.user_booking_id}
                          >
                            {bookingLoading === item.user_booking_id ? (
                              "Cancelling..."
                            ) : (
                              <>
                                <XCircle className="h-4 w-4 mr-1" />
                                Cancel Booking
                              </>
                            )}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            className="w-full"
                            onClick={() => handleBookClass(
                              item.id,
                              maxCapacity,
                              bookingCount,
                              item.day_of_week,
                              item.start_time,
                              item.end_time
                            )}
                            disabled={isFull || bookingLoading === item.id}
                          >
                            {bookingLoading === item.id
                              ? "Booking..."
                              : isFull
                              ? "Class Full"
                              : "Book Class"}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
