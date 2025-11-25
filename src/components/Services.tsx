import { Dumbbell, Heart, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import strengthImage from "@/assets/strength-training.jpg";
import cardioImage from "@/assets/cardio-class.jpg";
import personalImage from "@/assets/personal-training.jpg";

const services = [
  {
    icon: Dumbbell,
    title: "Strength Training",
    description: "State-of-the-art equipment and expert guidance to build power and muscle",
    image: strengthImage,
  },
  {
    icon: Heart,
    title: "Cardio & HIIT",
    description: "High-intensity workouts designed to torch calories and boost endurance",
    image: cardioImage,
  },
  {
    icon: Users,
    title: "Personal Training",
    description: "One-on-one coaching tailored to your goals with certified professionals",
    image: personalImage,
  },
];

const Services = () => {
  return (
    <section className="py-24 bg-gradient-dark">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-black text-foreground mb-4">
            OUR <span className="text-primary">SERVICES</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Everything you need to reach your fitness goals under one roof
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <Card 
              key={index} 
              className="bg-card border-border hover:border-primary transition-all duration-300 group overflow-hidden animate-slide-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="relative h-48 overflow-hidden">
                <img 
                  src={service.image} 
                  alt={service.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-overlay group-hover:opacity-80 transition-opacity"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <service.icon className="w-16 h-16 text-primary" strokeWidth={2.5} />
                </div>
              </div>
              <CardContent className="p-6">
                <h3 className="text-2xl font-bold text-foreground mb-3">{service.title}</h3>
                <p className="text-muted-foreground">{service.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;
