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
import { Plus, Edit, Trash2, Users } from "lucide-react";

interface Class {
  id: string;
  name: string;
  description: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
}

export default function Classes() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("classes")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching classes:", error);
      toast({
        title: "Error",
        description: "Failed to load classes",
        variant: "destructive",
      });
    } else {
      setClasses(data || []);
    }
    setLoading(false);
  };

  const handleCreate = () => {
    setEditingClass(null);
    setFormData({
      name: "",
      description: "",
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (classItem: Class) => {
    setEditingClass(classItem);
    setFormData({
      name: classItem.name,
      description: classItem.description || "",
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast({
        title: "Validation Error",
        description: "Please enter a class name",
        variant: "destructive",
      });
      return;
    }

    const classData = {
      name: formData.name,
      description: formData.description || null,
    };

    if (editingClass) {
      // Update existing class
      const { error } = await supabase
        .from("classes")
        .update(classData)
        .eq("id", editingClass.id);

      if (error) {
        console.error("Error updating class:", error);
        toast({
          title: "Error",
          description: "Failed to update class",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Class updated successfully",
        });
        setIsDialogOpen(false);
        fetchClasses();
      }
    } else {
      // Create new class
      const { error } = await supabase.from("classes").insert([classData]);

      if (error) {
        console.error("Error creating class:", error);
        toast({
          title: "Error",
          description: "Failed to create class",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Class created successfully",
        });
        setIsDialogOpen(false);
        fetchClasses();
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this class?")) return;

    const { error } = await supabase.from("classes").delete().eq("id", id);

    if (error) {
      console.error("Error deleting class:", error);
      toast({
        title: "Error",
        description: "Failed to delete class",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Class deleted successfully",
      });
      fetchClasses();
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Classes</h1>
            <p className="text-muted-foreground">
              Manage class types and configurations
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Add Class
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Total Class Types</p>
            <p className="text-2xl font-bold text-foreground">{classes.length}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Active Classes</p>
            <p className="text-2xl font-bold text-primary">
              {classes.length}
            </p>
          </div>
        </div>

        {/* Classes Table */}
        <div className="bg-card border border-border rounded-lg">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">
              Loading classes...
            </div>
          ) : classes.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground mb-4">No classes found</p>
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Class
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.map((classItem) => (
                  <TableRow key={classItem.id}>
                    <TableCell className="font-medium">
                      {classItem.name}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {classItem.description || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(classItem)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(classItem.id)}
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

        {/* Create/Edit Class Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingClass ? "Edit Class" : "Create New Class"}
              </DialogTitle>
              <DialogDescription>
                {editingClass
                  ? "Update class information"
                  : "Add a new class type to your gym"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Class Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Yoga, Spin, HIIT"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe what this class is about..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Instructors are assigned when scheduling specific class times
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                {editingClass ? "Save Changes" : "Create Class"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
