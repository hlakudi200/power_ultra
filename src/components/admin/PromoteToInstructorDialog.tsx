import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Switch } from "@/components/ui/switch";
import { Loader2, User } from "lucide-react";

interface User {
  user_id: string;
  full_name: string;
  email: string;
}

interface PromoteToInstructorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  preSelectedUserId?: string;
}

export default function PromoteToInstructorDialog({
  open,
  onOpenChange,
  onSuccess,
  preSelectedUserId,
}: PromoteToInstructorDialogProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    userId: preSelectedUserId || "",
    name: "",
    bio: "",
    email: "",
    phone: "",
    isPersonalTrainer: false,
    specializations: "",
    certifications: "",
    yearsExperience: "",
    hourlyRate: "",
    maxClients: "15",
  });

  useEffect(() => {
    if (open) {
      fetchNonInstructorUsers();
      if (preSelectedUserId) {
        setFormData((prev) => ({ ...prev, userId: preSelectedUserId }));
        // Fetch user details to pre-fill name and email
        fetchUserDetails(preSelectedUserId);
      }
    }
  }, [open, preSelectedUserId]);

  const fetchNonInstructorUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data, error } = await supabase.rpc("get_non_instructor_users");

      if (error) {
        console.error("Error fetching users:", error);
        toast({
          title: "Error",
          description: "Failed to load users. Please try again.",
          variant: "destructive",
        });
      } else {
        setUsers(data || []);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchUserDetails = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", userId)
      .single();

    if (!error && data) {
      setFormData((prev) => ({
        ...prev,
        name: data.full_name || "",
        email: data.email || "",
      }));
    }
  };

  const handleUserSelect = (userId: string) => {
    setFormData((prev) => ({ ...prev, userId }));

    // Auto-fill name and email from selected user
    const selectedUser = users.find((u) => u.user_id === userId);
    if (selectedUser) {
      setFormData((prev) => ({
        ...prev,
        name: selectedUser.full_name || "",
        email: selectedUser.email || "",
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.userId) {
      toast({
        title: "Validation Error",
        description: "Please select a user to promote.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter instructor name.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      // Convert comma-separated strings to arrays
      const specializationsArray = formData.specializations
        ? formData.specializations.split(",").map((s) => s.trim()).filter((s) => s)
        : null;

      const certificationsArray = formData.certifications
        ? formData.certifications.split(",").map((c) => c.trim()).filter((c) => c)
        : null;

      // Call the promote_user_to_instructor function
      const { data, error } = await supabase.rpc("promote_user_to_instructor", {
        p_user_id: formData.userId,
        p_name: formData.name || null,
        p_bio: formData.bio || null,
        p_email: formData.email || null,
        p_phone: formData.phone || null,
        p_is_personal_trainer: formData.isPersonalTrainer,
        p_specializations: specializationsArray,
        p_certifications: certificationsArray,
        p_years_experience: formData.yearsExperience
          ? parseInt(formData.yearsExperience)
          : null,
        p_hourly_rate: formData.hourlyRate
          ? parseFloat(formData.hourlyRate)
          : null,
        p_max_clients: formData.maxClients
          ? parseInt(formData.maxClients)
          : 15,
      });

      if (error) {
        console.error("Error promoting user:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to promote user to instructor.",
          variant: "destructive",
        });
        return;
      }

      // Check response from function
      const result = data?.[0];
      if (result && result.success) {
        toast({
          title: "Success",
          description: result.message || "User promoted to instructor successfully!",
        });

        // Reset form
        setFormData({
          userId: "",
          name: "",
          bio: "",
          email: "",
          phone: "",
          isPersonalTrainer: false,
          specializations: "",
          certifications: "",
          yearsExperience: "",
          hourlyRate: "",
          maxClients: "15",
        });

        onOpenChange(false);
        onSuccess?.();
      } else {
        toast({
          title: "Error",
          description: result?.message || "Failed to promote user.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Promote User to Instructor</DialogTitle>
          <DialogDescription>
            Select an existing user and provide instructor details to grant them instructor access.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* User Selection */}
          <div className="space-y-2">
            <Label htmlFor="user-select">
              Select User <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.userId}
              onValueChange={handleUserSelect}
              disabled={loadingUsers || !!preSelectedUserId}
            >
              <SelectTrigger id="user-select">
                <SelectValue placeholder={loadingUsers ? "Loading users..." : "Select a user"} />
              </SelectTrigger>
              <SelectContent>
                {loadingUsers ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : users.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground text-center">
                    No users available to promote
                  </div>
                ) : (
                  users.map((user) => (
                    <SelectItem key={user.user_id} value={user.user_id}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <div>
                          <div className="font-medium">{user.full_name}</div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Only users without instructor accounts are shown
            </p>
          </div>

          {/* Instructor Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Display Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="e.g., John Smith"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          {/* Email and Phone */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="instructor@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 234 567 8900"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              placeholder="Tell members about this instructor..."
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              rows={3}
            />
          </div>

          {/* Personal Trainer Toggle */}
          <div className="flex items-center justify-between border border-border rounded-lg p-4">
            <div className="space-y-0.5">
              <Label htmlFor="is-personal-trainer">Personal Trainer</Label>
              <p className="text-xs text-muted-foreground">
                Can this instructor provide one-on-one training sessions?
              </p>
            </div>
            <Switch
              id="is-personal-trainer"
              checked={formData.isPersonalTrainer}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, isPersonalTrainer: checked })
              }
            />
          </div>

          {/* Specializations */}
          <div className="space-y-2">
            <Label htmlFor="specializations">Specializations</Label>
            <Input
              id="specializations"
              placeholder="Strength Training, Weight Loss, HIIT (comma-separated)"
              value={formData.specializations}
              onChange={(e) =>
                setFormData({ ...formData, specializations: e.target.value })
              }
            />
            <p className="text-xs text-muted-foreground">
              Separate multiple specializations with commas
            </p>
          </div>

          {/* Certifications */}
          <div className="space-y-2">
            <Label htmlFor="certifications">Certifications</Label>
            <Input
              id="certifications"
              placeholder="NASM-CPT, ACE, CPR (comma-separated)"
              value={formData.certifications}
              onChange={(e) =>
                setFormData({ ...formData, certifications: e.target.value })
              }
            />
            <p className="text-xs text-muted-foreground">
              Separate multiple certifications with commas
            </p>
          </div>

          {/* Experience and Rate */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="years-experience">Years Experience</Label>
              <Input
                id="years-experience"
                type="number"
                min="0"
                placeholder="5"
                value={formData.yearsExperience}
                onChange={(e) =>
                  setFormData({ ...formData, yearsExperience: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hourly-rate">Hourly Rate ($)</Label>
              <Input
                id="hourly-rate"
                type="number"
                min="0"
                step="0.01"
                placeholder="50.00"
                value={formData.hourlyRate}
                onChange={(e) =>
                  setFormData({ ...formData, hourlyRate: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max-clients">Max Clients</Label>
              <Input
                id="max-clients"
                type="number"
                min="1"
                placeholder="15"
                value={formData.maxClients}
                onChange={(e) =>
                  setFormData({ ...formData, maxClients: e.target.value })
                }
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !formData.userId}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Promoting...
                </>
              ) : (
                "Promote to Instructor"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
