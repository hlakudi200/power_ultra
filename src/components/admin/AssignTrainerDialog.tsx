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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Loader2, Info, Users, Award, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";

interface Trainer {
  id: string;
  name: string;
  specializations: string[];
  certifications: string[];
  max_clients: number;
  current_clients: number;
  bio: string | null;
}

interface AssignTrainerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
  memberName: string;
  onSuccess: () => void;
}

export function AssignTrainerDialog({
  open,
  onOpenChange,
  memberId,
  memberName,
  onSuccess,
}: AssignTrainerDialogProps) {
  const { toast } = useToast();
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [selectedTrainerId, setSelectedTrainerId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasActiveAssignment, setHasActiveAssignment] = useState(false);

  useEffect(() => {
    if (open) {
      fetchTrainersAndCheckAssignment();
    }
  }, [open, memberId]);

  const fetchTrainersAndCheckAssignment = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Check if member already has an active trainer assignment
      const { data: existingAssignment } = await supabase
        .from("trainer_assignments")
        .select("id, instructors:trainer_id (name)")
        .eq("member_id", memberId)
        .eq("status", "active")
        .maybeSingle();

      if (existingAssignment) {
        setHasActiveAssignment(true);
        const trainerName = Array.isArray(existingAssignment.instructors)
          ? existingAssignment.instructors[0]?.name
          : existingAssignment.instructors?.name;
        setError(`${memberName} is already assigned to trainer: ${trainerName || "Unknown"}`);
        setIsLoading(false);
        return;
      }

      // Fetch all personal trainers
      const { data: trainersData, error: trainersError } = await supabase
        .from("instructors")
        .select("id, name, specializations, certifications, max_clients, bio")
        .eq("is_personal_trainer", true)
        .order("name");

      if (trainersError) throw trainersError;

      // Get client count for each trainer
      const trainersWithCounts = await Promise.all(
        (trainersData || []).map(async (trainer) => {
          const { data: clientCount } = await supabase.rpc("get_trainer_client_count", {
            p_trainer_id: trainer.id,
          });

          return {
            ...trainer,
            specializations: trainer.specializations || [],
            certifications: trainer.certifications || [],
            current_clients: clientCount || 0,
          };
        })
      );

      // Sort by availability (least full first)
      trainersWithCounts.sort((a, b) => {
        const aCapacity = (a.current_clients / a.max_clients) * 100;
        const bCapacity = (b.current_clients / b.max_clients) * 100;
        return aCapacity - bCapacity;
      });

      setTrainers(trainersWithCounts);
    } catch (err: any) {
      console.error("Error fetching trainers:", err);
      setError(err.message || "Failed to load trainers");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedTrainerId) {
      toast({
        title: "Validation Error",
        description: "Please select a trainer",
        variant: "destructive",
      });
      return;
    }

    const selectedTrainer = trainers.find((t) => t.id === selectedTrainerId);
    if (!selectedTrainer) return;

    // Check capacity
    if (selectedTrainer.current_clients >= selectedTrainer.max_clients) {
      toast({
        title: "Capacity Exceeded",
        description: `${selectedTrainer.name} is at full capacity (${selectedTrainer.max_clients} clients)`,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Create trainer assignment
      const { error: assignmentError } = await supabase
        .from("trainer_assignments")
        .insert({
          member_id: memberId,
          trainer_id: selectedTrainerId,
          status: "active",
        });

      if (assignmentError) throw assignmentError;

      // Create notification for member
      await supabase.from("notifications").insert({
        user_id: memberId,
        type: "general",
        title: "Personal Trainer Assigned",
        message: `You have been assigned to trainer ${selectedTrainer.name}. They will create a personalized workout plan for you soon.`,
      });

      toast({
        title: "Trainer Assigned Successfully",
        description: `${memberName} has been assigned to ${selectedTrainer.name}`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Error assigning trainer:", err);
      toast({
        title: "Assignment Failed",
        description: err.message || "Failed to assign trainer. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCapacityColor = (current: number, max: number) => {
    const percentage = (current / max) * 100;
    if (percentage >= 100) return "text-destructive";
    if (percentage >= 80) return "text-orange-500";
    return "text-green-600";
  };

  const getCapacityBadge = (current: number, max: number) => {
    const percentage = (current / max) * 100;
    if (percentage >= 100) return { text: "Full", variant: "destructive" as const };
    if (percentage >= 80) return { text: "Almost Full", variant: "secondary" as const };
    return { text: "Available", variant: "default" as const };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-foreground">
            Assign Trainer to {memberName}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Select a personal trainer to assign to this member
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : error ? (
            <Alert variant={hasActiveAssignment ? "default" : "destructive"}>
              <Info className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : trainers.length === 0 ? (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                No personal trainers available. Please add trainers first.
              </AlertDescription>
            </Alert>
          ) : (
            <RadioGroup value={selectedTrainerId} onValueChange={setSelectedTrainerId}>
              <div className="space-y-3">
                {trainers.map((trainer) => {
                  const isAtCapacity = trainer.current_clients >= trainer.max_clients;
                  const capacityBadge = getCapacityBadge(
                    trainer.current_clients,
                    trainer.max_clients
                  );

                  return (
                    <div
                      key={trainer.id}
                      className={`border rounded-lg p-4 ${
                        selectedTrainerId === trainer.id
                          ? "border-primary bg-primary/5"
                          : "border-border"
                      } ${isAtCapacity ? "opacity-60" : ""}`}
                    >
                      <div className="flex items-start gap-4">
                        <RadioGroupItem
                          value={trainer.id}
                          id={trainer.id}
                          disabled={isAtCapacity}
                          className="mt-1"
                        />
                        <Label
                          htmlFor={trainer.id}
                          className="flex-1 cursor-pointer space-y-2"
                        >
                          {/* Trainer Header */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-bold text-foreground text-lg">
                                  {trainer.name}
                                </h4>
                                {selectedTrainerId === trainer.id && (
                                  <CheckCircle className="w-5 h-5 text-primary" />
                                )}
                              </div>
                              {trainer.bio && (
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {trainer.bio}
                                </p>
                              )}
                            </div>
                            <Badge
                              variant={capacityBadge.variant}
                              className="shrink-0"
                            >
                              {capacityBadge.text}
                            </Badge>
                          </div>

                          {/* Capacity Bar */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Capacity</span>
                              <span
                                className={`font-semibold ${getCapacityColor(
                                  trainer.current_clients,
                                  trainer.max_clients
                                )}`}
                              >
                                {trainer.current_clients} / {trainer.max_clients} clients
                              </span>
                            </div>
                            <div className="w-full bg-secondary/20 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all ${
                                  isAtCapacity
                                    ? "bg-destructive"
                                    : trainer.current_clients / trainer.max_clients >= 0.8
                                    ? "bg-orange-500"
                                    : "bg-green-600"
                                }`}
                                style={{
                                  width: `${Math.min(
                                    (trainer.current_clients / trainer.max_clients) * 100,
                                    100
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>

                          {/* Specializations */}
                          {trainer.specializations.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {trainer.specializations.map((spec) => (
                                <Badge
                                  key={spec}
                                  variant="outline"
                                  className="text-xs border-primary/30 text-primary"
                                >
                                  {spec}
                                </Badge>
                              ))}
                            </div>
                          )}

                          {/* Certifications */}
                          {trainer.certifications.length > 0 && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Award className="w-4 h-4" />
                              <span>{trainer.certifications.join(", ")}</span>
                            </div>
                          )}
                        </Label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </RadioGroup>
          )}
        </div>

        <DialogFooter>
          <div className="flex gap-3 w-full">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleAssign}
              className="flex-1 bg-gradient-primary text-primary-foreground hover:shadow-glow font-bold"
              disabled={isSubmitting || !selectedTrainerId || hasActiveAssignment}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                "Assign Trainer"
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
