import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users, Plus, TrendingUp, Info, Dumbbell } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useSession } from "@/context/SessionProvider";
import { useNavigate } from "react-router-dom";
import { ClientList } from "@/components/trainer/ClientList";
import { CreateWorkoutPlanDialog } from "@/components/trainer/CreateWorkoutPlanDialog";

interface TrainerInfo {
  id: string;
  name: string;
  max_clients: number;
  is_personal_trainer: boolean;
}

interface TrainerStats {
  total_active_clients: number;
  total_active_plans: number;
  avg_compliance_percentage: number;
  total_workouts_this_week: number;
}

const TrainerDashboard = () => {
  const { session } = useSession();
  const navigate = useNavigate();
  const [trainer, setTrainer] = useState<TrainerInfo | null>(null);
  const [stats, setStats] = useState<TrainerStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createPlanOpen, setCreatePlanOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user?.id) {
      fetchTrainerInfo();
    }
  }, [session?.user?.id]);

  const fetchTrainerInfo = async () => {
    if (!session?.user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      // Get trainer info from instructors table
      const { data: trainerData, error: trainerError } = await supabase
        .from("instructors")
        .select("id, name, max_clients, is_personal_trainer")
        .eq("user_id", session.user.id)
        .eq("is_personal_trainer", true)
        .single();

      if (trainerError) {
        if (trainerError.code === "PGRST116") {
          setError("You are not registered as a personal trainer. Contact admin.");
        } else {
          throw trainerError;
        }
        setIsLoading(false);
        return;
      }

      setTrainer(trainerData);

      // Get dashboard statistics
      const { data: statsData, error: statsError } = await supabase.rpc(
        "get_trainer_dashboard_stats",
        { p_trainer_id: trainerData.id }
      );

      if (statsError) {
        console.error("Error fetching trainer stats:", statsError);
      } else if (statsData && statsData.length > 0) {
        setStats(statsData[0]);
      }
    } catch (err: any) {
      console.error("Error fetching trainer info:", err);
      setError(err.message || "Failed to load trainer information");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePlan = (clientId: string) => {
    setSelectedClientId(clientId);
    setCreatePlanOpen(true);
  };

  const handlePlanCreated = () => {
    setCreatePlanOpen(false);
    setSelectedClientId(null);
    // Refresh trainer info to update stats
    fetchTrainerInfo();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-dark py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (error || !trainer) {
    return (
      <div className="min-h-screen bg-gradient-dark py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <Alert variant="destructive">
            <Info className="h-4 w-4" />
            <AlertDescription>
              {error || "Not authorized to access trainer dashboard"}
            </AlertDescription>
          </Alert>
          <Button
            onClick={() => navigate("/dashboard")}
            variant="outline"
            className="mt-4"
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const clientCount = stats?.total_active_clients || 0;
  const capacityPercentage = Math.round((clientCount / trainer.max_clients) * 100);
  const isNearCapacity = capacityPercentage >= 80;
  const isAtCapacity = clientCount >= trainer.max_clients;

  return (
    <div className="min-h-screen bg-gradient-dark py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="relative p-6 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-xl shadow-strong border border-border overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[url('/hero-gym.jpg')] bg-cover bg-center"></div>
          <div className="relative z-10">
            <h1 className="text-4xl md:text-5xl font-black text-foreground mb-2">
              Trainer <span className="text-primary">Dashboard</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Welcome back, {trainer.name}
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Client Count */}
          <Card className="bg-card border-border shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Users className="w-5 h-5 text-primary" />
                Active Clients
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-primary mb-2">
                {clientCount} / {trainer.max_clients}
              </div>
              <div className="w-full bg-secondary/20 rounded-full h-2 mb-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    isAtCapacity
                      ? "bg-destructive"
                      : isNearCapacity
                      ? "bg-orange-500"
                      : "bg-primary"
                  }`}
                  style={{ width: `${Math.min(capacityPercentage, 100)}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {isAtCapacity
                  ? "At full capacity"
                  : isNearCapacity
                  ? "Nearing capacity"
                  : `${trainer.max_clients - clientCount} spots available`}
              </p>
            </CardContent>
          </Card>

          {/* Active Plans */}
          <Card className="bg-card border-border shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Dumbbell className="w-5 h-5 text-primary" />
                Active Plans
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-primary mb-2">
                {stats?.total_active_plans || 0}
              </div>
              <p className="text-sm text-muted-foreground">
                Workout plans in progress
              </p>
            </CardContent>
          </Card>

          {/* Compliance */}
          <Card className="bg-card border-border shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <TrendingUp className="w-5 h-5 text-primary" />
                Avg Compliance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-primary mb-2">
                {stats?.avg_compliance_percentage?.toFixed(1) || "0"}%
              </div>
              <p className="text-sm text-muted-foreground">
                Client workout completion (7 days)
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Client List */}
        <Card className="bg-card border-border shadow-md">
          <CardHeader className="border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-3 text-2xl font-bold text-foreground">
                  <Users className="w-6 h-6 text-primary" />
                  My Clients
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Manage your assigned clients and their workout plans
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {trainer.id && (
              <ClientList
                trainerId={trainer.id}
                onCreatePlan={handleCreatePlan}
              />
            )}
          </CardContent>
        </Card>

        {/* Create Workout Plan Dialog */}
        {selectedClientId && trainer.id && (
          <CreateWorkoutPlanDialog
            open={createPlanOpen}
            onOpenChange={setCreatePlanOpen}
            trainerId={trainer.id}
            clientId={selectedClientId}
            onSuccess={handlePlanCreated}
          />
        )}
      </div>
    </div>
  );
};

export default TrainerDashboard;
