import { Instagram, Facebook, Twitter, MapPin, Phone, Mail } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-gym-darker text-foreground py-12 border-t border-border">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div>
            <h3 className="text-2xl font-black mb-4">
              POWER ULTRA <span className="text-primary">GYM</span>
            </h3>
            <p className="text-muted-foreground">
              Transform your body, elevate your mind, unleash your potential.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-bold text-lg mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">About Us</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Classes</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Trainers</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Blog</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-bold text-lg mb-4">Contact</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-muted-foreground">123 Fitness Ave, Gym City, GY 12345</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-5 h-5 text-primary" />
                <span className="text-muted-foreground">(555) 123-4567</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary" />
                <span className="text-muted-foreground">info@powerultragym.com</span>
              </li>
            </ul>
          </div>

          {/* Hours */}
          <div>
            <h4 className="font-bold text-lg mb-4">Hours</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li>Monday - Friday: 5am - 11pm</li>
              <li>Saturday: 7am - 9pm</li>
              <li>Sunday: 8am - 8pm</li>
            </ul>
          </div>
        </div>

        {/* Social & Copyright */}
        <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-muted-foreground text-sm">
            © 2024 Power Ultra Gym. All rights reserved.
          </p>
          <div className="flex gap-4">
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
              <Instagram className="w-6 h-6" />
            </a>
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
              <Facebook className="w-6 h-6" />
            </a>
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
              <Twitter className="w-6 h-6" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
