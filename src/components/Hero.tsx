import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-gym.jpg";

const Hero = () => {
  const scrollToSection = (id: string) => {
    const section = document.querySelector(`#${id}`);
    if (section) {
      section.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img 
          src={heroImage} 
          alt="Power Ultra Gym - State of the art fitness facility" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-overlay"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 text-center animate-fade-in">
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-foreground mb-6 tracking-tight">
          POWER ULTRA <span className="text-primary">GYM</span>
        </h1>
        <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Transform your body. Elevate your mind. Unleash your potential.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button 
            size="lg" 
            className="bg-gradient-primary text-primary-foreground hover:shadow-glow transition-all duration-300 text-lg px-8 py-6 font-bold animate-pulse-glow"
            onClick={() => scrollToSection('pricing')}
          >
            START YOUR JOURNEY
          </Button>
          <Button 
            size="lg" 
            variant="outline"
            className="border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300 text-lg px-8 py-6 font-bold"
            onClick={() => scrollToSection('schedule')}
          >
            VIEW CLASSES
          </Button>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10 animate-bounce">
        <div className="w-6 h-10 border-2 border-primary rounded-full flex items-start justify-center p-2">
          <div className="w-1 h-3 bg-primary rounded-full"></div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
