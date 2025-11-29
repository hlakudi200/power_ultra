import { useState } from "react";
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
import { Loader2, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/context/SessionProvider";
import { supabase } from "@/lib/supabaseClient";

interface Exercise {
  id: string;
  exercise_name: string;
  sets: number | null;
  reps: string | null;
  weight: string | null;
  plan_id: string;
}

interface LogWorkoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercise: Exercise;
  onSuccess: () => void;
}

export function LogWorkoutDialog({
  open,
  onOpenChange,
  exercise,
  onSuccess,
}: LogWorkoutDialogProps) {
  const { session } = useSession();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    sets_completed: exercise.sets || 0,
    reps_completed: 0,
    weight_used: 0,
    duration_minutes: 0,
    notes: "",
    rating: 3,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!session?.user?.id) {
      toast({
        title: "Authentication Required",
        description: "Please log in to log your workout.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Use upsert function to prevent duplicates and track week number
      const { data, error } = await supabase.rpc("upsert_workout_progress", {
        p_member_id: session.user.id,
        p_exercise_id: exercise.id,
        p_plan_id: exercise.plan_id,
        p_sets_completed: formData.sets_completed,
        p_reps_completed: formData.reps_completed,
        p_weight_used: formData.weight_used > 0 ? `${formData.weight_used} lbs` : null,
        p_duration_minutes: formData.duration_minutes > 0 ? formData.duration_minutes : null,
        p_rating: formData.rating,
        p_notes: formData.notes || null,
      });

      if (error) throw error;

      toast({
        title: "Workout Logged!",
        description: `Great job completing ${exercise.exercise_name}! ${formData.weight_used > 0 ? `(${formData.weight_used} lbs)` : ""}`,
      });

      onSuccess();
      onOpenChange(false);

      // Reset form
      setFormData({
        sets_completed: exercise.sets || 0,
        reps_completed: 0,
        weight_used: 0,
        duration_minutes: 0,
        notes: "",
        rating: 3,
      });
    } catch (error: any) {
      toast({
        title: "Failed to Log Workout",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRatingClick = (rating: number) => {
    setFormData({ ...formData, rating });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl font-black text-foreground">
            Log Workout
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base text-muted-foreground">
            Record your performance for <span className="text-primary font-bold">{exercise.exercise_name}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2 sm:py-4">
          {/* Sets and Reps */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sets" className="text-foreground">
                Sets Completed
              </Label>
              <Input
                id="sets"
                type="number"
                min="0"
                value={formData.sets_completed}
                onChange={(e) =>
                  setFormData({ ...formData, sets_completed: parseInt(e.target.value) || 0 })
                }
                className="bg-background border-border text-foreground"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reps" className="text-foreground">
                Reps Completed
              </Label>
              <Input
                id="reps"
                type="number"
                min="0"
                value={formData.reps_completed}
                onChange={(e) =>
                  setFormData({ ...formData, reps_completed: parseInt(e.target.value) || 0 })
                }
                className="bg-background border-border text-foreground"
                required
              />
            </div>
          </div>

          {/* Weight and Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="weight" className="text-foreground">
                Weight Used (lbs)
              </Label>
              <Input
                id="weight"
                type="number"
                min="0"
                step="0.5"
                value={formData.weight_used}
                onChange={(e) =>
                  setFormData({ ...formData, weight_used: parseFloat(e.target.value) || 0 })
                }
                className="bg-background border-border text-foreground"
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration" className="text-foreground">
                Duration (min)
              </Label>
              <Input
                id="duration"
                type="number"
                min="0"
                value={formData.duration_minutes}
                onChange={(e) =>
                  setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 0 })
                }
                className="bg-background border-border text-foreground"
                placeholder="For cardio"
              />
            </div>
          </div>

          {/* Difficulty Rating */}
          <div className="space-y-2">
            <Label className="text-foreground text-sm sm:text-base">Difficulty Rating</Label>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => handleRatingClick(rating)}
                    className={`p-2 sm:p-2.5 rounded-lg transition-all min-w-[44px] min-h-[44px] flex items-center justify-center ${
                      formData.rating >= rating
                        ? "bg-primary text-primary-foreground"
                        : "bg-background border border-border text-muted-foreground hover:border-primary active:scale-95"
                    }`}
                  >
                    <Star
                      className={`w-5 h-5 sm:w-6 sm:h-6 ${formData.rating >= rating ? "fill-current" : ""}`}
                    />
                  </button>
                ))}
              </div>
              <span className="text-xs sm:text-sm text-muted-foreground">
                {formData.rating === 1 && "Too Easy"}
                {formData.rating === 2 && "Easy"}
                {formData.rating === 3 && "Just Right"}
                {formData.rating === 4 && "Challenging"}
                {formData.rating === 5 && "Very Hard"}
              </span>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-foreground">
              Notes (Optional)
            </Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="How did it feel? Any observations?"
              className="bg-background border-border text-foreground min-h-[80px]"
            />
          </div>
        </form>

        <DialogFooter className="gap-2 sm:gap-0">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full sm:flex-1 min-h-[44px]"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              onClick={handleSubmit}
              className="w-full sm:flex-1 min-h-[44px] bg-gradient-primary text-primary-foreground hover:shadow-glow font-bold"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging...
                </>
              ) : (
                "Log Workout"
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
