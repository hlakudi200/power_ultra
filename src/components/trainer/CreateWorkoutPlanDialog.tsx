import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { AddExerciseForm } from "./AddExerciseForm";

interface Exercise {
  day_of_week: string;
  exercise_name: string;
  exercise_type: string;
  sets: number;
  reps: string;
  weight: string;
  rest_seconds: number;
  notes: string;
  order_index: number;
}

interface CreateWorkoutPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trainerId: string;
  clientId?: string; // Made optional for edit mode
  onSuccess: () => void;
  mode?: "create" | "edit";
  planId?: string;
}

export function CreateWorkoutPlanDialog({
  open,
  onOpenChange,
  trainerId,
  clientId,
  onSuccess,
  mode = "create",
  planId,
}: CreateWorkoutPlanDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<"plan" | "exercises">("plan");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [planData, setPlanData] = useState({
    title: "",
    description: "",
    goals: "",
    duration_weeks: 4,
  });

  useEffect(() => {
    if (mode === 'edit' && planId && open) {
      const fetchPlanDetails = async () => {
        setIsSubmitting(true);
        try {
          const { data: plan, error: planError } = await supabase
            .from('workout_plans')
            .select('*')
            .eq('id', planId)
            .single();

          if (planError) throw planError;
          
          const { data: planExercises, error: exercisesError } = await supabase
            .from('workout_exercises')
            .select('*')
            .eq('plan_id', planId);

          if (exercisesError) throw exercisesError;

          setPlanData({
            title: plan.title,
            description: plan.description || "",
            goals: plan.goals || "",
            duration_weeks: plan.duration_weeks,
          });
          setExercises(planExercises || []);

        } catch (error: any) {
          toast({
            title: "Failed to load plan",
            description: error.message,
            variant: "destructive",
          });
        } finally {
          setIsSubmitting(false);
        }
      };
      fetchPlanDetails();
    }
  }, [mode, planId, open]);


  const handlePlanSubmit = () => {
    if (!planData.title) {
      toast({
        title: "Validation Error",
        description: "Please enter a plan title.",
        variant: "destructive",
      });
      return;
    }

    setStep("exercises");
  };

  const handleAddExercise = (exercise: Exercise) => {
    setExercises([...exercises, exercise]);
    toast({
      title: "Exercise Added",
      description: `${exercise.exercise_name} added to ${exercise.day_of_week}`,
    });
  };

  const handleRemoveExercise = (index: number) => {
    setExercises(exercises.filter((_, i) => i !== index));
  };

  const handleFinalSubmit = async () => {
    if (exercises.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please add at least one exercise to the plan.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === 'edit' && planId) {
        // --- EDIT MODE LOGIC ---
        const { error: planUpdateError } = await supabase
          .from('workout_plans')
          .update({
            title: planData.title,
            description: planData.description || null,
            goals: planData.goals || null,
            duration_weeks: planData.duration_weeks,
          })
          .eq('id', planId);

        if (planUpdateError) throw planUpdateError;

        // Replace exercises: delete old, insert new
        await supabase.from('workout_exercises').delete().eq('plan_id', planId);

        const exercisesToInsert = exercises.map((ex) => ({
            plan_id: planId,
            day_of_week: ex.day_of_week,
            exercise_name: ex.exercise_name,
            exercise_type: ex.exercise_type || null,
            sets: ex.sets,
            reps: ex.reps,
            weight: ex.weight || null,
            rest_seconds: ex.rest_seconds,
            notes: ex.notes || null,
            order_index: ex.order_index,
        }));

        const { error: exercisesError } = await supabase
            .from("workout_exercises")
            .insert(exercisesToInsert);
        
        if (exercisesError) throw exercisesError;

        toast({
          title: "Workout Plan Updated!",
          description: `${planData.title} has been successfully updated.`,
        });

      } else {
        // --- CREATE MODE LOGIC ---
        if (!clientId) throw new Error("Client ID is missing for creating a plan.");

        const { data: assignment, error: assignmentError } = await supabase
          .from("trainer_assignments")
          .select("id")
          .eq("member_id", clientId)
          .eq("trainer_id", trainerId)
          .eq("status", "active")
          .single();

        if (assignmentError || !assignment) {
          throw new Error("No active assignment found for this client");
        }

        const { data: plan, error: planError } = await supabase
          .from("workout_plans")
          .insert({
            assignment_id: assignment.id,
            title: planData.title,
            description: planData.description || null,
            goals: planData.goals || null,
            duration_weeks: planData.duration_weeks,
            created_by: trainerId,
            status: "active",
          })
          .select()
          .single();

        if (planError || !plan) {
          throw planError || new Error("Failed to create plan");
        }

        const exercisesToInsert = exercises.map((ex) => ({
          plan_id: plan.id,
          day_of_week: ex.day_of_week,
          exercise_name: ex.exercise_name,
          exercise_type: ex.exercise_type || null,
          sets: ex.sets,
          reps: ex.reps,
          weight: ex.weight || null,
          rest_seconds: ex.rest_seconds,
          notes: ex.notes || null,
          order_index: ex.order_index,
        }));

        const { error: exercisesError } = await supabase
          .from("workout_exercises")
          .insert(exercisesToInsert);

        if (exercisesError) throw exercisesError;

        await supabase.from("notifications").insert({
          user_id: clientId,
          type: "general",
          title: "New Workout Plan Created",
          message: `Your trainer has created a new workout plan: ${planData.title}`,
          related_id: plan.id,
        });

        toast({
          title: "Workout Plan Created!",
          description: `${planData.title} has been created with ${exercises.length} exercises.`,
        });
      }

      onSuccess();
      handleCancel(); // Reset and close the dialog
    } catch (error: any) {
      console.error("Error submitting workout plan:", error);
      toast({
        title: "Submission Failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    setStep("plan");
  };

  const handleCancel = () => {
    setPlanData({
      title: "",
      description: "",
      goals: "",
      duration_weeks: 4,
    });
    setExercises([]);
    setStep("plan");
    onOpenChange(false);
  };

  const groupedExercises = exercises.reduce((acc, ex) => {
    if (!acc[ex.day_of_week]) {
      acc[ex.day_of_week] = [];
    }
    acc[ex.day_of_week].push(ex);
    return acc;
  }, {} as Record<string, Exercise[]>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[95vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl font-black text-foreground">
            {step === "plan" ? "Create Workout Plan" : "Add Exercises"}
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base text-muted-foreground">
            {step === "plan"
              ? "Define the workout plan details"
              : `Added ${exercises.length} exercise(s) to the plan`}
          </DialogDescription>
        </DialogHeader>

        {step === "plan" ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-foreground">
                Plan Title *
              </Label>
              <Input
                id="title"
                value={planData.title}
                onChange={(e) => setPlanData({ ...planData, title: e.target.value })}
                placeholder="e.g., 12-Week Strength Building Program"
                className="bg-background border-border text-foreground"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-foreground">
                Description
              </Label>
              <Textarea
                id="description"
                value={planData.description}
                onChange={(e) => setPlanData({ ...planData, description: e.target.value })}
                placeholder="Brief overview of the program..."
                className="bg-background border-border text-foreground min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="goals" className="text-foreground">
                Client Goals
              </Label>
              <Textarea
                id="goals"
                value={planData.goals}
                onChange={(e) => setPlanData({ ...planData, goals: e.target.value })}
                placeholder="e.g., Build muscle mass, increase strength, improve endurance..."
                className="bg-background border-border text-foreground min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration" className="text-foreground">
                Duration (weeks)
              </Label>
              <Input
                id="duration"
                type="number"
                min="1"
                max="52"
                value={planData.duration_weeks}
                onChange={(e) =>
                  setPlanData({ ...planData, duration_weeks: parseInt(e.target.value) || 4 })
                }
                className="bg-background border-border text-foreground"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* Exercise Summary */}
            {Object.keys(groupedExercises).length > 0 && (
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-foreground mb-2">Exercises Added:</h3>
                <div className="space-y-2">
                  {Object.entries(groupedExercises).map(([day, dayExercises]) => (
                    <div key={day} className="text-sm">
                      <span className="font-semibold text-primary">{day}:</span>{" "}
                      <span className="text-foreground">
                        {dayExercises.map((ex) => ex.exercise_name).join(", ")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add Exercise Form */}
            <AddExerciseForm
              onAddExercise={handleAddExercise}
              existingCount={exercises.length}
            />
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full">
            <Button
              type="button"
              variant="outline"
              onClick={step === "plan" ? handleCancel : handleBack}
              className="w-full sm:flex-1 min-h-[44px] order-2 sm:order-1"
              disabled={isSubmitting}
            >
              {step === "plan" ? "Cancel" : "Back"}
            </Button>
            <Button
              type="button"
              onClick={step === "plan" ? handlePlanSubmit : handleFinalSubmit}
              className="w-full sm:flex-1 min-h-[44px] bg-gradient-primary text-primary-foreground hover:shadow-glow font-bold order-1 sm:order-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : step === "plan" ? (
                "Next: Add Exercises"
              ) : (
                <span className="text-sm sm:text-base">{`Create Plan (${exercises.length} exercises)`}</span>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
