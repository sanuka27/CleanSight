import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { MeshGradient } from "@/components/shared/MeshGradient";
import { RevealOnScroll } from "@/components/shared/AnimatedComponents";
import { Leaf, Camera, BrainCircuit, BarChart3, Sparkles } from "lucide-react";
import { useEffect } from "react";

const steps = [
  {
    icon: Camera,
    title: "Report",
    description:
      "Citizens snap a photo of illegal dumping or waste build-up and submit a geo-tagged report in seconds.",
  },
  {
    icon: BrainCircuit,
    title: "AI Validate",
    description:
      "Our AI pipeline verifies the image, classifies waste type, and scores severity — eliminating false reports automatically.",
  },
  {
    icon: BarChart3,
    title: "Dashboard",
    description:
      "City staff and admins see real-time analytics, heatmaps, and trends so they can prioritise resources where it matters most.",
  },
  {
    icon: Sparkles,
    title: "Cleanup",
    description:
      "Verified reports are routed to volunteer crews or municipal teams, tracked from assignment through resolution.",
  },
];

const About = () => {
  useEffect(() => {
    document.title = "About Us — CleanSight";
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative pt-32 pb-20 overflow-hidden">
          <MeshGradient className="opacity-20" />
          <div className="container mx-auto px-4 relative z-10 text-center max-w-3xl">
            <RevealOnScroll>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-border/50 text-sm text-muted-foreground mb-6">
                <Leaf className="w-4 h-4 text-primary" />
                Our Mission
              </div>
            </RevealOnScroll>

            <RevealOnScroll>
              <h1 className="font-display text-4xl md:text-5xl font-bold mb-6">
                Making Cities <span className="text-gradient">Cleaner</span>,
                One Report at a Time
              </h1>
            </RevealOnScroll>

            <RevealOnScroll>
              <p className="text-muted-foreground text-lg leading-relaxed">
                CleanSight is a community-driven platform that turns everyday
                citizens into environmental watchdogs. By combining
                crowd-sourced reporting with AI-powered validation and
                real-time dashboards, we give cities the visibility they need
                to keep streets, parks, and waterways free of illegal waste.
              </p>
            </RevealOnScroll>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20 bg-card/50">
          <div className="container mx-auto px-4">
            <RevealOnScroll>
              <h2 className="font-display text-3xl font-bold text-center mb-4">
                How It <span className="text-gradient">Works</span>
              </h2>
              <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
                From a photo on your phone to a cleaner neighbourhood — here's
                the journey of every report.
              </p>
            </RevealOnScroll>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {steps.map((step, i) => (
                <RevealOnScroll key={step.title} delay={i * 0.1}>
                  <div className="relative glass rounded-2xl p-6 border border-border/50 h-full flex flex-col items-center text-center">
                    <div className="w-14 h-14 rounded-xl gradient-primary flex items-center justify-center mb-4 shadow-glow">
                      <step.icon className="w-6 h-6 text-white" />
                    </div>
                    <span className="absolute -top-3 -left-3 w-8 h-8 rounded-full gradient-primary text-white text-sm font-bold flex items-center justify-center shadow-glow">
                      {i + 1}
                    </span>
                    <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </RevealOnScroll>
              ))}
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="py-20">
          <div className="container mx-auto px-4 max-w-3xl text-center">
            <RevealOnScroll>
              <h2 className="font-display text-3xl font-bold mb-6">
                Why We <span className="text-gradient">Exist</span>
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Illegal dumping harms public health, pollutes waterways, and
                erodes community pride. Existing reporting channels are slow,
                fragmented, and hard to measure. CleanSight closes that gap by
                giving everyone — citizens, volunteers, city staff — a single
                source of truth backed by data and AI.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                We believe clean cities start with informed communities. Our
                open platform is designed to scale from a single neighbourhood
                pilot to city-wide deployment, with transparent metrics every
                step of the way.
              </p>
            </RevealOnScroll>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default About;
