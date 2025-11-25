import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BeforeAfterSlider from "./BeforeAfterSlider";
import heroGym from "@/assets/hero-gym.jpg";
import strengthTraining from "@/assets/strength-training.jpg";
import cardioClass from "@/assets/cardio-class.jpg";
import personalTraining from "@/assets/personal-training.jpg";
import galleryWeights from "@/assets/gallery-weights.jpg";
import galleryCardio from "@/assets/gallery-cardio.jpg";
import galleryLocker from "@/assets/gallery-locker.jpg";
import before1 from "@/assets/before-1.jpg";
import after1 from "@/assets/after-1.jpg";
import before2 from "@/assets/before-2.jpg";
import after2 from "@/assets/after-2.jpg";

const facilityImages = [
  { src: galleryWeights, alt: "Weight training area with red and blue lighting" },
  { src: galleryCardio, alt: "Modern cardio equipment with panoramic windows" },
  { src: galleryLocker, alt: "Professional locker room facilities" },
  { src: heroGym, alt: "State-of-the-art gym facility" },
  { src: strengthTraining, alt: "Strength training equipment and free weights" },
  { src: cardioClass, alt: "Group cardio class in progress" },
  { src: personalTraining, alt: "Personal training session" },
];

const transformations = [
  {
    before: before1,
    after: after1,
    beforeAlt: "Client before transformation",
    afterAlt: "Client after 6 months - muscular and confident",
    story: "6 Months Journey",
    stats: "Lost 15kg | Gained Muscle | Transformed Life",
  },
  {
    before: before2,
    after: after2,
    beforeAlt: "Client before fitness journey",
    afterAlt: "Client after transformation - lean and strong",
    story: "12 Months Dedication",
    stats: "Lost 30kg | Built Strength | Found Confidence",
  },
];

const Gallery = () => {
  const [activeTab, setActiveTab] = useState("facilities");

  return (
    <section className="py-24 bg-gradient-dark relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,hsl(var(--primary)/0.1),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,hsl(var(--secondary)/0.1),transparent_50%)]" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-5xl md:text-6xl font-black text-foreground mb-4">
            OUR <span className="text-primary">GALLERY</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Witness the transformations and explore our world-class facilities
          </p>
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-12 bg-card/50 backdrop-blur-sm">
            <TabsTrigger
              value="facilities"
              className="text-lg font-bold data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground"
            >
              Facilities
            </TabsTrigger>
            <TabsTrigger
              value="transformations"
              className="text-lg font-bold data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground"
            >
              Transformations
            </TabsTrigger>
          </TabsList>

          {/* Facilities Tab */}
          <TabsContent value="facilities" className="animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {facilityImages.map((image, index) => (
                <div
                  key={index}
                  className="group relative overflow-hidden rounded-lg aspect-video hover-scale"
                >
                  <img
                    src={image.src}
                    alt={image.alt}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-overlay opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end">
                    <p className="text-foreground font-bold text-lg p-4">
                      {image.alt}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Transformations Tab */}
          <TabsContent value="transformations" className="animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto">
              {transformations.map((transformation, index) => (
                <div key={index} className="space-y-4">
                  <BeforeAfterSlider
                    beforeImage={transformation.before}
                    afterImage={transformation.after}
                    beforeAlt={transformation.beforeAlt}
                    afterAlt={transformation.afterAlt}
                  />
                  <div className="text-center space-y-2">
                    <h3 className="text-2xl font-black text-foreground">
                      {transformation.story}
                    </h3>
                    <p className="text-muted-foreground font-semibold">
                      {transformation.stats}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Transformation CTA */}
            <div className="mt-16 text-center bg-card/30 backdrop-blur-sm border-2 border-primary/30 rounded-lg p-8 max-w-3xl mx-auto">
              <h3 className="text-3xl font-black text-foreground mb-4">
                Ready to Write Your Success Story?
              </h3>
              <p className="text-muted-foreground text-lg mb-6">
                Join hundreds of members who have transformed their lives at Power Ultra Gym
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button className="bg-gradient-primary text-primary-foreground px-8 py-4 rounded-md font-bold text-lg hover:shadow-glow transition-all duration-300">
                  START YOUR TRANSFORMATION
                </button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
};

export default Gallery;
