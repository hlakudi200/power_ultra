import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Mail,
  Calendar,
  TrendingUp,
  Dumbbell,
  Flame,
  Send,
  Weight,
  Repeat,
  Clock,
  Pencil,
  Archive,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabaseClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useSession } from "@/context/SessionProvider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CreateWorkoutPlanDialog } from "@/components/trainer/CreateWorkoutPlanDialog";
import { format, formatDistanceToNow, parseISO, startOfWeek } from "date-fns";

type ClientData = {
  id: string;
  member_id: string;
  assigned_at: string;
  profile: {
    first_name: string;
    last_name: string;
    email: string;
  } | null;
};

type ClientStats = {
  compliance_percentage: number;
  workouts_logged: number;
  current_streak: number;
};

type TrainerNote = {
  id: string;
  note: string;
  created_at: string;
  trainer: {
    user_id: string;
    profiles: {
      first_name: string | null;
      last_name: string | null;
    } | null;
  } | null;
};

type WorkoutPlan = {
  id: string;
  title: string;
  description: string;
  duration_weeks: number;
  start_date: string;
};

type WorkoutExercise = {
  id: string;
  day_of_week: string;
  exercise_name: string;
  exercise_type: string;
  sets: number;
  reps: string;
  weight: string;
  rest_seconds: number;
  notes: string;
  order_index: number;
};

type WorkoutProgress = {
  id: string;
  completed_at: string;
  sets_completed: number;
  reps_completed: number;
  weight_used: number;
  notes: string;
  workout_exercises: {
    exercise_name: string;
  } | null;
};

const ClientDetailView = () => {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const { session } = useSession();

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [client, setClient] = useState<ClientData | null>(null);
  const [stats, setStats] = useState<ClientStats | null>(null);
  const [notes, setNotes] = useState<TrainerNote[]>([]);
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [progress, setProgress] = useState<WorkoutProgress[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [isNotesLoading, setIsNotesLoading] = useState(true);
  const [isPlanLoading, setIsPlanLoading] = useState(true);
  const [isProgressLoading, setIsProgressLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkoutPlan = async () => {
    if (!assignmentId) return;
    setIsPlanLoading(true);
    try {
      const { data: planData, error: planError } = await supabase
        .from("workout_plans")
        .select(`*`)
        .eq("assignment_id", assignmentId)
        .eq("status", "active")
        .single();
      if (planError) {
        if (planError.code === "PGRST116") {
          setPlan(null);
          setExercises([]);
          return;
        }
        throw planError;
      }
      setPlan(planData);
      if (planData) {
        const { data: exerciseData, error: exerciseError } = await supabase
          .from("workout_exercises")
          .select(`*`)
          .eq("plan_id", planData.id)
          .order("order_index");
        if (exerciseError) throw exerciseError;
        setExercises(exerciseData);
      }
    } catch (err: any) {
      console.error("Error fetching workout plan:", err);
    } finally {
      setIsPlanLoading(false);
    }
  };

  const fetchClientData = async () => {
    if (!assignmentId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("trainer_assignments")
        .select(
          `id, member_id, assigned_at, profile:profiles!member_id(first_name, last_name, email)`
        )
        .eq("id", assignmentId)
        .single();
      if (error) throw error;
      setClient(data);
      if (data && data.member_id) {
        fetchClientStats(data.id, data.member_id);
        fetchTrainerNotes();
        fetchWorkoutPlan();
        fetchProgressHistory(data.member_id);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load client details.");
      console.error("Error fetching client details:", err);
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchClientStats = async (p_assignment_id: string, p_member_id: string) => {
    setIsStatsLoading(true);
    try {
      const { data, error } = await supabase
        .rpc("get_client_stats", { p_assignment_id, p_member_id })
        .single();
      if (error) throw error;
      setStats(data);
    } catch (err: any) {
      console.error("Error fetching client stats:", err);
    } finally {
      setIsStatsLoading(false);
    }
  };

  const fetchTrainerNotes = async () => {
    if (!assignmentId) return;
    setIsNotesLoading(true);
    try {
      const { data, error } = await supabase
        .from("trainer_client_notes")
        .select(
          `id, note, created_at, trainer:instructors(user_id, profiles(first_name, last_name))`
        )
        .eq("assignment_id", assignmentId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setNotes(data || []);
    } catch (err: any) {
      console.error("Error fetching trainer notes:", err);
    } finally {
      setIsNotesLoading(false);
    }
  };
  
  const fetchProgressHistory = async (member_id: string) => {
    setIsProgressLoading(true);
    try {
      const { data, error } = await supabase
        .from("workout_progress")
        .select(
          `id, completed_at, sets_completed, reps_completed, weight_used, notes, workout_exercises ( exercise_name )`
        )
        .eq("member_id", member_id)
        .order("completed_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setProgress(data || []);
    } catch (err: any) {
      console.error("Error fetching progress history:", err);
    } finally {
      setIsProgressLoading(false);
    }
  };

  useEffect(() => {
    fetchClientData();
  }, [assignmentId]);

  const archivePlan = async () => {
    if (!plan) return;
    try {
      const { error } = await supabase
        .from("workout_plans")
        .update({ status: "archived" })
        .eq("id", plan.id);
      if (error) throw error;
      fetchWorkoutPlan();
    } catch (err) {
      console.error("Error archiving plan:", err);
    }
  };

  const ClientInfo = () => {
    if (isLoading) return <Skeleton className="h-48 w-full" />;
    if (error)
      return (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      );
    if (!client || !client.profile) return <p>No client data found.</p>;
    const { first_name, last_name, email } = client.profile;
    const fullName = `${first_name} ${last_name}`;
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-primary text-3xl font-bold text-primary-foreground">
            {first_name[0]}
            {last_name[0]}
          </div>
          <div>
            <h2 className="text-2xl font-bold">{fullName}</h2>
            <p className="text-muted-foreground">Client</p>
          </div>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="h-4 w-4" />
            <span>{email}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              Training since{" "}
              {format(new Date(client.assigned_at), "MMMM d, yyyy")}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const KeyStats = () => {
    if (isStatsLoading)
      return (
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      );
    if (!stats)
      return (
        <p className="text-sm text-muted-foreground">
          Stats could not be loaded.
        </p>
      );
    return (
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="rounded-lg bg-background p-4">
          <TrendingUp className="mx-auto mb-2 h-6 w-6 text-primary" />
          <p className="text-2xl font-bold">{stats.compliance_percentage}%</p>
          <p className="text-xs text-muted-foreground">Compliance</p>
        </div>
        <div className="rounded-lg bg-background p-4">
          <Dumbbell className="mx-auto mb-2 h-6 w-6 text-primary" />
          <p className="text-2xl font-bold">{stats.workouts_logged}</p>
          <p className="text-xs text-muted-foreground">Workouts</p>
        </div>
        <div className="rounded-lg bg-background p-4">
          <Flame className="mx-auto mb-2 h-6 w-6 text-primary" />
          <p className="text-2xl font-bold">{stats.current_streak}</p>
          <p className="text-xs text-muted-foreground">Streak</p>
        </div>
      </div>
    );
  };

  const TrainerNotes = () => {
    const [newNote, setNewNote] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const handleAddNote = async () => {
      if (!newNote.trim() || !assignmentId || !session) return;
      setIsSubmitting(true);
      try {
        const { data: instructor } = await supabase
          .from("instructors")
          .select("id")
          .eq("user_id", session.user.id)
          .single();
        if (!instructor) throw new Error("Could not find trainer profile.");
        const { error } = await supabase
          .from("trainer_client_notes")
          .insert({
            note: newNote,
            assignment_id: assignmentId,
            trainer_id: instructor.id,
          });
        if (error) throw error;
        setNewNote("");
        fetchTrainerNotes();
      } catch (err: any) {
        console.error("Error adding note:", err);
      } finally {
        setIsSubmitting(false);
      }
    };
    const getInitials = (firstName: string | null, lastName: string | null) =>
      `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
    if (isNotesLoading) return <Skeleton className="h-40 w-full" />;
    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          <Textarea
            placeholder="Add a new note about the client..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            disabled={isSubmitting}
          />
          <Button
            onClick={handleAddNote}
            disabled={isSubmitting || !newNote.trim()}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <div className="max-h-96 space-y-4 overflow-y-auto">
          {notes.map((note) => (
            <div key={note.id} className="flex items-start gap-3">
              <Avatar>
                <AvatarFallback>
                  {getInitials(
                    note.trainer?.profiles?.first_name || null,
                    note.trainer?.profiles?.last_name || null
                  )}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 rounded-lg bg-background p-3">
                <p className="text-sm">{note.note}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(note.created_at), {
                    addSuffix: true,
                  })}
                </p>
              </div>
            </div>
          ))}
          {notes.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No notes yet.
            </p>
          )}
        </div>
      </div>
    );
  };

  const WeeklySchedule = () => {
    if (isPlanLoading) return <Skeleton className="h-96 w-full" />;
    if (!plan)
      return (
        <div className="py-16 text-center">
          <p>No active workout plan found for this client.</p>
          <Button className="mt-4" onClick={() => setIsEditDialogOpen(true)}>Create Plan</Button>
        </div>
      );
    const daysOfWeek = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];
    const groupedExercises = daysOfWeek.reduce((acc, day) => {
      const dayExercises = exercises.filter((ex) => ex.day_of_week === day);
      if (dayExercises.length > 0) acc[day] = dayExercises;
      return acc;
    }, {} as Record<string, WorkoutExercise[]>);
    return (
      <Accordion type="single" collapsible className="w-full">
        {Object.entries(groupedExercises).map(([day, dayExercises]) => (
          <AccordionItem value={day} key={day}>
            <AccordionTrigger className="text-lg font-semibold">
              {day}
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4">
                {dayExercises.map((ex) => (
                  <div key={ex.id} className="rounded-md border p-4">
                    <p className="font-bold">{ex.exercise_name}</p>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-muted-foreground sm:grid-cols-4">
                      <div className="flex items-center gap-1">
                        <Dumbbell className="h-4 w-4 text-primary" />
                        <span>{ex.sets} sets</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Repeat className="h-4 w-4 text-primary" />
                        <span>{ex.reps} reps</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Weight className="h-4 w-4 text-primary" />
                        <span>{ex.weight}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-primary" />
                        <span>{ex.rest_seconds}s rest</span>
                      </div>
                    </div>
                    {ex.notes && (
                      <p className="mt-2 text-xs italic">Note: {ex.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    );
  };
  
  const ProgressHistory = () => {
    if (isProgressLoading) return <Skeleton className="h-96 w-full" />;
    if (progress.length === 0)
      return (
        <div className="py-16 text-center">
          <p>No workouts have been logged yet.</p>
        </div>
      );
    const groupedByDate = progress.reduce((acc, log) => {
      const date = format(parseISO(log.completed_at), "MMMM d, yyyy");
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(log);
      return acc;
    }, {} as Record<string, WorkoutProgress[]>);
    return (
      <div className="space-y-6">
        {Object.entries(groupedByDate).map(([date, logs]) => (
          <div key={date}>
            <h3 className="mb-2 font-semibold">{date}</h3>
            <div className="space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="rounded-md border p-3 text-sm">
                  <p className="font-bold">
                    {log.workout_exercises?.exercise_name || "Unknown Exercise"}
                  </p>
                  <p className="text-muted-foreground">
                    {log.sets_completed} sets, {log.reps_completed} reps @{" "}
                    {log.weight_used} lbs
                  </p>
                  {log.notes && (
                    <p className="mt-1 text-xs italic">
                      Client Note: {log.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const Charts = () => {
    if (isProgressLoading) return <Skeleton className="h-96 w-full" />;
    if (progress.length === 0)
      return (
        <div className="py-16 text-center">
          <p>Not enough data to display charts.</p>
        </div>
      );
    const weeklyData = progress.reduce((acc, log) => {
      const weekStart = format(startOfWeek(parseISO(log.completed_at)), "MMM d");
      if (!acc[weekStart]) {
        acc[weekStart] = 0;
      }
      acc[weekStart]++;
      return acc;
    }, {} as Record<string, number>);
    const chartData = Object.entries(weeklyData)
      .map(([week, count]) => ({ week, workouts: count }))
      .reverse();
    const exerciseLogs = progress
      .filter((p) =>
        p.workout_exercises?.exercise_name.toLowerCase().includes("bench press")
      )
      .map((p) => ({
        date: format(parseISO(p.completed_at), "MMM d"),
        volume: p.sets_completed * p.reps_completed * p.weight_used,
      }))
      .reverse();
    return (
      <div className="space-y-8">
        <div>
          <h4 className="mb-4 font-semibold">Weekly Workouts Logged</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="workouts" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div>
          <h4 className="mb-4 font-semibold">
            Volume Progression (Bench Press)
          </h4>
          {exerciseLogs.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={exerciseLogs}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="volume"
                  stroke="#ef4444"
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No "Bench Press" workouts logged to show volume.
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="container mx-auto px-4 py-8 pt-20">
        <div className="mb-8 flex items-center justify-between">
          <Button asChild variant="outline" size="sm">
            <Link to="/trainer-dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>

          {plan && !isPlanLoading && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditDialogOpen(true)}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit Plan
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Archive className="mr-2 h-4 w-4" />
                    Archive Plan
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will archive the current workout plan. The client will
                      no longer see it as their active plan. This action cannot be
                      undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={archivePlan}>
                      Confirm
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Client Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <ClientInfo />
                <KeyStats />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Trainer Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <TrainerNotes />
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Workout Details</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="schedule" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="schedule">Weekly Schedule</TabsTrigger>
                    <TabsTrigger value="history">Progress History</TabsTrigger>
                    <TabsTrigger value="charts">Charts</TabsTrigger>
                  </TabsList>
                  <TabsContent value="schedule" className="mt-6">
                    <WeeklySchedule />
                  </TabsContent>
                  <TabsContent value="history" className="mt-6">
                    <ProgressHistory />
                  </TabsContent>
                  <TabsContent value="charts" className="mt-6">
                    <Charts />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      {plan && session && (
        <CreateWorkoutPlanDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          trainerId={session.user.id}
          onSuccess={() => {
            fetchWorkoutPlan();
            setIsEditDialogOpen(false);
          }}
          mode="edit"
          planId={plan.id}
          clientId={client?.member_id}
        />
      )}
    </>
  );
};

export default ClientDetailView;
