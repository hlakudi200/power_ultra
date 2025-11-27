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
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { Search, Eye, Trash2, Mail, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ContactSubmission {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  created_at: string;
}

interface MembershipInquiry {
  id: number;
  name: string;
  email: string;
  phone: string;
  interested_plan: string;
  message: string | null;
  created_at: string;
}

export default function Inquiries() {
  const [contactSubmissions, setContactSubmissions] = useState<
    ContactSubmission[]
  >([]);
  const [membershipInquiries, setMembershipInquiries] = useState<
    MembershipInquiry[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewingContact, setViewingContact] =
    useState<ContactSubmission | null>(null);
  const [viewingInquiry, setViewingInquiry] =
    useState<MembershipInquiry | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchInquiries();
  }, []);

  const fetchInquiries = async () => {
    setLoading(true);

    // Fetch contact submissions
    const { data: contacts, error: contactError } = await supabase
      .from("contact_submissions")
      .select("*")
      .order("created_at", { ascending: false });

    if (contactError) {
      console.error("Error fetching contact submissions:", contactError);
    } else {
      setContactSubmissions(contacts || []);
    }

    // Fetch membership inquiries
    const { data: inquiries, error: inquiryError } = await supabase
      .from("membership_inquiries")
      .select("*")
      .order("created_at", { ascending: false });

    if (inquiryError) {
      console.error("Error fetching membership inquiries:", inquiryError);
    } else {
      setMembershipInquiries(inquiries || []);
    }

    setLoading(false);
  };

  const handleDeleteContact = async (id: number) => {
    if (!confirm("Are you sure you want to delete this contact submission?"))
      return;

    const { error } = await supabase
      .from("contact_submissions")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting contact:", error);
      toast({
        title: "Error",
        description: "Failed to delete contact submission",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Contact submission deleted successfully",
      });
      fetchInquiries();
    }
  };

  const handleDeleteInquiry = async (id: number) => {
    if (!confirm("Are you sure you want to delete this membership inquiry?"))
      return;

    const { error } = await supabase
      .from("membership_inquiries")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting inquiry:", error);
      toast({
        title: "Error",
        description: "Failed to delete membership inquiry",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Membership inquiry deleted successfully",
      });
      fetchInquiries();
    }
  };

  const filteredContacts = contactSubmissions.filter(
    (contact) =>
      contact.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.subject?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredInquiries = membershipInquiries.filter(
    (inquiry) =>
      inquiry.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inquiry.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inquiry.interested_plan?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Inquiries</h1>
            <p className="text-muted-foreground">
              View and manage contact submissions and membership inquiries
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or subject..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <p className="text-sm text-muted-foreground">
                Contact Submissions
              </p>
            </div>
            <p className="text-2xl font-bold text-foreground mt-2">
              {contactSubmissions.length}
            </p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              <p className="text-sm text-muted-foreground">
                Membership Inquiries
              </p>
            </div>
            <p className="text-2xl font-bold text-foreground mt-2">
              {membershipInquiries.length}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="contact" className="w-full">
          <TabsList>
            <TabsTrigger value="contact">
              Contact Submissions ({contactSubmissions.length})
            </TabsTrigger>
            <TabsTrigger value="membership">
              Membership Inquiries ({membershipInquiries.length})
            </TabsTrigger>
          </TabsList>

          {/* Contact Submissions Tab */}
          <TabsContent value="contact" className="mt-6">
            <div className="bg-card border border-border rounded-lg">
              {loading ? (
                <div className="p-8 text-center text-muted-foreground">
                  Loading contact submissions...
                </div>
              ) : filteredContacts.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No contact submissions found
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Received</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredContacts.map((contact) => (
                      <TableRow key={contact.id}>
                        <TableCell className="font-medium">
                          {contact.name}
                        </TableCell>
                        <TableCell>{contact.email}</TableCell>
                        <TableCell>{contact.phone || "-"}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {contact.subject}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(contact.created_at), {
                            addSuffix: true,
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setViewingContact(contact)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteContact(contact.id)}
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
          </TabsContent>

          {/* Membership Inquiries Tab */}
          <TabsContent value="membership" className="mt-6">
            <div className="bg-card border border-border rounded-lg">
              {loading ? (
                <div className="p-8 text-center text-muted-foreground">
                  Loading membership inquiries...
                </div>
              ) : filteredInquiries.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No membership inquiries found
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Interested Plan</TableHead>
                      <TableHead>Received</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInquiries.map((inquiry) => (
                      <TableRow key={inquiry.id}>
                        <TableCell className="font-medium">
                          {inquiry.name}
                        </TableCell>
                        <TableCell>{inquiry.email}</TableCell>
                        <TableCell>{inquiry.phone}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary capitalize">
                            {inquiry.interested_plan}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(inquiry.created_at), {
                            addSuffix: true,
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setViewingInquiry(inquiry)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteInquiry(inquiry.id)}
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
          </TabsContent>
        </Tabs>

        {/* View Contact Dialog */}
        <Dialog
          open={!!viewingContact}
          onOpenChange={() => setViewingContact(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Contact Submission</DialogTitle>
              <DialogDescription>
                Received{" "}
                {viewingContact &&
                  formatDistanceToNow(new Date(viewingContact.created_at), {
                    addSuffix: true,
                  })}
              </DialogDescription>
            </DialogHeader>
            {viewingContact && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Name
                  </p>
                  <p className="text-foreground">{viewingContact.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Email
                  </p>
                  <p className="text-foreground">{viewingContact.email}</p>
                </div>
                {viewingContact.phone && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Phone
                    </p>
                    <p className="text-foreground">{viewingContact.phone}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Subject
                  </p>
                  <p className="text-foreground">{viewingContact.subject}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Message
                  </p>
                  <p className="text-foreground whitespace-pre-wrap">
                    {viewingContact.message}
                  </p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* View Inquiry Dialog */}
        <Dialog
          open={!!viewingInquiry}
          onOpenChange={() => setViewingInquiry(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Membership Inquiry</DialogTitle>
              <DialogDescription>
                Received{" "}
                {viewingInquiry &&
                  formatDistanceToNow(new Date(viewingInquiry.created_at), {
                    addSuffix: true,
                  })}
              </DialogDescription>
            </DialogHeader>
            {viewingInquiry && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Name
                  </p>
                  <p className="text-foreground">{viewingInquiry.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Email
                  </p>
                  <p className="text-foreground">{viewingInquiry.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Phone
                  </p>
                  <p className="text-foreground">{viewingInquiry.phone}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Interested Plan
                  </p>
                  <p className="text-foreground capitalize">
                    {viewingInquiry.interested_plan}
                  </p>
                </div>
                {viewingInquiry.message && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Additional Message
                    </p>
                    <p className="text-foreground whitespace-pre-wrap">
                      {viewingInquiry.message}
                    </p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
