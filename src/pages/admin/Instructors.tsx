import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Edit, Trash2, UserCheck, UserX } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface Instructor {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  bio?: string;
  specialties?: string[];
  certifications?: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function Instructors() {
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInstructor, setEditingInstructor] = useState<Instructor | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    bio: "",
    specialties: "",
    certifications: "",
    is_active: true,
  });

  useEffect(() => {
    fetchInstructors();
  }, []);

  const fetchInstructors = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("instructors")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching instructors:", error);
      toast({
        title: "Error",
        description: "Failed to load instructors",
        variant: "destructive",
      });
    } else {
      setInstructors(data || []);
    }
    setLoading(false);
  };

  const handleCreate = () => {
    setEditingInstructor(null);
    setFormData({
      name: "",
      email: "",
      phone: "",
      bio: "",
      specialties: "",
      certifications: "",
      is_active: true,
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (instructor: Instructor) => {
    setEditingInstructor(instructor);
    setFormData({
      name: instructor.name,
      email: instructor.email || "",
      phone: instructor.phone || "",
      bio: instructor.bio || "",
      specialties: instructor.specialties?.join(", ") || "",
      certifications: instructor.certifications?.join(", ") || "",
      is_active: instructor.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast({
        title: "Validation Error",
        description: "Please enter instructor name",
        variant: "destructive",
      });
      return;
    }

    // Convert comma-separated strings to arrays
    const specialtiesArray = formData.specialties
      ? formData.specialties.split(",").map((s) => s.trim()).filter((s) => s)
      : [];
    const certificationsArray = formData.certifications
      ? formData.certifications.split(",").map((c) => c.trim()).filter((c) => c)
      : [];

    const instructorData = {
      name: formData.name,
      email: formData.email || null,
      phone: formData.phone || null,
      bio: formData.bio || null,
      specialties: specialtiesArray.length > 0 ? specialtiesArray : null,
      certifications: certificationsArray.length > 0 ? certificationsArray : null,
      is_active: formData.is_active,
    };

    if (editingInstructor) {
      // Update existing instructor
      const { error } = await supabase
        .from("instructors")
        .update(instructorData)
        .eq("id", editingInstructor.id);

      if (error) {
        console.error("Error updating instructor:", error);
        toast({
          title: "Error",
          description: "Failed to update instructor",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Instructor updated successfully",
        });
        setIsDialogOpen(false);
        fetchInstructors();
      }
    } else {
      // Create new instructor
      const { error } = await supabase.from("instructors").insert([instructorData]);

      if (error) {
        console.error("Error creating instructor:", error);
        toast({
          title: "Error",
          description: "Failed to create instructor",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Instructor created successfully",
        });
        setIsDialogOpen(false);
        fetchInstructors();
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this instructor?")) return;

    const { error } = await supabase.from("instructors").delete().eq("id", id);

    if (error) {
      console.error("Error deleting instructor:", error);
      toast({
        title: "Error",
        description: "Failed to delete instructor",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Instructor deleted successfully",
      });
      fetchInstructors();
    }
  };

  const toggleActive = async (instructor: Instructor) => {
    const { error } = await supabase
      .from("instructors")
      .update({ is_active: !instructor.is_active })
      .eq("id", instructor.id);

    if (error) {
      console.error("Error toggling instructor status:", error);
      toast({
        title: "Error",
        description: "Failed to update instructor status",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `Instructor ${!instructor.is_active ? "activated" : "deactivated"}`,
      });
      fetchInstructors();
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Instructors</h1>
            <p className="text-muted-foreground">
              Manage gym instructors and their information
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Add Instructor
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Total Instructors</p>
            <p className="text-2xl font-bold text-foreground">{instructors.length}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Active Instructors</p>
            <p className="text-2xl font-bold text-primary">
              {instructors.filter((i) => i.is_active).length}
            </p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Inactive Instructors</p>
            <p className="text-2xl font-bold text-muted-foreground">
              {instructors.filter((i) => !i.is_active).length}
            </p>
          </div>
        </div>

        {/* Instructors Table */}
        <div className="bg-card border border-border rounded-lg">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">
              Loading instructors...
            </div>
          ) : instructors.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground mb-4">No instructors found</p>
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Instructor
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Specialties</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {instructors.map((instructor) => (
                  <TableRow key={instructor.id}>
                    <TableCell className="font-medium">
                      {instructor.name}
                    </TableCell>
                    <TableCell>
                      {instructor.email || "-"}
                    </TableCell>
                    <TableCell>
                      {instructor.phone || "-"}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {instructor.specialties && instructor.specialties.length > 0
                        ? instructor.specialties.join(", ")
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {instructor.is_active ? (
                          <div className="flex items-center gap-1 text-primary">
                            <UserCheck className="h-4 w-4" />
                            <span className="text-sm">Active</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <UserX className="h-4 w-4" />
                            <span className="text-sm">Inactive</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleActive(instructor)}
                          title={instructor.is_active ? "Deactivate" : "Activate"}
                        >
                          {instructor.is_active ? (
                            <UserX className="h-4 w-4" />
                          ) : (
                            <UserCheck className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(instructor)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(instructor.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Create/Edit Instructor Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingInstructor ? "Edit Instructor" : "Add New Instructor"}
              </DialogTitle>
              <DialogDescription>
                {editingInstructor
                  ? "Update instructor information"
                  : "Add a new instructor to your gym"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., John Smith"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="instructor@example.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 234 567 8900"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell members about this instructor..."
                  value={formData.bio}
                  onChange={(e) =>
                    setFormData({ ...formData, bio: e.target.value })
                  }
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="specialties">Specialties</Label>
                <Input
                  id="specialties"
                  placeholder="Yoga, HIIT, Strength Training (comma-separated)"
                  value={formData.specialties}
                  onChange={(e) =>
                    setFormData({ ...formData, specialties: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Separate multiple specialties with commas
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="certifications">Certifications</Label>
                <Input
                  id="certifications"
                  placeholder="ACE, NASM, CPR (comma-separated)"
                  value={formData.certifications}
                  onChange={(e) =>
                    setFormData({ ...formData, certifications: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Separate multiple certifications with commas
                </p>
              </div>
              <div className="flex items-center justify-between border border-border rounded-lg p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="is_active">Active Status</Label>
                  <p className="text-xs text-muted-foreground">
                    Inactive instructors won't appear in schedule assignments
                  </p>
                </div>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_active: checked })
                  }
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                {editingInstructor ? "Save Changes" : "Add Instructor"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
