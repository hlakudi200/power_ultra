import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Users, TrendingUp, Calendar, MessageSquare, DollarSign, UserCheck, UserX, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";

// Fetch dashboard stats
const fetchDashboardStats = async () => {
  const { data, error } = await supabase.rpc("get_dashboard_stats");

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

// Fetch recent members
const fetchRecentMembers = async () => {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email, membership_expiry_date, updated_at")
    .order("updated_at", { ascending: false })
    .limit(5);

  if (error) throw new Error(error.message);
  return data;
};

// Fetch recent inquiries
const fetchRecentInquiries = async () => {
  const { data, error } = await supabase
    .from("contact_submissions")
    .select("id, name, email, message, submitted_at, status")
    .order("submitted_at", { ascending: false })
    .limit(5);

  if (error) throw new Error(error.message);
  return data;
};

// Stat card component
interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
  trend?: string;
  color?: string;
}

function StatCard({ title, value, description, icon, trend, color = "primary" }: StatCardProps) {
  const colorClasses = {
    primary: "text-primary bg-primary/10",
    success: "text-green-500 bg-green-500/10",
    warning: "text-yellow-500 bg-yellow-500/10",
    danger: "text-red-500 bg-red-500/10",
    info: "text-blue-500 bg-blue-500/10",
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`p-2 rounded-lg ${colorClasses[color as keyof typeof colorClasses] || colorClasses.primary}`}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-foreground">{value}</div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        {trend && <p className="text-xs text-green-500 mt-2 flex items-center gap-1">
          <TrendingUp className="h-3 w-3" /> {trend}
        </p>}
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();

  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ["dashboardStats"],
    queryFn: fetchDashboardStats,
  });

  const { data: recentMembers, isLoading: membersLoading } = useQuery({
    queryKey: ["recentMembers"],
    queryFn: fetchRecentMembers,
  });

  const { data: recentInquiries, isLoading: inquiriesLoading } = useQuery({
    queryKey: ["recentInquiries"],
    queryFn: fetchRecentInquiries,
  });

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Welcome header */}
        <div>
          <h2 className="text-3xl font-black text-foreground">Dashboard Overview</h2>
          <p className="text-muted-foreground mt-2">
            Welcome back! Here's what's happening with your gym today.
          </p>
        </div>

        {/* Error state */}
        {statsError && (
          <Alert variant="destructive">
            <Info className="h-4 w-4" />
            <AlertTitle>Error Loading Stats</AlertTitle>
            <AlertDescription>
              {statsError instanceof Error ? statsError.message : "Failed to load dashboard statistics"}
            </AlertDescription>
          </Alert>
        )}

        {/* Stats grid */}
        {statsLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-lg" />
            ))}
          </div>
        ) : stats ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Members"
              value={stats.total_members || 0}
              description="All registered members"
              icon={<Users className="h-5 w-5" />}
              color="primary"
            />
            <StatCard
              title="Active Members"
              value={stats.active_members || 0}
              description="With valid memberships"
              icon={<UserCheck className="h-5 w-5" />}
              color="success"
            />
            <StatCard
              title="Expired Memberships"
              value={stats.expired_members || 0}
              description="Need renewal"
              icon={<UserX className="h-5 w-5" />}
              color="warning"
            />
            <StatCard
              title="Total Classes"
              value={stats.total_classes || 0}
              description="Available classes"
              icon={<Calendar className="h-5 w-5" />}
              color="info"
            />
            <StatCard
              title="Bookings Today"
              value={stats.bookings_today || 0}
              description="Classes booked for today"
              icon={<Calendar className="h-5 w-5" />}
              color="primary"
            />
            <StatCard
              title="New This Week"
              value={stats.new_members_this_week || 0}
              description="New members joined"
              icon={<TrendingUp className="h-5 w-5" />}
              color="success"
              trend="+12% from last week"
            />
            <StatCard
              title="New Inquiries"
              value={stats.new_inquiries || 0}
              description="Unread messages"
              icon={<MessageSquare className="h-5 w-5" />}
              color="warning"
            />
          </div>
        ) : null}

        {/* Quick actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks to get you started</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button onClick={() => navigate("/admin/members")} className="gap-2">
              <Users className="h-4 w-4" />
              Manage Members
            </Button>
            <Button onClick={() => navigate("/admin/classes")} variant="outline" className="gap-2">
              <Calendar className="h-4 w-4" />
              Add Class
            </Button>
            <Button onClick={() => navigate("/admin/inquiries")} variant="outline" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              View Inquiries
            </Button>
            <Button onClick={() => navigate("/admin/schedule")} variant="outline" className="gap-2">
              <Calendar className="h-4 w-4" />
              Edit Schedule
            </Button>
          </CardContent>
        </Card>

        {/* Two column layout */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent members */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Members</CardTitle>
              <CardDescription>Latest member registrations</CardDescription>
            </CardHeader>
            <CardContent>
              {membersLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : recentMembers && recentMembers.length > 0 ? (
                <div className="space-y-4">
                  {recentMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/admin/members/${member.id}`)}
                    >
                      <div>
                        <p className="font-medium text-foreground">
                          {member.first_name} {member.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                      </div>
                      <div className="text-right">
                        {member.membership_expiry_date ? (
                          <span className={`text-xs px-2 py-1 rounded ${
                            new Date(member.membership_expiry_date) > new Date()
                              ? "bg-green-500/10 text-green-500"
                              : "bg-red-500/10 text-red-500"
                          }`}>
                            {new Date(member.membership_expiry_date) > new Date() ? "Active" : "Expired"}
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-1 rounded bg-gray-500/10 text-gray-500">
                            No Membership
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate("/admin/members")}
                  >
                    View All Members
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No members yet
                </p>
              )}
            </CardContent>
          </Card>

          {/* Recent inquiries */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Inquiries</CardTitle>
              <CardDescription>Latest contact form submissions</CardDescription>
            </CardHeader>
            <CardContent>
              {inquiriesLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : recentInquiries && recentInquiries.length > 0 ? (
                <div className="space-y-4">
                  {recentInquiries.map((inquiry) => (
                    <div
                      key={inquiry.id}
                      className="p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={() => navigate("/admin/inquiries")}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-foreground">{inquiry.name}</p>
                        <span className={`text-xs px-2 py-1 rounded ${
                          inquiry.status === 'new' ? "bg-yellow-500/10 text-yellow-500" : "bg-gray-500/10 text-gray-500"
                        }`}>
                          {inquiry.status || 'new'}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{inquiry.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(inquiry.submitted_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate("/admin/inquiries")}
                  >
                    View All Inquiries
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No inquiries yet
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
