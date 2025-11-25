import { Heart, Trophy, Users } from "lucide-react";

const About = () => {
  return (
    <section className="py-24 bg-gradient-dark relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-secondary/10 rounded-full blur-3xl"></div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-black text-foreground mb-4">
            OUR <span className="text-primary">STORY</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Built on the strength and spirit of South Africa
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
          <div className="space-y-6 animate-slide-up">
            <p className="text-lg text-foreground leading-relaxed">
              Power Ultra Gym was born from a vision to create a fitness sanctuary that embodies the resilience, diversity, and unity of South Africa. Our founders, inspired by the rainbow nation's spirit, set out to build more than just a gym—they created a community.
            </p>
            <p className="text-lg text-foreground leading-relaxed">
              Just like our nation's flag represents unity in diversity, we bring together people from all walks of life, united by a common goal: to become the strongest version of themselves. Our colors—red for passion, blue for dedication, and green for growth—run through everything we do.
            </p>
            <p className="text-lg text-foreground leading-relaxed">
              Today, Power Ultra Gym stands as a testament to what happens when determination meets opportunity. We're not just building bodies; we're building champions, one rep at a time.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <div className="bg-card border-2 border-primary p-6 rounded-lg hover:shadow-glow transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="bg-primary/20 p-3 rounded-lg">
                  <Heart className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-2">Community First</h3>
                  <p className="text-muted-foreground">
                    We believe in the Ubuntu philosophy—"I am because we are." Every member is family.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-card border-2 border-secondary p-6 rounded-lg hover:shadow-blue-glow transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="bg-secondary/20 p-3 rounded-lg">
                  <Trophy className="w-8 h-8 text-secondary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-2">Excellence Standard</h3>
                  <p className="text-muted-foreground">
                    From our world-class equipment to expert trainers, we deliver nothing but the best.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-card border-2 border-accent p-6 rounded-lg hover:border-accent/80 transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="bg-accent/20 p-3 rounded-lg">
                  <Users className="w-8 h-8 text-accent" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-2">Growth Mindset</h3>
                  <p className="text-muted-foreground">
                    Every champion started as a beginner. We nurture your journey from day one.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16">
          {[
            { number: "10+", label: "Years Strong" },
            { number: "5000+", label: "Active Members" },
            { number: "50+", label: "Expert Trainers" },
            { number: "24/7", label: "Access" },
          ].map((stat, index) => (
            <div 
              key={index}
              className="text-center p-6 bg-card border border-border rounded-lg hover:border-primary transition-all duration-300 animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="text-4xl md:text-5xl font-black text-primary mb-2">{stat.number}</div>
              <div className="text-muted-foreground font-semibold">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default About;
