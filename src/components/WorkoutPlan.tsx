import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dumbbell, Clock, TrendingUp, Info, CheckCircle2, Circle, Timer } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useSession } from "@/context/SessionProvider";
import { LogWorkoutDialog } from "./LogWorkoutDialog";

interface WorkoutPlan {
  id: string;
  title: string;
  description: string | null;
  goals: string | null;
  duration_weeks: number;
  status: string;
  start_date: string;
  current_week: number;
}

interface Exercise {
  id: string;
  plan_id: string;
  day_of_week: string;
  exercise_name: string;
  exercise_type: string | null;
  sets: number | null;
  reps: string | null;
  weight: string | null;
  rest_seconds: number;
  notes: string | null;
  order_index: number;
  is_completed?: boolean;
}

interface WeekStats {
  total_exercises: number;
  completed_exercises: number;
  completion_percentage: number;
  week_start: string;
  week_end: string;
}

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function WorkoutPlan() {
  const { session } = useSession();
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [weekStats, setWeekStats] = useState<WeekStats | null>(null);
  const [selectedDay, setSelectedDay] = useState(DAYS_OF_WEEK[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);

  useEffect(() => {
    if (session?.user?.id) {
      fetchWorkoutPlan();
    }
  }, [session?.user?.id]);

  const fetchWorkoutPlan = async () => {
    if (!session?.user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      // Get active assignment
      const { data: assignment, error: assignmentError } = await supabase
        .from("trainer_assignments")
        .select("id")
        .eq("member_id", session.user.id)
        .eq("status", "active")
        .single();

      if (assignmentError || !assignment) {
        setPlan(null);
        setIsLoading(false);
        return;
      }

      // Get active workout plan
      const { data: planData, error: planError } = await supabase
        .from("workout_plans")
        .select("*")
        .eq("assignment_id", assignment.id)
        .eq("status", "active")
        .single();

      if (planError || !planData) {
        setPlan(null);
        setIsLoading(false);
        return;
      }

      setPlan(planData);

      // Get week completion stats
      const { data: statsData } = await supabase.rpc("get_week_completion_stats", {
        p_member_id: session.user.id,
        p_plan_id: planData.id,
        p_week_number: planData.current_week,
      });

      if (statsData && statsData.length > 0) {
        setWeekStats(statsData[0]);
      }

      // Get all exercises for this plan
      const { data: exercisesData, error: exercisesError } = await supabase
        .from("workout_exercises")
        .select("*")
        .eq("plan_id", planData.id)
        .order("day_of_week")
        .order("order_index");

      if (exercisesError) throw exercisesError;

      // Check which exercises have been completed this week
      if (statsData && statsData.length > 0) {
        const weekStart = statsData[0].week_start;
        const weekEnd = statsData[0].week_end;

        const { data: progressData } = await supabase
          .from("workout_progress")
          .select("exercise_id, completed_at")
          .eq("member_id", session.user.id)
          .gte("completed_at", `${weekStart}T00:00:00`)
          .lte("completed_at", `${weekEnd}T23:59:59`);

        const completedExerciseIds = new Set(progressData?.map((p) => p.exercise_id) || []);

        const exercisesWithCompletion = (exercisesData || []).map((ex) => ({
          ...ex,
          is_completed: completedExerciseIds.has(ex.id),
        }));

        setExercises(exercisesWithCompletion);
      } else {
        setExercises(exercisesData || []);
      }
    } catch (err: any) {
      console.error("Error fetching workout plan:", err);
      setError(err.message || "Failed to load workout plan");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogWorkout = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setLogDialogOpen(true);
  };

  const handleWorkoutLogged = () => {
    setLogDialogOpen(false);
    fetchWorkoutPlan(); // Refresh to update completion status
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
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

  if (!plan) {
    return (
      <Card className="bg-card border-border shadow-md">
        <CardContent className="pt-6">
          <Alert className="bg-primary/10 border-primary/30">
            <Info className="h-4 w-4 text-primary" />
            <AlertDescription className="text-foreground">
              No active workout plan found. Your trainer will create a personalized plan for you soon!
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const exercisesForDay = exercises.filter((ex) => ex.day_of_week === selectedDay);
  const completedToday = exercisesForDay.filter((ex) => ex.is_completed).length;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="space-y-6">
      {/* Plan Header */}
      <Card className="bg-gradient-to-br from-primary/20 to-secondary/20 border-border shadow-strong">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <CardTitle className="text-3xl font-black text-foreground">
                  {plan.title}
                </CardTitle>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary">
                  Week {plan.current_week} of {plan.duration_weeks}
                </Badge>
              </div>
              {plan.description && (
                <CardDescription className="text-foreground/80 text-base">
                  {plan.description}
                </CardDescription>
              )}
              {weekStats && (
                <div className="mt-3 text-sm text-foreground/70">
                  {formatDate(weekStats.week_start)} - {formatDate(weekStats.week_end)}
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {plan.goals && (
            <div className="bg-card/50 rounded-lg p-4 border border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">Goals</h3>
              </div>
              <p className="text-sm text-foreground/80">{plan.goals}</p>
            </div>
          )}

          {/* Week Progress */}
          {weekStats && (
            <div className="bg-card/50 rounded-lg p-4 border border-border/50">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-foreground">This Week's Progress</h3>
                <span className="text-2xl font-black text-primary">
                  {Math.round(weekStats.completion_percentage)}%
                </span>
              </div>
              <div className="w-full bg-secondary/20 rounded-full h-3 mb-2">
                <div
                  className="bg-gradient-primary h-3 rounded-full transition-all duration-500"
                  style={{ width: `${weekStats.completion_percentage}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {weekStats.completed_exercises} of {weekStats.total_exercises} exercises completed
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Workout Schedule */}
      <Card className="bg-card border-border shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl font-bold text-foreground">
            <Dumbbell className="w-6 h-6 text-primary" /> Weekly Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedDay} onValueChange={setSelectedDay}>
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 md:grid-cols-7 mb-6 bg-card/50 h-auto flex-wrap">
              {DAYS_OF_WEEK.map((day) => {
                const dayExercises = exercises.filter((ex) => ex.day_of_week === day);
                const completed = dayExercises.filter((ex) => ex.is_completed).length;
                const hasExercises = dayExercises.length > 0;

                return (
                  <TabsTrigger
                    key={day}
                    value={day}
                    className="text-sm font-bold data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground py-3 relative"
                  >
                    {day.slice(0, 3)}
                    {hasExercises && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full text-xs flex items-center justify-center text-primary-foreground">
                        {dayExercises.length}
                      </span>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {DAYS_OF_WEEK.map((day) => (
              <TabsContent key={day} value={day} className="space-y-4">
                {exercisesForDay.length === 0 ? (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Rest day - No exercises scheduled for {day}
                    </AlertDescription>
                  </Alert>
                ) : (
                  <>
                    {/* Progress indicator */}
                    <div className="flex items-center justify-between p-4 bg-primary/10 border border-primary/20 rounded-lg">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                        <span className="font-semibold text-foreground">
                          Progress: {completedToday}/{exercisesForDay.length} exercises
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {Math.round((completedToday / exercisesForDay.length) * 100)}%
                      </span>
                    </div>

                    {/* Exercise list */}
                    {exercisesForDay.map((exercise, index) => (
                      <Card
                        key={exercise.id}
                        className={`${
                          exercise.is_completed
                            ? "bg-green-500/10 border-green-500/30"
                            : "bg-card border-border"
                        } transition-all`}
                      >
                        <CardContent className="p-3 sm:p-4">
                          <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                            <div className="flex-1 w-full">
                              <div className="flex items-center gap-2 sm:gap-3 mb-2">
                                <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs sm:text-sm shrink-0">
                                  {index + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-bold text-base sm:text-lg text-foreground truncate">
                                    {exercise.exercise_name}
                                  </h4>
                                  {exercise.exercise_type && (
                                    <Badge variant="outline" className="text-xs mt-1">
                                      {exercise.exercise_type}
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2 sm:gap-3 mt-3">
                                {exercise.sets && (
                                  <div className="flex items-center gap-2">
                                    <Dumbbell className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-sm text-foreground">
                                      <strong>{exercise.sets}</strong> sets
                                    </span>
                                  </div>
                                )}
                                {exercise.reps && (
                                  <div className="flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-sm text-foreground">
                                      <strong>{exercise.reps}</strong> reps
                                    </span>
                                  </div>
                                )}
                                {exercise.weight && (
                                  <div className="flex items-center gap-2">
                                    <Circle className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-sm text-foreground">
                                      <strong>{exercise.weight}</strong>
                                    </span>
                                  </div>
                                )}
                                {exercise.rest_seconds && (
                                  <div className="flex items-center gap-2">
                                    <Timer className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-sm text-foreground">
                                      <strong>{exercise.rest_seconds}s</strong> rest
                                    </span>
                                  </div>
                                )}
                              </div>

                              {exercise.notes && (
                                <p className="text-sm text-muted-foreground mt-3 italic">
                                  Note: {exercise.notes}
                                </p>
                              )}
                            </div>

                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto mt-3 sm:mt-0">
                              {exercise.is_completed && (
                                <div className="flex items-center gap-1.5 text-green-600 text-sm font-semibold px-3 py-2 bg-green-500/10 rounded-md">
                                  <CheckCircle className="w-4 h-4" />
                                  <span className="hidden sm:inline">Completed</span>
                                  <span className="sm:hidden">Done</span>
                                </div>
                              )}
                              <Button
                                onClick={() => handleLogWorkout(exercise)}
                                disabled={exercise.is_completed}
                                variant={exercise.is_completed ? "outline" : "default"}
                                size="sm"
                                className={`w-full sm:w-auto min-h-[44px] ${
                                  exercise.is_completed
                                    ? "bg-green-500/20 border-green-500 text-green-600 hover:bg-green-500/30"
                                    : "bg-gradient-primary text-primary-foreground hover:shadow-glow font-bold"
                                }`}
                              >
                                {exercise.is_completed ? (
                                  <span className="flex items-center justify-center gap-2">
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span className="hidden sm:inline">Done</span>
                                    <span className="sm:hidden">Update</span>
                                  </span>
                                ) : (
                                  "Log Workout"
                                )}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Log Workout Dialog */}
      {selectedExercise && (
        <LogWorkoutDialog
          open={logDialogOpen}
          onOpenChange={setLogDialogOpen}
          exercise={selectedExercise}
          onSuccess={handleWorkoutLogged}
        />
      )}
    </div>
  );
}
