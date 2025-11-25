import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Mail, Phone, MapPin, Clock } from "lucide-react";
import ContactMap from "./ContactMap";

const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "Name is required" })
    .max(100, { message: "Name must be less than 100 characters" }),
  email: z
    .string()
    .trim()
    .email({ message: "Invalid email address" })
    .max(255, { message: "Email must be less than 255 characters" }),
  phone: z
    .string()
    .trim()
    .min(10, { message: "Phone number must be at least 10 digits" })
    .max(20, { message: "Phone number must be less than 20 characters" })
    .regex(/^[0-9\s\-\+\(\)]+$/, { message: "Invalid phone number format" }),
  message: z
    .string()
    .trim()
    .min(1, { message: "Message is required" })
    .max(1000, { message: "Message must be less than 1000 characters" }),
});

type ContactFormData = z.infer<typeof contactSchema>;

import { supabase } from "@/lib/supabaseClient";

const Contact = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase.from("contact_submissions").insert({
        name: data.name,
        email: data.email,
        message: data.message,
      });

      if (error) {
        throw new Error("Failed to send message: " + error.message);
      }

      toast({
        title: "Message Sent!",
        description: "We'll get back to you within 24 hours.",
      });

      reset();
    } catch (error) {
      toast({
        title: "Submission Error",
        description: "There was a problem sending your message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-black text-foreground mb-4">
            GET IN <span className="text-primary">TOUCH</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Ready to start your fitness journey? We're here to help!
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 max-w-7xl mx-auto">
          {/* Contact Form */}
          <div className="animate-slide-up">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-card border-2 border-border rounded-lg p-8">
              <div>
                <Label htmlFor="name" className="text-foreground">
                  Name *
                </Label>
                <Input
                  id="name"
                  {...register("name")}
                  className="mt-2"
                  placeholder="Your name"
                />
                {errors.name && (
                  <p className="text-destructive text-sm mt-1">{errors.name.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="email" className="text-foreground">
                  Email *
                </Label>
                <Input
                  id="email"
                  type="email"
                  {...register("email")}
                  className="mt-2"
                  placeholder="your.email@example.com"
                />
                {errors.email && (
                  <p className="text-destructive text-sm mt-1">{errors.email.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="phone" className="text-foreground">
                  Phone *
                </Label>
                <Input
                  id="phone"
                  {...register("phone")}
                  className="mt-2"
                  placeholder="+27 XX XXX XXXX"
                />
                {errors.phone && (
                  <p className="text-destructive text-sm mt-1">{errors.phone.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="message" className="text-foreground">
                  Message *
                </Label>
                <Textarea
                  id="message"
                  {...register("message")}
                  className="mt-2 min-h-[120px]"
                  placeholder="Tell us about your fitness goals..."
                />
                {errors.message && (
                  <p className="text-destructive text-sm mt-1">{errors.message.message}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-primary hover:shadow-glow font-bold"
                size="lg"
              >
                {isSubmitting ? "Sending..." : "SEND MESSAGE"}
              </Button>
            </form>
          </div>

          {/* Contact Info & Map */}
          <div className="space-y-6 animate-slide-up" style={{ animationDelay: "0.2s" }}>
            {/* Contact Details */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-card border-2 border-primary p-6 rounded-lg hover:shadow-glow transition-all duration-300">
                <div className="flex items-start gap-3">
                  <div className="bg-primary/20 p-3 rounded-lg">
                    <Phone className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground mb-1">Phone</h3>
                    <p className="text-muted-foreground text-sm">+27 11 123 4567</p>
                  </div>
                </div>
              </div>

              <div className="bg-card border-2 border-secondary p-6 rounded-lg hover:shadow-blue-glow transition-all duration-300">
                <div className="flex items-start gap-3">
                  <div className="bg-secondary/20 p-3 rounded-lg">
                    <Mail className="w-6 h-6 text-secondary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground mb-1">Email</h3>
                    <p className="text-muted-foreground text-sm">info@powerultragym.co.za</p>
                  </div>
                </div>
              </div>

              <div className="bg-card border-2 border-accent p-6 rounded-lg hover:border-accent/80 transition-all duration-300">
                <div className="flex items-start gap-3">
                  <div className="bg-accent/20 p-3 rounded-lg">
                    <MapPin className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground mb-1">Location</h3>
                    <p className="text-muted-foreground text-sm">Johannesburg, South Africa</p>
                  </div>
                </div>
              </div>

              <div className="bg-card border-2 border-border p-6 rounded-lg hover:border-primary transition-all duration-300">
                <div className="flex items-start gap-3">
                  <div className="bg-muted p-3 rounded-lg">
                    <Clock className="w-6 h-6 text-foreground" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground mb-1">Hours</h3>
                    <p className="text-muted-foreground text-sm">24/7 Access</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Map */}
            <div className="h-[400px] rounded-lg overflow-hidden border-2 border-border">
              <ContactMap />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
