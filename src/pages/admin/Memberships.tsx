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
import { Plus, Edit, Trash2, Check } from "lucide-react";

interface Membership {
  id: number;
  name: string;
  description: string;
  price: number;
  duration_months: number;
  features: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function Memberships() {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMembership, setEditingMembership] = useState<Membership | null>(
    null
  );
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    duration_months: "",
    features: "",
    is_active: true,
  });

  useEffect(() => {
    fetchMemberships();
  }, []);

  const fetchMemberships = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("memberships")
      .select("*")
      .order("price", { ascending: true });

    if (error) {
      console.error("Error fetching memberships:", error);
      toast({
        title: "Error",
        description: "Failed to load membership plans",
        variant: "destructive",
      });
    } else {
      setMemberships(data || []);
    }
    setLoading(false);
  };

  const handleCreate = () => {
    setEditingMembership(null);
    setFormData({
      name: "",
      description: "",
      price: "",
      duration_months: "",
      features: "",
      is_active: true,
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (membership: Membership) => {
    setEditingMembership(membership);
    setFormData({
      name: membership.name,
      description: membership.description || "",
      price: membership.price?.toString() || "",
      duration_months: membership.duration_months?.toString() || "",
      features: membership.features?.join("\n") || "",
      is_active: membership.is_active ?? true,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    console.log("handleSave called");
    console.log("Form data:", formData);

    // Trim and validate
    const trimmedName = formData.name.trim();
    const trimmedPrice = formData.price.trim();
    const trimmedDuration = formData.duration_months.trim();

    if (!trimmedName) {
      console.log("Validation failed - name is required");
      toast({
        title: "Error",
        description: "Plan name is required",
        variant: "destructive",
      });
      return;
    }

    if (!trimmedPrice || isNaN(parseFloat(trimmedPrice)) || parseFloat(trimmedPrice) <= 0) {
      console.log("Validation failed - invalid price");
      toast({
        title: "Error",
        description: "Please enter a valid price greater than 0",
        variant: "destructive",
      });
      return;
    }

    if (!trimmedDuration || isNaN(parseInt(trimmedDuration)) || parseInt(trimmedDuration) <= 0) {
      console.log("Validation failed - invalid duration");
      toast({
        title: "Error",
        description: "Please enter a valid duration in months (greater than 0)",
        variant: "destructive",
      });
      return;
    }

    const membershipData = {
      name: formData.name,
      description: formData.description,
      price: parseFloat(formData.price),
      duration_months: parseInt(formData.duration_months),
      features: formData.features
        .split("\n")
        .filter((f) => f.trim())
        .map((f) => f.trim()),
      is_active: formData.is_active,
    };

    console.log("Membership data to save:", membershipData);

    if (editingMembership) {
      // Update existing membership
      console.log("Updating existing membership, ID:", editingMembership.id);
      const { data, error } = await supabase
        .from("memberships")
        .update(membershipData)
        .eq("id", editingMembership.id)
        .select();

      if (error) {
        console.error("Error updating membership:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));
        toast({
          title: "Error",
          description: `Failed to update membership plan: ${error.message}`,
          variant: "destructive",
        });
      } else {
        console.log("Membership updated successfully:", data);
        toast({
          title: "Success",
          description: "Membership plan updated successfully",
        });
        setIsDialogOpen(false);
        fetchMemberships();
      }
    } else {
      // Create new membership
      console.log("Creating new membership");
      const { data, error } = await supabase
        .from("memberships")
        .insert([membershipData])
        .select();

      if (error) {
        console.error("Error creating membership:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));
        toast({
          title: "Error",
          description: `Failed to create membership plan: ${error.message}`,
          variant: "destructive",
        });
      } else {
        console.log("Membership created successfully:", data);
        toast({
          title: "Success",
          description: "Membership plan created successfully",
        });
        setIsDialogOpen(false);
        fetchMemberships();
      }
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this membership plan?"))
      return;

    const { error } = await supabase.from("memberships").delete().eq("id", id);

    if (error) {
      console.error("Error deleting membership:", error);
      toast({
        title: "Error",
        description: "Failed to delete membership plan",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Membership plan deleted successfully",
      });
      fetchMemberships();
    }
  };

  const handleToggleActive = async (id: number, currentStatus: boolean) => {
    const { error } = await supabase
      .from("memberships")
      .update({ is_active: !currentStatus })
      .eq("id", id);

    if (error) {
      console.error("Error toggling membership status:", error);
      toast({
        title: "Error",
        description: "Failed to update membership status",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `Membership plan ${
          !currentStatus ? "activated" : "deactivated"
        }`,
      });
      fetchMemberships();
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Membership Plans
            </h1>
            <p className="text-muted-foreground">
              Manage membership tiers and pricing
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Add Plan
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Total Plans</p>
            <p className="text-2xl font-bold text-foreground">
              {memberships.length}
            </p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Active Plans</p>
            <p className="text-2xl font-bold text-green-600">
              {memberships.filter((m) => m.is_active).length}
            </p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Price Range</p>
            <p className="text-2xl font-bold text-foreground">
              {memberships.length > 0
                ? `R${Math.min(...memberships.map((m) => m.price))} - R${Math.max(
                    ...memberships.map((m) => m.price)
                  )}`
                : "N/A"}
            </p>
          </div>
        </div>

        {/* Membership Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {loading ? (
            <div className="col-span-full p-8 text-center text-muted-foreground">
              Loading membership plans...
            </div>
          ) : memberships.length === 0 ? (
            <div className="col-span-full p-8 text-center">
              <p className="text-muted-foreground mb-4">
                No membership plans found
              </p>
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Plan
              </Button>
            </div>
          ) : (
            memberships.map((membership) => (
              <div
                key={membership.id}
                className={`bg-card border rounded-lg p-6 flex flex-col h-full ${
                  membership.is_active
                    ? "border-primary"
                    : "border-border opacity-60"
                }`}
              >
                {/* Header Section - Fixed Height */}
                <div className="flex justify-between items-start mb-4 min-h-[60px]">
                  <div>
                    <h3 className="text-xl font-bold text-foreground line-clamp-2">
                      {membership.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {membership.duration_months} {membership.duration_months === 1 ? 'month' : 'months'}
                    </p>
                  </div>
                  {membership.is_active && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 whitespace-nowrap ml-2">
                      Active
                    </span>
                  )}
                </div>

                {/* Price Section - Fixed Height */}
                <div className="mb-4">
                  <p className="text-3xl font-bold text-primary">
                    R{membership.price}
                  </p>
                </div>

                {/* Description Section - Fixed Height */}
                <p className="text-sm text-muted-foreground mb-4 line-clamp-3 min-h-[60px]">
                  {membership.description || "No description available"}
                </p>

                {/* Features Section - Flexible Height */}
                <div className="space-y-2 mb-6 flex-grow">
                  {membership.features && membership.features.length > 0 ? (
                    membership.features.map((feature, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-foreground">{feature}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No features listed</p>
                  )}
                </div>

                {/* Actions Section - Fixed at Bottom */}
                <div className="flex flex-col gap-2 mt-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(membership)}
                    className="w-full"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleToggleActive(membership.id, membership.is_active)
                      }
                      className="flex-1"
                    >
                      {membership.is_active ? "Deactivate" : "Activate"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(membership.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Create/Edit Membership Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingMembership ? "Edit Membership Plan" : "Create New Plan"}
              </DialogTitle>
              <DialogDescription>
                {editingMembership
                  ? "Update membership plan details"
                  : "Add a new membership tier to your gym"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Plan Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Basic, Premium, Elite"
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
                  placeholder="Brief description of this plan..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price (R) *</Label>
                  <Input
                    id="price"
                    type="text"
                    inputMode="decimal"
                    placeholder="299.00"
                    value={formData.price}
                    onChange={(e) => {
                      // Allow only numbers and decimal point
                      const value = e.target.value;
                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                        setFormData({ ...formData, price: value });
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground">Enter price without currency symbol</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (months) *</Label>
                  <Input
                    id="duration"
                    type="text"
                    inputMode="numeric"
                    placeholder="1"
                    value={formData.duration_months}
                    onChange={(e) => {
                      // Allow only positive integers
                      const value = e.target.value;
                      if (value === '' || /^\d+$/.test(value)) {
                        setFormData({
                          ...formData,
                          duration_months: value,
                        });
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground">Number of months (e.g., 1, 3, 6, 12)</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="features">Features (one per line)</Label>
                <Textarea
                  id="features"
                  placeholder="Unlimited gym access&#10;Free group classes&#10;Personal training session&#10;Locker access"
                  value={formData.features}
                  onChange={(e) =>
                    setFormData({ ...formData, features: e.target.value })
                  }
                  rows={6}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) =>
                    setFormData({ ...formData, is_active: e.target.checked })
                  }
                  className="h-4 w-4"
                />
                <Label htmlFor="is_active" className="cursor-pointer">
                  Active (available for purchase)
                </Label>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                {editingMembership ? "Save Changes" : "Create Plan"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
