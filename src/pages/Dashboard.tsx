import { useNavigate } from "react-router-dom";
import { useSession } from "@/context/SessionProvider";
import { supabase } from "@/lib/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dumbbell, CalendarDays, User, Package, Clock, Hash, MapPin, Loader2, Info } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


// Fetch user profile data
const fetchUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from("profiles")
    .select("first_name, last_name, email, phone, membership_expiry_date, memberships(name)")
    .eq("id", userId)
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return data;
};

// Fetch user's upcoming bookings
const fetchUserBookings = async (userId: string) => {
  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
      id,
      created_at,
      schedule (
        id,
        day_of_week,
        start_time,
        end_time,
        classes (
          name,
          instructor
        )
      )
    `
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false }); // Order by newest bookings first
  if (error) {
    throw new Error(error.message);
  }

  // Filter for upcoming classes - this logic needs to be robustified
  const now = new Date();
  const todayDayOfWeek = now.toLocaleString('en-US', { weekday: 'long' }).toLowerCase();

  return data.filter(booking => {
    // Simplified: check if the class day is today or in the future
    const daysOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const bookingDayIndex = daysOrder.indexOf(booking.schedule?.day_of_week.toLowerCase());
    const todayDayIndex = daysOrder.indexOf(todayDayOfWeek);

    if (bookingDayIndex < todayDayIndex) {
      // Class day is in the past for this week, consider it for next week or more complex recurring logic
      // For now, let's keep it simple and assume we show all, but this can be enhanced.
      return true; 
    } else if (bookingDayIndex === todayDayIndex) {
      // Same day, check time
      const [classHour, classMinute] = booking.schedule.start_time.split(':').map(Number);
      const classTime = new Date();
      classTime.setHours(classHour, classMinute, 0, 0);
      return classTime > now;
    }
    return true; // Class day is in the future
  });
};

const Dashboard = () => {
  const { session, loading } = useSession();
  const navigate = useNavigate();
  const { toast } = useToast();

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
    if (!window.confirm("Are you sure you want to cancel this booking? This action cannot be undone.")) {
      return;
    }

    const { error } = await supabase.from("bookings").delete().eq("id", bookingId);
    if (error) {
      toast({
        title: "Cancellation Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Booking Cancelled",
        description: "Your class booking has been successfully cancelled.",
      });
      refetchBookings(); // Refresh bookings list
    }
  };

  const getMembershipStatusContent = () => {
    if (profile?.membership_expiry_date) {
      const expiryDate = new Date(profile.membership_expiry_date);
      if (expiryDate > new Date()) {
        return (
          <p className="text-sm">
            <span className="text-green-400 font-semibold">Active</span> until {format(expiryDate, "PPP")}
            <span className="block text-xs text-muted-foreground mt-1">({profile.memberships?.name})</span>
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
                <p><strong>Name:</strong> {profile?.first_name} {profile?.last_name}</p>
                <p><strong>Email:</strong> {profile?.email}</p>
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
                <Button variant="outline" className="w-full mt-4 border-primary text-primary hover:bg-primary/10">
                  Manage Membership
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Main Content - Upcoming Classes */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-card border-border shadow-md">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="flex items-center gap-3 text-2xl font-bold text-foreground">
                  <CalendarDays className="w-6 h-6 text-primary" /> Upcoming Classes
                </CardTitle>
                <CardDescription className="text-muted-foreground">Classes you've booked and are yet to attend.</CardDescription>
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
                          <CardTitle className="text-lg font-semibold text-primary">{booking.schedule?.classes?.name}</CardTitle>
                          <Button variant="destructive" size="sm" onClick={() => handleCancelBooking(booking.id)}>
                            Cancel
                          </Button>
                        </CardHeader>
                        <CardContent className="p-0 text-sm text-muted-foreground space-y-1">
                          <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-accent" /> Instructor: {booking.schedule?.classes?.instructor}</p>
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
                      You haven't booked any classes yet. Head over to the <Button variant="link" className="p-0 h-auto text-primary" onClick={() => navigate("/#schedule")}>Schedule</Button> to reserve your spot!
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
