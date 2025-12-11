import { useNavigate } from "react-router-dom";
import { useSession } from "@/context/SessionProvider";
import { supabase } from "@/lib/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dumbbell, CalendarDays, User, Package, Clock, Hash, MapPin, Loader2, Info, Plus, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ClassCard from "@/components/ClassCard";
import BookingDialog from "@/components/BookingDialog";
import { MyTrainer } from "@/components/MyTrainer";
import { UserAvatar } from "@/components/UserAvatar";
import { MembershipActivationPrompt } from "@/components/MembershipActivationPrompt";
import { ScheduledClass } from "@/types/supabase";
import { useState, useEffect } from "react";


// Fetch user profile data
const fetchUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from("profiles")
    .select("first_name, last_name, email, phone, membership_expiry_date, avatar_url, memberships!profiles_membership_id_fkey(name)")
    .eq("id", userId)
    .single();
  if (error) {
    throw new Error(error.message);
  }

  // Transform memberships array to single object
  if (data && data.memberships) {
    return {
      ...data,
      memberships: Array.isArray(data.memberships) ? data.memberships[0] : data.memberships,
    };
  }

  return data;
};

// Helper function to get the next occurrence of a class
const getNextClassOccurrence = (dayOfWeek: string, startTime: string): Date => {
  const daysOrder = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const targetDayIndex = daysOrder.indexOf(dayOfWeek.toLowerCase());

  if (targetDayIndex === -1) {
    throw new Error(`Invalid day of week: ${dayOfWeek}`);
  }

  const now = new Date();
  const currentDayIndex = now.getDay(); // 0 = Sunday, 1 = Monday, etc.

  // Parse the class time
  const [hours, minutes] = startTime.split(':').map(Number);

  // Calculate days until the next occurrence
  let daysUntilClass = targetDayIndex - currentDayIndex;

  // If the class day is today, check if the time has passed
  if (daysUntilClass === 0) {
    const classDateTime = new Date(now);
    classDateTime.setHours(hours, minutes, 0, 0);

    // If class time has passed today, schedule for next week
    if (classDateTime <= now) {
      daysUntilClass = 7;
    }
  } else if (daysUntilClass < 0) {
    // Class day is earlier in the week, schedule for next week
    daysUntilClass += 7;
  }

  // Create the next occurrence date
  const nextOccurrence = new Date(now);
  nextOccurrence.setDate(now.getDate() + daysUntilClass);
  nextOccurrence.setHours(hours, minutes, 0, 0);

  return nextOccurrence;
};

// Fetch user's upcoming bookings with improved date logic
const fetchUserBookings = async (userId: string) => {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
      id,
      created_at,
      status,
      class_date,
      schedule (
        id,
        day_of_week,
        start_time,
        end_time,
        classes (
          name
        ),
        instructors (
          name
        )
      )
    `
    )
    .eq("user_id", userId)
    .gte("class_date", today)
    .eq("status", "confirmed")
    .order("class_date", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  // Transform schedule arrays to single objects and add next occurrence date
  const bookingsWithDates = data.map((booking: any) => {
    if (!booking.schedule) return null;

    // Transform nested arrays to single objects
    const transformedSchedule = {
      ...booking.schedule,
      classes: Array.isArray(booking.schedule.classes) ? booking.schedule.classes[0] : booking.schedule.classes,
      instructors: Array.isArray(booking.schedule.instructors) ? booking.schedule.instructors[0] : booking.schedule.instructors,
    };

    try {
      const nextOccurrence = getNextClassOccurrence(
        transformedSchedule.day_of_week,
        transformedSchedule.start_time
      );

      return {
        ...booking,
        schedule: transformedSchedule,
        nextOccurrence,
      };
    } catch (err) {
      console.error('Error calculating next occurrence:', err);
      return null;
    }
  }).filter(Boolean) as Array<any>;

  // Sort by next occurrence (soonest first)
  bookingsWithDates.sort((a, b) =>
    a.nextOccurrence.getTime() - b.nextOccurrence.getTime()
  );

  return bookingsWithDates;
};

// Fetch schedule data
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
        description,
        image_url
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

const Dashboard = () => {
  const { session, loading } = useSession();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showBookingSection, setShowBookingSection] = useState(false);
  const [selectedDay, setSelectedDay] = useState("monday");
  const [showActivationPrompt, setShowActivationPrompt] = useState(false);
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

  const userId = session?.user?.id;
  const firstName = session?.user?.user_metadata?.first_name || "Member"; // Fallback name

  const {
    data: profile,
    isLoading: isProfileLoading,
    error: profileError,
  } = useQuery({
    queryKey: ["userProfile", userId],
    queryFn: () => fetchUserProfile(userId!),
    enabled: !!userId,
  });

  const {
    data: bookings,
    isLoading: isBookingsLoading,
    error: bookingsError,
    refetch: refetchBookings,
  } = useQuery({
    queryKey: ["userBookings", userId],
    queryFn: () => fetchUserBookings(userId!),
    enabled: !!userId,
  });

  const {
    data: schedule,
    isLoading: isScheduleLoading,
    error: scheduleError,
  } = useQuery({
    queryKey: ["schedule"],
    queryFn: fetchSchedule,
    enabled: showBookingSection,
  });

  // Check if user has active membership and show prompt if not
  useEffect(() => {
    if (profile && !isProfileLoading) {
      const hasActiveMembership = profile.membership_expiry_date &&
        new Date(profile.membership_expiry_date) > new Date();

      console.log("Membership check:", {
        membership_expiry_date: profile.membership_expiry_date,
        hasActiveMembership,
        willShowPrompt: !hasActiveMembership
      });

      if (!hasActiveMembership) {
        setShowActivationPrompt(true);
      }
    }
  }, [profile, isProfileLoading]);

  if (loading || isProfileLoading || isBookingsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
        <span className="text-xl">Loading dashboard...</span>
      </div>
    );
  }

  if (!session) {
    navigate("/"); // Should be handled by ProtectedRoute, but good fallback
    return null;
  }

  if (profileError || bookingsError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Alert variant="destructive">
          <Info className="h-4 w-4" />
          <AlertTitle>Error!</AlertTitle>
          <AlertDescription>
            Failed to load dashboard data: {profileError?.message || bookingsError?.message}. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const handleCancelBooking = async (bookingId: string) => {
    if (!window.confirm("Are you sure you want to cancel this booking?")) {
      return;
    }

    try {
      // First, get the booking details before cancelling
      const { data: bookingData, error: fetchError } = await supabase
        .from("bookings")
        .select(`
          id,
          schedule_id,
          schedule (
            id,
            day_of_week,
            start_time,
            end_time,
            classes (name)
          )
        `)
        .eq("id", bookingId)
        .single();

      if (fetchError) {
        console.error("Error fetching booking:", fetchError);
        throw new Error(fetchError.message);
      }

      // Cancel the booking
      const { error } = await supabase
        .from("bookings")
        .update({ status: "cancelled" })
        .eq("id", bookingId);

      if (error) {
        console.error("Booking cancellation error:", error);
        throw new Error(error.message);
      }

      toast({
        title: "Booking Cancelled Successfully",
        description: "Your class booking has been cancelled. The spot is now available for others.",
      });

      // Process waitlist if booking was cancelled successfully
      if (bookingData && session?.access_token) {
        try {
          const scheduleData = Array.isArray(bookingData.schedule)
            ? bookingData.schedule[0]
            : bookingData.schedule;

          const classData = Array.isArray(scheduleData?.classes)
            ? scheduleData.classes[0]
            : scheduleData?.classes;

          const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
          const response = await fetch(`${SUPABASE_URL}/functions/v1/process-waitlist`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              schedule_id: bookingData.schedule_id,
              class_name: classData?.name || "Class",
              day_of_week: scheduleData?.day_of_week || "Unknown",
              start_time: scheduleData?.start_time || "00:00",
              end_time: scheduleData?.end_time || "00:00",
            }),
          });

          if (response.ok) {
            const result = await response.json();
            console.log(`Waitlist processed: ${result.notified_count} member(s) notified`);
          }
        } catch (waitlistError) {
          // Don't show error to user, just log it
          console.error("Error processing waitlist:", waitlistError);
        }
      }

      refetchBookings(); // Refresh bookings list
    } catch (error: any) {
      toast({
        title: "Cancellation Failed",
        description: error.message || "Unable to cancel booking. Please try again or contact support.",
        variant: "destructive",
      });
    }
  };

  const handleBooking = (className: string, classTime: string, scheduleId: string) => {
    setBookingDialog({
      open: true,
      className,
      classTime,
      scheduleId,
    });
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

  const getMembershipStatusContent = () => {
    if (profile?.membership_expiry_date) {
      const expiryDate = new Date(profile.membership_expiry_date);
      if (expiryDate > new Date()) {
        return (
          <p className="text-sm">
            <span className="text-green-400 font-semibold">Active</span> until {format(expiryDate, "PPP")}
            {profile.memberships && !Array.isArray(profile.memberships) && (
              <span className="block text-xs text-muted-foreground mt-1">({profile.memberships.name})</span>
            )}
          </p>
        );
      } else {
        return (
          <p className="text-sm">
            <span className="text-red-400 font-semibold">Expired</span> as of {format(expiryDate, "PPP")}
          </p>
        );
      }
    }
    return <p className="text-sm text-yellow-500 font-semibold">No active membership</p>;
  };

  return (
    <div className="min-h-screen bg-gradient-dark py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Welcome Banner */}
        <div className="relative p-6 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-xl shadow-strong border border-border overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[url('/hero-gym.jpg')] bg-cover bg-center"></div>
          <div className="relative z-10 flex flex-col sm:flex-row justify-between items-center">
            <div className="text-center sm:text-left mb-4 sm:mb-0">
              <h1 className="text-4xl md:text-5xl font-black text-primary drop-shadow-lg">
                Welcome back, {profile?.first_name || "Member"}!
              </h1>
              <p className="text-lg text-foreground mt-2 max-w-2xl">
                Your personal fitness hub awaits. Stay updated with your progress and upcoming classes.
              </p>
            </div>
            <Dumbbell className="w-24 h-24 text-primary/50 -rotate-12 hidden md:block" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar - Profile & Membership */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="bg-card border-border shadow-md">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="flex items-center gap-3 text-2xl font-bold text-foreground">
                  <User className="w-6 h-6 text-primary" /> Your Profile
                </CardTitle>
                <CardDescription className="text-muted-foreground">Manage your personal details and membership.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-4 text-foreground">
                <div className="flex items-center gap-4 mb-4">
                  <UserAvatar user={session?.user || null} profile={profile} size="xl" />
                  <div>
                    <p className="text-lg font-semibold">{profile?.first_name} {profile?.last_name}</p>
                    <p className="text-sm text-muted-foreground">{profile?.email}</p>
                  </div>
                </div>
                <p><strong>Phone:</strong> {profile?.phone || "Not provided"}</p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border shadow-md">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="flex items-center gap-3 text-2xl font-bold text-foreground">
                  <Package className="w-6 h-6 text-primary" /> Membership
                </CardTitle>
                <CardDescription className="text-muted-foreground">Your current plan status.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-4 text-foreground">
                {getMembershipStatusContent()}
                <div className="space-y-2 mt-4">
                  <Button
                    onClick={() => navigate("/activate-membership")}
                    className="w-full bg-gradient-primary text-primary-foreground hover:shadow-glow font-bold gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    Activate Membership Code
                  </Button>
                  <Button variant="outline" className="w-full border-primary text-primary hover:bg-primary/10">
                    Manage Membership
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* My Trainer Widget */}
            <MyTrainer />
          </div>

          {/* Main Content - Upcoming Classes */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-card border-border shadow-md">
              <CardHeader className="border-b border-border pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-3 text-2xl font-bold text-foreground">
                      <CalendarDays className="w-6 h-6 text-primary" /> Upcoming Classes
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">Classes you've booked and are yet to attend.</CardDescription>
                  </div>
                  <Button
                    onClick={() => setShowBookingSection(!showBookingSection)}
                    className="bg-gradient-primary text-primary-foreground hover:shadow-glow font-bold gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Book New Class
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {isBookingsLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                ) : bookings && bookings.length > 0 ? (
                  <div className="space-y-4">
                    {bookings.map((booking) => (
                      <Card key={booking.id} className="bg-background border-border p-4 shadow-sm hover:shadow-lg transition-shadow duration-300">
                        <CardHeader className="flex flex-row items-center justify-between p-0 pb-2">
                          <div>
                            <CardTitle className="text-lg font-semibold text-primary">{booking.schedule?.classes?.name}</CardTitle>
                            {booking.nextOccurrence && (
                              <p className="text-xs text-green-500 font-semibold mt-1">
                                Next class: {format(booking.nextOccurrence, "EEEE, MMM d 'at' h:mm a")}
                              </p>
                            )}
                          </div>
                          <Button variant="destructive" size="sm" onClick={() => handleCancelBooking(booking.id)}>
                            Cancel
                          </Button>
                        </CardHeader>
                        <CardContent className="p-0 text-sm text-muted-foreground space-y-1 mt-3">
                          <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-accent" /> Instructor: {booking.schedule?.instructors?.name || "TBA"}</p>
                          <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-accent" /> Day: {booking.schedule?.day_of_week}</p>
                          <p className="flex items-center gap-2"><Clock className="h-4 w-4 text-accent" /> Time: {booking.schedule?.start_time} - {booking.schedule?.end_time}</p>
                          <p className="flex items-center gap-2"><Hash className="h-4 w-4 text-accent" /> Booked on: {format(new Date(booking.created_at), "PPP p")}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Alert className="bg-background border-primary/30 text-foreground">
                    <Info className="h-4 w-4 text-primary" />
                    <AlertTitle className="text-primary">No Upcoming Bookings</AlertTitle>
                    <AlertDescription>
                      You haven't booked any classes yet. Click the "Book New Class" button above to reserve your spot!
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Book New Class Section */}
            {showBookingSection && (
              <Card className="bg-card border-border shadow-md">
                <CardHeader className="border-b border-border pb-4">
                  <CardTitle className="flex items-center gap-3 text-2xl font-bold text-foreground">
                    <Dumbbell className="w-6 h-6 text-primary" /> Available Classes
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">Browse and book classes from our weekly schedule.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  {isScheduleLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-40 w-full" />
                    </div>
                  ) : scheduleError ? (
                    <Alert variant="destructive">
                      <Info className="h-4 w-4" />
                      <AlertTitle>Error!</AlertTitle>
                      <AlertDescription>
                        Failed to load class schedule. Please try again later.
                      </AlertDescription>
                    </Alert>
                  ) : schedule ? (
                    <Tabs value={selectedDay} onValueChange={setSelectedDay} className="w-full">
                      <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 md:grid-cols-7 mb-6 bg-card/50 backdrop-blur-sm h-auto flex-wrap">
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
                        <TabsContent key={day.value} value={day.value} className="animate-fade-in">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                      description={c.classes.description || "No description available."}
                                      bookingCount={c.booking_count}
                                      maxCapacity={c.max_capacity}
                                      isFull={(c.booking_count || 0) >= (c.max_capacity || 20)}
                                      onBook={() =>
                                        handleBooking(c.classes!.name, formatTime(c.start_time), c.id)
                                      }
                                      duration="60 min"
                                      capacity={`${c.max_capacity} spots`}
                                      intensity="Medium"
                                      color="primary"
                                      scheduleId={c.id}
                                      dayOfWeek={c.day_of_week}
                                      onWaitlistChange={fetchSchedule}
                                    />
                                  )
                              )}
                          </div>
                        </TabsContent>
                      ))}
                    </Tabs>
                  ) : null}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Membership Activation Prompt for Non-Members */}
      <MembershipActivationPrompt
        open={showActivationPrompt}
        onOpenChange={setShowActivationPrompt}
        userName={profile?.first_name || firstName}
      />

      <BookingDialog
        open={bookingDialog.open}
        onOpenChange={(open) => {
          setBookingDialog({ ...bookingDialog, open });
          if (!open) {
            // Refresh bookings when dialog closes after successful booking
            refetchBookings();
          }
        }}
        className={bookingDialog.className}
        classTime={bookingDialog.classTime}
        scheduleId={bookingDialog.scheduleId}
      />
    </div>
  );
};

export default Dashboard;
