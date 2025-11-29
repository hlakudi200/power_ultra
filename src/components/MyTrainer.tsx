import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { User, Dumbbell, TrendingUp, Calendar, Info } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useSession } from "@/context/SessionProvider";
import { useNavigate } from "react-router-dom";

interface TrainerInfo {
  assignment_id: string;
  trainer_id: string;
  trainer_name: string;
  trainer_bio: string | null;
  trainer_specializations: string[] | null;
  assigned_at: string;
}

interface WorkoutStats {
  total_exercises: number;
  completed_exercises: number;
  completion_percentage: number;
}

export function MyTrainer() {
  const { session } = useSession();
  const navigate = useNavigate();
  const [trainer, setTrainer] = useState<TrainerInfo | null>(null);
  const [stats, setStats] = useState<WorkoutStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      // Get member's active trainer using the helper function
      const { data: trainerData, error: trainerError } = await supabase
        .rpc("get_member_active_trainer", { p_member_id: session.user.id })
        .single();

      if (trainerError && trainerError.code !== "PGRST116") {
        throw trainerError;
      }

      if (!trainerData) {
        setTrainer(null);
        setIsLoading(false);
        return;
      }

      setTrainer(trainerData);

      // Get active workout plan stats
      const { data: assignmentData } = await supabase
        .from("trainer_assignments")
        .select(`
          id,
          workout_plans!inner (
            id
          )
        `)
        .eq("member_id", session.user.id)
        .eq("status", "active")
        .eq("workout_plans.status", "active")
        .single();

      if (assignmentData?.workout_plans?.[0]?.id) {
        const planId = Array.isArray(assignmentData.workout_plans)
          ? assignmentData.workout_plans[0].id
          : assignmentData.workout_plans.id;

        // Get completion stats
        const { data: statsData, error: statsError } = await supabase
          .rpc("get_workout_completion_stats", {
            p_member_id: session.user.id,
            p_plan_id: planId,
          })
          .single();

        if (!statsError && statsData) {
          setStats(statsData);
        }
      }
    } catch (err: any) {
      console.error("Error fetching trainer info:", err);
      setError(err.message || "Failed to load trainer information");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-card border-border shadow-md">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="flex items-center gap-3 text-2xl font-bold text-foreground">
            <User className="w-6 h-6 text-primary" /> My Trainer
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-card border-border shadow-md">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="flex items-center gap-3 text-2xl font-bold text-foreground">
            <User className="w-6 h-6 text-primary" /> My Trainer
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <Info className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!trainer) {
    return (
      <Card className="bg-card border-border shadow-md">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="flex items-center gap-3 text-2xl font-bold text-foreground">
            <User className="w-6 h-6 text-primary" /> My Trainer
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Get personalized training and workout plans
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Alert className="bg-primary/10 border-primary/30">
            <Info className="h-4 w-4 text-primary" />
            <AlertDescription className="text-foreground">
              You don't have a personal trainer assigned yet. Contact the gym staff to get matched with a trainer!
            </AlertDescription>
          </Alert>
          <Button
            variant="outline"
            className="w-full mt-4 border-primary text-primary hover:bg-primary/10"
            onClick={() => navigate("/contact")}
          >
            Request Personal Trainer
          </Button>
        </CardContent>
      </Card>
    );
  }

  const assignedDate = new Date(trainer.assigned_at);
  const daysSince = Math.floor(
    (new Date().getTime() - assignedDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <Card className="bg-card border-border shadow-md">
      <CardHeader className="border-b border-border pb-4">
        <CardTitle className="flex items-center gap-3 text-2xl font-bold text-foreground">
          <User className="w-6 h-6 text-primary" /> My Trainer
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Your personal fitness coach
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {/* Trainer Info */}
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold text-xl">
            {trainer.trainer_name.split(" ").map((n) => n[0]).join("")}
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-foreground">{trainer.trainer_name}</h3>
            {trainer.trainer_specializations && trainer.trainer_specializations.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {trainer.trainer_specializations.join(", ")}
              </p>
            )}
            {trainer.trainer_bio && (
              <p className="text-sm text-foreground/80 mt-2 line-clamp-2">
                {trainer.trainer_bio}
              </p>
            )}
          </div>
        </div>

        {/* Stats Section */}
        {stats && (
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h4 className="font-semibold text-foreground">This Week's Progress</h4>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-2xl font-bold text-primary">
                  {stats.completed_exercises}/{stats.total_exercises}
                </p>
                <p className="text-xs text-muted-foreground">Exercises Completed</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">
                  {stats.completion_percentage}%
                </p>
                <p className="text-xs text-muted-foreground">Completion Rate</p>
              </div>
            </div>
          </div>
        )}

        {/* Training Duration */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="w-4 h-4" />
          <span>Training together for {daysSince} days</span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            className="flex-1 bg-gradient-primary text-primary-foreground hover:shadow-glow font-bold gap-2"
            onClick={() => navigate("/workout-plan")}
          >
            <Dumbbell className="w-4 h-4" />
            View Workout Plan
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
