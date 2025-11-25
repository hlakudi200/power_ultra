import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useState, useEffect } from "react";
import { MembershipInquiryDialog } from "./MembershipInquiryDialog";
import { useSession } from "@/context/SessionProvider";
import { AuthDialog } from "./AuthDialog";

interface MembershipPlan {
  id: string;
  name: string;
  price: number;
  duration_months: number;
  features: string[];
}

const fetchMemberships = async () => {
  const { data, error } = await supabase.from("memberships").select("*").order("price", { ascending: true });
  if (error) {
    throw new Error("Failed to fetch memberships: " + error.message);
  }
  return data as MembershipPlan[];
};

const Pricing = () => {
  const { session } = useSession();
  const [isEnquiryOpen, setIsEnquiryOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [authActionPending, setAuthActionPending] = useState(false);

  const { data: plans, isLoading, error } = useQuery({
    queryKey: ["memberships"],
    queryFn: fetchMemberships,
  });

  const handleGetStartedClick = (planName: string) => {
    setSelectedPlan(planName);
    if (session) {
      setIsEnquiryOpen(true);
    } else {
      setAuthActionPending(true);
      setIsAuthOpen(true);
    }
  };

  useEffect(() => {
    // This effect triggers after a user logs in successfully
    // and their action to open the inquiry form was pending.
    if (session && authActionPending) {
      setIsAuthOpen(false);
      setIsEnquiryOpen(true);
      setAuthActionPending(false); // Reset the pending action
    }
  }, [session, authActionPending]);


  return (
    <>
      <section id="pricing" className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-4xl md:text-5xl font-black text-foreground mb-4">
              MEMBERSHIP <span className="text-primary">PLANS</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Choose the plan that fits your lifestyle and fitness goals
            </p>
          </div>

          {isLoading && <p className="text-center text-xl">Loading membership plans...</p>}
          {error && <p className="text-center text-xl text-red-500">Could not load plans. Please try again later.</p>}
          {plans && (
            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {plans.map((plan, index) => (
                <Card
                  key={plan.id}
                  className={`bg-card border-2 ${index === 1 ? 'border-primary shadow-glow scale-105' : 'border-border'} hover:border-primary transition-all duration-300 animate-slide-up`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {index === 1 && ( // Assuming the second plan is "most popular" for now
                    <div className="bg-gradient-primary text-primary-foreground text-center py-2 font-bold text-sm">
                      MOST POPULAR
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="text-3xl font-black text-foreground">{plan.name}</CardTitle>
                    <CardDescription className="text-muted-foreground">
                      {/* No direct description field, using a placeholder or can be added to DB */}
                      Plan for {plan.duration_months} months
                    </CardDescription>
                    <div className="mt-4">
                      <span className="text-5xl font-black text-primary">
                        {new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(plan.price)}
                      </span>
                      <span className="text-muted-foreground text-lg">
                        /{plan.duration_months > 1 ? `${plan.duration_months} months` : "month"}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3 mb-6">
                      {plan.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                          <span className="text-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      className={`w-full font-bold ${index === 1 ? 'bg-gradient-primary hover:shadow-glow' : 'bg-secondary hover:bg-secondary/80'}`}
                      size="lg"
                      onClick={() => handleGetStartedClick(plan.name)}
                    >
                      GET STARTED
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Dialogs */}
      <AuthDialog 
        isOpen={isAuthOpen} 
        onOpenChange={(open) => { // Use onOpenChange with boolean parameter
          setIsAuthOpen(open); // Update dialog open state
          if (!open) { // If dialog is being closed
            setAuthActionPending(false); // Cancel pending action
          }
        }} 
      />
      <MembershipInquiryDialog
        isOpen={isEnquiryOpen}
        onClose={() => setIsEnquiryOpen(false)}
        plan={selectedPlan}
      />
    </>
  );
};

export default Pricing;
