import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";

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

interface AddExerciseFormProps {
  onAddExercise: (exercise: Exercise) => void;
  existingCount: number;
}

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const EXERCISE_TYPES = ["strength", "cardio", "flexibility", "sports", "other"];

export function AddExerciseForm({ onAddExercise, existingCount }: AddExerciseFormProps) {
  const [formData, setFormData] = useState({
    day_of_week: "Monday",
    exercise_name: "",
    exercise_type: "strength",
    sets: 3,
    reps: "10",
    weight: "",
    rest_seconds: 60,
    notes: "",
  });

  const handleAdd = () => {
    if (!formData.exercise_name) {
      return;
    }

    onAddExercise({
      ...formData,
      order_index: existingCount,
    });

    // Reset form but keep day and type
    setFormData({
      ...formData,
      exercise_name: "",
      sets: 3,
      reps: "10",
      weight: "",
      rest_seconds: 60,
      notes: "",
    });
  };

  return (
    <div className="border border-border rounded-lg p-4 space-y-4">
      <h4 className="font-semibold text-foreground">Add Exercise</h4>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="day" className="text-foreground">
            Day of Week *
          </Label>
          <Select
            value={formData.day_of_week}
            onValueChange={(value) => setFormData({ ...formData, day_of_week: value })}
          >
            <SelectTrigger className="bg-background border-border text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DAYS_OF_WEEK.map((day) => (
                <SelectItem key={day} value={day}>
                  {day}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="type" className="text-foreground">
            Exercise Type
          </Label>
          <Select
            value={formData.exercise_type}
            onValueChange={(value) => setFormData({ ...formData, exercise_type: value })}
          >
            <SelectTrigger className="bg-background border-border text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EXERCISE_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="exercise_name" className="text-foreground">
          Exercise Name *
        </Label>
        <Input
          id="exercise_name"
          value={formData.exercise_name}
          onChange={(e) => setFormData({ ...formData, exercise_name: e.target.value })}
          placeholder="e.g., Bench Press, Squats, Running"
          className="bg-background border-border text-foreground"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label htmlFor="sets" className="text-foreground">
            Sets
          </Label>
          <Input
            id="sets"
            type="number"
            min="1"
            value={formData.sets}
            onChange={(e) => setFormData({ ...formData, sets: parseInt(e.target.value) || 1 })}
            className="bg-background border-border text-foreground"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="reps" className="text-foreground">
            Reps
          </Label>
          <Input
            id="reps"
            value={formData.reps}
            onChange={(e) => setFormData({ ...formData, reps: e.target.value })}
            placeholder="10 or 8-12"
            className="bg-background border-border text-foreground"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="weight" className="text-foreground">
            Weight
          </Label>
          <Input
            id="weight"
            value={formData.weight}
            onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
            placeholder="135 lbs"
            className="bg-background border-border text-foreground"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="rest" className="text-foreground">
            Rest (sec)
          </Label>
          <Input
            id="rest"
            type="number"
            min="0"
            value={formData.rest_seconds}
            onChange={(e) =>
              setFormData({ ...formData, rest_seconds: parseInt(e.target.value) || 0 })
            }
            className="bg-background border-border text-foreground"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="exercise_notes" className="text-foreground">
          Notes (Optional)
        </Label>
        <Textarea
          id="exercise_notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Form cues, modifications, etc..."
          className="bg-background border-border text-foreground"
          rows={2}
        />
      </div>

      <Button
        type="button"
        onClick={handleAdd}
        disabled={!formData.exercise_name}
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
      >
        <Plus className="w-4 h-4" />
        Add Exercise
      </Button>
    </div>
  );
}
