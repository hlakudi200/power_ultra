import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { User, Calendar, TrendingUp, Plus, Info, Dumbbell } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { format } from "date-fns";

interface Client {
  id: string;
  member_id: string;
  member_name: string;
  member_email: string;
  assigned_at: string;
  status: string;
  has_active_plan: boolean;
}

interface ClientListProps {
  trainerId: string;
  onCreatePlan: (clientId: string) => void;
}

export function ClientList({ trainerId, onCreatePlan }: ClientListProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (trainerId) {
      fetchClients();
    }
  }, [trainerId]);

  const fetchClients = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get all assignments for this trainer
      const { data: assignments, error: assignmentsError } = await supabase
        .from("trainer_assignments")
        .select(`
          id,
          member_id,
          assigned_at,
          status,
          profiles:member_id (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq("trainer_id", trainerId)
        .eq("status", "active")
        .order("assigned_at", { ascending: false });

      if (assignmentsError) throw assignmentsError;

      // For each assignment, check if they have an active workout plan
      const clientsWithPlans = await Promise.all(
        (assignments || []).map(async (assignment: any) => {
          const profile = Array.isArray(assignment.profiles)
            ? assignment.profiles[0]
            : assignment.profiles;

          // Check for active workout plan
          const { data: planData } = await supabase
            .from("workout_plans")
            .select("id")
            .eq("assignment_id", assignment.id)
            .eq("status", "active")
            .single();

          return {
            id: assignment.id,
            member_id: assignment.member_id,
            member_name: profile
              ? `${profile.first_name} ${profile.last_name}`
              : "Unknown",
            member_email: profile?.email || "",
            assigned_at: assignment.assigned_at,
            status: assignment.status,
            has_active_plan: !!planData,
          };
        })
      );

      setClients(clientsWithPlans);
    } catch (err: any) {
      console.error("Error fetching clients:", err);
      setError(err.message || "Failed to load clients");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <Info className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (clients.length === 0) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          No clients assigned yet. Contact admin to get assigned to members.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {clients.map((client) => (
        <Card
          key={client.id}
          className="bg-background border-border hover:border-primary/50 transition-all"
        >
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4 flex-1">
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold">
                  {client.member_name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </div>

                {/* Client Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-foreground">
                      {client.member_name}
                    </h3>
                    {client.has_active_plan ? (
                      <Badge className="bg-green-500/20 text-green-600 border-green-500/50">
                        Active Plan
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-orange-500/50 text-orange-600">
                        No Plan
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span>{client.member_email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>
                        Since {format(new Date(client.assigned_at), "MMM d, yyyy")}
                      </span>
                    </div>
                  </div>

                  {/* Quick Stats Placeholder */}
                  <div className="mt-3 flex gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      <span className="text-foreground">--% compliance</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Dumbbell className="w-4 h-4 text-primary" />
                      <span className="text-foreground">-- workouts logged</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2">
                {!client.has_active_plan && (
                  <Button
                    onClick={() => onCreatePlan(client.member_id)}
                    className="bg-gradient-primary text-primary-foreground hover:shadow-glow font-bold gap-2"
                    size="sm"
                  >
                    <Plus className="w-4 h-4" />
                    Create Plan
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="border-primary text-primary hover:bg-primary/10"
                >
                  View Details
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
