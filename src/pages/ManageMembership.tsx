import { useNavigate } from "react-router-dom";
import { useSession } from "@/context/SessionProvider";
import { supabase } from "@/lib/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Package, Calendar, Clock, AlertCircle, Mail, XCircle, RefreshCw, Loader2 } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useState } from "react";
import { MembershipInquiryDialog } from "@/components/MembershipInquiryDialog";

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  membership_expiry_date: string | null;
  memberships?: {
    id: string;
    name: string;
    price: number;
    duration_months: number;
  } | null;
}

const fetchUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email, membership_expiry_date, memberships!profiles_membership_id_fkey(id, name, price, duration_months)")
    .eq("id", userId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  // Transform memberships array to single object
  const transformedData = {
    ...data,
    memberships: data.memberships && Array.isArray(data.memberships)
      ? data.memberships[0] || null
      : data.memberships || null,
  };

  return transformedData as Profile;
};

const ManageMembership = () => {
  const { session } = useSession();
  const navigate = useNavigate();
  const [inquiryDialogOpen, setInquiryDialogOpen] = useState(false);
  const [inquiryType, setInquiryType] = useState<"renew" | "cancel" | "general">("general");

  const userId = session?.user?.id;

  const {
    data: profile,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["userProfile", userId],
    queryFn: () => fetchUserProfile(userId!),
    enabled: !!userId,
  });

  if (!session) {
    navigate("/");
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
        <span className="text-xl">Loading membership details...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error!</AlertTitle>
          <AlertDescription>
            Failed to load membership details. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const hasActiveMembership = profile?.membership_expiry_date &&
    new Date(profile.membership_expiry_date) > new Date();

  const expiryDate = profile?.membership_expiry_date ? new Date(profile.membership_expiry_date) : null;
  const daysRemaining = expiryDate && hasActiveMembership ? differenceInDays(expiryDate, new Date()) : 0;
  const isExpiringSoon = daysRemaining > 0 && daysRemaining <= 7;

  const handleInquiry = (type: "renew" | "cancel" | "general") => {
    setInquiryType(type);
    setInquiryDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-dark py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-5xl md:text-6xl font-black text-primary mb-4">
            Manage Membership
          </h1>
          <p className="text-xl text-muted-foreground">
            View and manage your membership details
          </p>
        </div>

        {/* Membership Status Alert */}
        {!hasActiveMembership && (
          <Alert className="bg-yellow-500/10 border-yellow-500/50">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            <AlertTitle className="text-yellow-500">No Active Membership</AlertTitle>
            <AlertDescription>
              You don't have an active membership. Browse our plans or enter an activation code to get started.
            </AlertDescription>
          </Alert>
        )}

        {isExpiringSoon && (
          <Alert className="bg-orange-500/10 border-orange-500/50">
            <Clock className="h-5 w-5 text-orange-500" />
            <AlertTitle className="text-orange-500">Membership Expiring Soon</AlertTitle>
            <AlertDescription>
              Your membership expires in {daysRemaining} {daysRemaining === 1 ? "day" : "days"}. Send an inquiry to renew.
            </AlertDescription>
          </Alert>
        )}

        {/* Membership Details Card */}
        <Card className="bg-card border-border shadow-lg">
          <CardHeader className="border-b border-border pb-6">
            <CardTitle className="flex items-center gap-3 text-3xl font-bold text-foreground">
              <Package className="w-8 h-8 text-primary" />
              {hasActiveMembership ? "Active Membership" : "Membership Status"}
            </CardTitle>
            <CardDescription className="text-muted-foreground text-base">
              {hasActiveMembership
                ? "Your current membership plan and details"
                : "You currently don't have an active membership"}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6 space-y-6">
            {hasActiveMembership && profile?.memberships ? (
              <>
                {/* Plan Details */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Plan Name</p>
                      <p className="text-2xl font-bold text-primary">{profile.memberships.name}</p>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Monthly Price</p>
                      <p className="text-xl font-semibold text-foreground">
                        R{profile.memberships.price.toFixed(2)} / month
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Duration</p>
                      <p className="text-xl font-semibold text-foreground">
                        {profile.memberships.duration_months} {profile.memberships.duration_months === 1 ? "month" : "months"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Expiry Date</p>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-primary" />
                        <p className="text-xl font-semibold text-foreground">
                          {expiryDate && format(expiryDate, "PPP")}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Status</p>
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/50">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-green-500 font-semibold">Active</span>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Days Remaining</p>
                      <p className="text-xl font-semibold text-foreground">
                        {daysRemaining} {daysRemaining === 1 ? "day" : "days"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions for Active Members */}
                <div className="border-t border-border pt-6 space-y-3">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Membership Actions</h3>

                  <Button
                    onClick={() => handleInquiry("renew")}
                    className="w-full bg-gradient-primary text-primary-foreground hover:shadow-glow font-bold gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Send Inquiry to Renew/Extend
                  </Button>

                  <Button
                    onClick={() => handleInquiry("cancel")}
                    variant="outline"
                    className="w-full border-red-500 text-red-500 hover:bg-red-500/10 gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    Send Inquiry to Cancel
                  </Button>
                </div>
              </>
            ) : (
              <>
                {/* No Active Membership */}
                <div className="text-center py-8 space-y-6">
                  <div className="flex justify-center">
                    <div className="bg-muted/50 p-6 rounded-full">
                      <Package className="w-16 h-16 text-muted-foreground" />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-2xl font-bold text-foreground mb-2">No Active Membership</h3>
                    <p className="text-muted-foreground">
                      {expiryDate
                        ? `Your membership expired on ${format(expiryDate, "PPP")}`
                        : "You haven't activated a membership yet"}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
                    <Button
                      onClick={() => navigate("/activate-membership")}
                      className="bg-gradient-primary text-primary-foreground hover:shadow-glow font-bold"
                    >
                      Enter Activation Code
                    </Button>
                    <Button
                      onClick={() => navigate("/memberships")}
                      variant="outline"
                      className="border-primary text-primary hover:bg-primary/10"
                    >
                      Browse Plans
                    </Button>
                  </div>

                  <Button
                    onClick={() => handleInquiry("general")}
                    variant="ghost"
                    className="text-muted-foreground hover:text-foreground gap-2"
                  >
                    <Mail className="w-4 h-4" />
                    Send General Inquiry
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Back to Dashboard */}
        <div className="text-center">
          <Button
            onClick={() => navigate("/dashboard")}
            variant="ghost"
            className="text-muted-foreground hover:text-foreground"
          >
            ← Back to Dashboard
          </Button>
        </div>
      </div>

      {/* Inquiry Dialog */}
      <MembershipInquiryDialog
        isOpen={inquiryDialogOpen}
        onClose={() => setInquiryDialogOpen(false)}
        plan={
          inquiryType === "renew"
            ? `Renew ${profile?.memberships?.name || "Membership"}`
            : inquiryType === "cancel"
            ? `Cancel ${profile?.memberships?.name || "Membership"}`
            : "General Inquiry"
        }
      />
    </div>
  );
};

export default ManageMembership;
