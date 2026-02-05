import { Github, Twitter, Linkedin, Leaf, Heart } from "lucide-react";
import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="relative bg-card border-t border-border/50 pt-16 pb-8 overflow-hidden">
      {/* Background glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="col-span-1 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                <Leaf className="w-4 h-4 text-white" />
              </div>
              <span className="font-display text-xl font-bold">
                Clean<span className="text-gradient">Sight</span>
              </span>
            </Link>
            <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
              Empowering communities to create cleaner, safer environments through technology and collaboration.
            </p>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 rounded-full glass flex items-center justify-center text-muted-foreground hover:text-primary hover:scale-110 transition-all">
                <Github className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full glass flex items-center justify-center text-muted-foreground hover:text-primary hover:scale-110 transition-all">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full glass flex items-center justify-center text-muted-foreground hover:text-primary hover:scale-110 transition-all">
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold mb-4">Platform</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link to="/report" className="hover:text-primary transition-colors">Report Waste</Link></li>
              <li><Link to="/map" className="hover:text-primary transition-colors">Live Map</Link></li>
              <li><Link to="/dashboard" className="hover:text-primary transition-colors">Dashboard</Link></li>
              <li><Link to="/volunteer" className="hover:text-primary transition-colors">Volunteer</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Contact</a></li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
             <h4 className="font-semibold mb-4">Stay Updated</h4>
             <p className="text-sm text-muted-foreground mb-4">
               Get the latest updates on community cleanups and features.
             </p>
             <form className="flex gap-2">
               <input 
                  type="email" 
                  placeholder="Enter email" 
                  className="bg-background border border-border rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
               />
               <button className="gradient-primary text-white rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity">
                  Join
               </button>
             </form>
          </div>
        </div>

        <div className="border-t border-border/50 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© 2024 CleanSight. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Made with <Heart className="w-4 h-4 text-destructive fill-destructive" /> by the Community
          </p>
        </div>
      </div>
    </footer>
  );
}
