import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import AdminLayout from "@/components/admin/AdminLayout";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import {
  Users,
  TrendingUp,
  Calendar,
  DollarSign,
  Activity,
  Award,
} from "lucide-react";
import {
  startOfWeek,
  startOfMonth,
  endOfWeek,
  endOfMonth,
  format,
  subDays,
} from "date-fns";

interface AnalyticsData {
  totalMembers: number;
  newMembersThisPeriod: number;
  totalBookings: number;
  bookingsThisPeriod: number;
  activeMembers: number;
  expiredMembers: number;
  totalRevenue: number;
  revenueThisPeriod: number;
  classAttendance: Array<{ class_name: string; count: number }>;
  popularDays: Array<{ day: string; count: number }>;
}

export default function Analytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<string>("week");
  const { toast } = useToast();

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const getDateRange = () => {
    const now = new Date();
    switch (dateRange) {
      case "week":
        return {
          start: startOfWeek(now),
          end: endOfWeek(now),
        };
      case "month":
        return {
          start: startOfMonth(now),
          end: endOfMonth(now),
        };
      case "7days":
        return {
          start: subDays(now, 7),
          end: now,
        };
      case "30days":
        return {
          start: subDays(now, 30),
          end: now,
        };
      default:
        return {
          start: startOfWeek(now),
          end: endOfWeek(now),
        };
    }
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    const { start, end } = getDateRange();

    try {
      // Total members
      const { count: totalMembers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // New members in period
      const { count: newMembersThisPeriod } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString());

      // Total bookings (only confirmed)
      const { count: totalBookings } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("status", "confirmed");

      // Bookings in period (only confirmed)
      const { count: bookingsThisPeriod } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("status", "confirmed")
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString());

      // Active members (membership not expired)
      const { count: activeMembers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("membership_expiry_date", new Date().toISOString());

      // Expired members
      const { count: expiredMembers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .not("membership_expiry_date", "is", null)
        .lt("membership_expiry_date", new Date().toISOString());

      // Revenue calculation (from memberships table)
      const { data: memberships } = await supabase
        .from("memberships")
        .select("price");

      const totalRevenue = memberships
        ? memberships.reduce((sum, m) => sum + (m.price || 0), 0)
        : 0;

      // For this period revenue (simplified - you'd need a transactions table for real data)
      const revenueThisPeriod = totalRevenue * 0.3; // Placeholder

      // Class attendance (bookings by class)
      const { data: classBookings } = await supabase
        .from("bookings")
        .select(
          `
          schedule (
            classes (
              name
            )
          )
        `
        )
        .eq("status", "confirmed")
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString());

      const classAttendanceMap: Record<string, number> = {};
      classBookings?.forEach((booking: any) => {
        const className = booking.schedule?.classes?.name || "Unknown";
        classAttendanceMap[className] =
          (classAttendanceMap[className] || 0) + 1;
      });

      const classAttendance = Object.entries(classAttendanceMap)
        .map(([class_name, count]) => ({ class_name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Popular days (bookings by day of week)
      const { data: dayBookings } = await supabase
        .from("bookings")
        .select(
          `
          schedule (
            day_of_week
          )
        `
        )
        .eq("status", "confirmed")
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString());

      const dayMap: Record<string, number> = {};
      dayBookings?.forEach((booking: any) => {
        const day = booking.schedule?.day_of_week || "Unknown";
        dayMap[day] = (dayMap[day] || 0) + 1;
      });

      const popularDays = Object.entries(dayMap)
        .map(([day, count]) => ({ day, count }))
        .sort((a, b) => b.count - a.count);

      setAnalytics({
        totalMembers: totalMembers || 0,
        newMembersThisPeriod: newMembersThisPeriod || 0,
        totalBookings: totalBookings || 0,
        bookingsThisPeriod: bookingsThisPeriod || 0,
        activeMembers: activeMembers || 0,
        expiredMembers: expiredMembers || 0,
        totalRevenue,
        revenueThisPeriod,
        classAttendance,
        popularDays,
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive",
      });
    }

    setLoading(false);
  };

  const StatCard = ({
    title,
    value,
    icon: Icon,
    trend,
    color = "text-primary",
  }: {
    title: string;
    value: string | number;
    icon: any;
    trend?: string;
    color?: string;
  }) => (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-muted-foreground">{title}</p>
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {trend && (
        <p className="text-xs text-muted-foreground mt-1">{trend}</p>
      )}
    </div>
  );

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-8 text-center text-muted-foreground">
          Loading analytics...
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
            <p className="text-muted-foreground">
              Track performance and insights
            </p>
          </div>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Members"
            value={analytics?.totalMembers || 0}
            icon={Users}
            trend={`+${analytics?.newMembersThisPeriod || 0} this period`}
            color="text-blue-600"
          />
          <StatCard
            title="Active Members"
            value={analytics?.activeMembers || 0}
            icon={Activity}
            trend={`${analytics?.expiredMembers || 0} expired`}
            color="text-green-600"
          />
          <StatCard
            title="Total Bookings"
            value={analytics?.totalBookings || 0}
            icon={Calendar}
            trend={`${analytics?.bookingsThisPeriod || 0} this period`}
            color="text-purple-600"
          />
          <StatCard
            title="Revenue (Est.)"
            value={`R${analytics?.totalRevenue.toFixed(2) || 0}`}
            icon={DollarSign}
            trend={`R${analytics?.revenueThisPeriod.toFixed(2) || 0} this period`}
            color="text-yellow-600"
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Classes */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Award className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold text-foreground">
                Top Classes
              </h2>
            </div>
            {analytics?.classAttendance && analytics.classAttendance.length > 0 ? (
              <div className="space-y-4">
                {analytics.classAttendance.map((item, index) => (
                  <div key={index}>
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-sm font-medium text-foreground">
                        {item.class_name}
                      </p>
                      <p className="text-sm font-bold text-primary">
                        {item.count} bookings
                      </p>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{
                          width: `${
                            (item.count /
                              Math.max(
                                ...analytics.classAttendance.map((c) => c.count)
                              )) *
                            100
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                No class data available
              </p>
            )}
          </div>

          {/* Popular Days */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold text-foreground">
                Popular Days
              </h2>
            </div>
            {analytics?.popularDays && analytics.popularDays.length > 0 ? (
              <div className="space-y-4">
                {analytics.popularDays.map((item, index) => (
                  <div key={index}>
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-sm font-medium text-foreground capitalize">
                        {item.day}
                      </p>
                      <p className="text-sm font-bold text-primary">
                        {item.count} bookings
                      </p>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{
                          width: `${
                            (item.count /
                              Math.max(
                                ...analytics.popularDays.map((d) => d.count)
                              )) *
                            100
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                No booking data available
              </p>
            )}
          </div>
        </div>

        {/* Member Growth */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-xl font-bold text-foreground mb-4">
            Membership Overview
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-background rounded-lg">
              <p className="text-3xl font-bold text-blue-600">
                {analytics?.totalMembers || 0}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Total Members
              </p>
            </div>
            <div className="text-center p-4 bg-background rounded-lg">
              <p className="text-3xl font-bold text-green-600">
                {analytics?.activeMembers || 0}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Active Memberships
              </p>
            </div>
            <div className="text-center p-4 bg-background rounded-lg">
              <p className="text-3xl font-bold text-red-600">
                {analytics?.expiredMembers || 0}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Expired Memberships
              </p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
