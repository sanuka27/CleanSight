import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MeshGradient } from "@/components/shared/MeshGradient";
import { RevealOnScroll } from "@/components/shared/AnimatedComponents";
import { Users, Star, Medal, ArrowRight, Heart, Calendar, MapPin } from "lucide-react";

const opportunities = [
  {
    title: "Beach Cleanup Drive",
    location: "Sunset Beach",
    date: "Sat, Aug 12 • 9:00 AM",
    participants: 24,
    maxParticipants: 50,
    tags: ["Community", "Outdoor"],
    image: "bg-blue-500/10",
  },
  {
    title: "Park Restoration",
    location: "Central Park West",
    date: "Sun, Aug 13 • 10:00 AM",
    participants: 12,
    maxParticipants: 20,
    tags: ["Gardening", "Maintenance"],
    image: "bg-green-500/10",
  },
  {
    title: "Urban Waste Audit",
    location: "Downtown District",
    date: "Wed, Aug 16 • 2:00 PM",
    participants: 5,
    maxParticipants: 10,
    tags: ["Data", "Research"],
    image: "bg-purple-500/10",
  },
];

const benefits = [
  { icon: Medal, title: "Earn Badges", desc: "Get recognized for your contributions with digital badges." },
  { icon: Users, title: "Meet Like-minds", desc: "Connect with others who care about the environment." },
  { icon: Star, title: "Impact Score", desc: "Track your personal impact on the community cleanliness." },
];

const Volunteer = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="flex-1 relative">
        <MeshGradient className="opacity-20 pointer-events-none" />

        {/* Hero */}
        <section className="pt-32 pb-20 px-4">
          <div className="container mx-auto text-center max-w-4xl relative z-10">
            <RevealOnScroll>
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-premium mb-6 text-primary"
              >
                <Heart className="w-4 h-4 fill-primary" />
                <span className="font-semibold text-sm">Join the Movement</span>
              </motion.div>
              
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                Become a <span className="text-gradient">CleanSight Hero</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
                Join our community of volunteers transforming neighborhoods one cleanup at a time.
              </p>
              
              <Button size="lg" className="gradient-primary text-white shadow-glow hover:shadow-glow-lg text-lg px-8 py-6 rounded-xl">
                Sign Up as Volunteer
              </Button>
            </RevealOnScroll>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="container mx-auto">
            <div className="grid md:grid-cols-3 gap-8">
              {benefits.map((benefit, index) => {
                const Icon = benefit.icon;
                return (
                  <RevealOnScroll key={benefit.title} delay={index * 0.1}>
                    <div className="glass-premium p-8 rounded-2xl text-center hover:translate-y-[-5px] transition-transform duration-300">
                      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6 text-primary">
                        <Icon className="w-8 h-8" />
                      </div>
                      <h3 className="font-display text-xl font-bold mb-3">{benefit.title}</h3>
                      <p className="text-muted-foreground">{benefit.desc}</p>
                    </div>
                  </RevealOnScroll>
                );
              })}
            </div>
          </div>
        </section>

        {/* Opportunities */}
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="flex items-center justify-between mb-12">
              <h2 className="font-display text-3xl font-bold">Upcoming Opportunities</h2>
              <Button variant="ghost" className="text-primary hover:text-primary/80">
                View All <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {opportunities.map((opp, index) => (
                <RevealOnScroll key={opp.title} delay={index * 0.1}>
                  <motion.div 
                    className="group glass-premium rounded-2xl overflow-hidden hover:shadow-glow transition-all duration-300 border border-border/50"
                  >
                    <div className={`h-48 ${opp.image} relative overflow-hidden`}>
                      <div className="absolute inset-0 flex items-center justify-center">
                         <MapPin className="w-12 h-12 text-foreground/20" />
                      </div>
                      <div className="absolute top-4 right-4 bg-background/80 backdrop-blur px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                        {opp.participants}/{opp.maxParticipants} Spots
                      </div>
                    </div>
                    
                    <div className="p-6">
                      <div className="flex gap-2 mb-4">
                        {opp.tags.map(tag => (
                          <Badge key={tag} variant="secondary" className="bg-secondary/50">{tag}</Badge>
                        ))}
                      </div>
                      
                      <h3 className="font-display text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                        {opp.title}
                      </h3>
                      
                      <div className="space-y-2 mb-6">
                        <div className="flex items-center text-sm text-muted-foreground">
                          <MapPin className="w-4 h-4 mr-2" />
                          {opp.location}
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4 mr-2" />
                          {opp.date}
                        </div>
                      </div>

                      <Button className="w-full glass border border-primary/30 hover:bg-primary hover:text-white transition-all">
                        Join Event
                      </Button>
                    </div>
                  </motion.div>
                </RevealOnScroll>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Volunteer;
