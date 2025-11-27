import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DialogTrigger,
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
import { Search, UserPlus, Edit, Trash2, Calendar } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Member {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  is_admin: boolean;
  role: string | null;
  membership_expiry_date: string | null;
  updated_at: string;
}

export default function Members() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    role: "",
    membership_expiry_date: "",
  });

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error fetching members:", error);
      toast({
        title: "Error",
        description: "Failed to load members",
        variant: "destructive",
      });
    } else {
      setMembers(data || []);
    }
    setLoading(false);
  };

  const handleEdit = (member: Member) => {
    setEditingMember(member);
    setFormData({
      first_name: member.first_name || "",
      last_name: member.last_name || "",
      phone: member.phone || "",
      role: member.role || "",
      membership_expiry_date: member.membership_expiry_date
        ? new Date(member.membership_expiry_date).toISOString().split("T")[0]
        : "",
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingMember) return;

    // If role is empty or "member", set role to null and is_admin to false
    // Otherwise, user is an admin with their specific role
    const finalRole = formData.role && formData.role !== "member" ? formData.role : null;
    const isAdminRole = ["super_admin", "admin", "staff", "instructor"].includes(
      formData.role
    );

    // Construct full_name from first_name and last_name
    const fullName = `${formData.first_name} ${formData.last_name}`.trim();

    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: formData.first_name,
        last_name: formData.last_name,
        full_name: fullName,
        phone: formData.phone || null,
        role: finalRole,
        is_admin: isAdminRole,
        membership_expiry_date: formData.membership_expiry_date || null,
      })
      .eq("id", editingMember.id);

    if (error) {
      console.error("Error updating member:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      toast({
        title: "Error",
        description: `Failed to update member: ${error.message}`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Member updated successfully",
      });
      setIsDialogOpen(false);
      fetchMembers();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this member?")) return;

    const { error } = await supabase.from("profiles").delete().eq("id", id);

    if (error) {
      console.error("Error deleting member:", error);
      toast({
        title: "Error",
        description: "Failed to delete member",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Member deleted successfully",
      });
      fetchMembers();
    }
  };

  const handleExtendMembership = async (member: Member) => {
    const currentExpiry = member.membership_expiry_date
      ? new Date(member.membership_expiry_date)
      : new Date();
    const newExpiry = new Date(currentExpiry);
    newExpiry.setMonth(newExpiry.getMonth() + 1);

    const { error } = await supabase
      .from("profiles")
      .update({
        membership_expiry_date: newExpiry.toISOString(),
      })
      .eq("id", member.id);

    if (error) {
      console.error("Error extending membership:", error);
      toast({
        title: "Error",
        description: "Failed to extend membership",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Membership extended by 1 month",
      });
      fetchMembers();
    }
  };

  const filteredMembers = members.filter((member) => {
    const matchesSearch =
      member.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole =
      filterRole === "all" ||
      (filterRole === "admin" && member.is_admin) ||
      (filterRole === "member" && !member.is_admin);

    return matchesSearch && matchesRole;
  });

  const getMembershipStatus = (expiryDate: string | null) => {
    if (!expiryDate) return { text: "No Membership", color: "text-gray-500" };
    const expiry = new Date(expiryDate);
    const now = new Date();

    if (expiry > now) {
      return { text: "Active", color: "text-green-600" };
    } else {
      return { text: "Expired", color: "text-red-600" };
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Members</h1>
            <p className="text-muted-foreground">
              Manage gym members and their memberships
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Members</SelectItem>
              <SelectItem value="admin">Admins Only</SelectItem>
              <SelectItem value="member">Members Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Total Members</p>
            <p className="text-2xl font-bold text-foreground">{members.length}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Active Memberships</p>
            <p className="text-2xl font-bold text-green-600">
              {
                members.filter(
                  (m) =>
                    m.membership_expiry_date &&
                    new Date(m.membership_expiry_date) > new Date()
                ).length
              }
            </p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Admins</p>
            <p className="text-2xl font-bold text-primary">
              {members.filter((m) => m.is_admin).length}
            </p>
          </div>
        </div>

        {/* Members Table */}
        <div className="bg-card border border-border rounded-lg">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">
              Loading members...
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No members found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Membership</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.map((member) => {
                  const status = getMembershipStatus(member.membership_expiry_date);
                  return (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">
                        {member.first_name} {member.last_name}
                      </TableCell>
                      <TableCell>{member.email}</TableCell>
                      <TableCell>{member.phone || "-"}</TableCell>
                      <TableCell>
                        {member.is_admin ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                            {member.role?.replace("_", " ") || "Admin"}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Member</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={status.color}>{status.text}</span>
                        {member.membership_expiry_date && (
                          <p className="text-xs text-muted-foreground">
                            Expires{" "}
                            {formatDistanceToNow(
                              new Date(member.membership_expiry_date),
                              { addSuffix: true }
                            )}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(member.updated_at), {
                          addSuffix: true,
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleExtendMembership(member)}
                            title="Extend membership"
                          >
                            <Calendar className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(member)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(member.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Edit Member Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Member</DialogTitle>
              <DialogDescription>
                Update member information and membership details
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) =>
                    setFormData({ ...formData, first_name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) =>
                    setFormData({ ...formData, last_name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={formData.role || "member"}
                  onValueChange={(value) =>
                    setFormData({ ...formData, role: value === "member" ? "" : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="instructor">Instructor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="membership_expiry">Membership Expiry</Label>
                <Input
                  id="membership_expiry"
                  type="date"
                  value={formData.membership_expiry_date}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      membership_expiry_date: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>Save Changes</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
