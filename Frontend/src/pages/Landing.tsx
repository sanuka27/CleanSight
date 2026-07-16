import { Navbar } from "@/components/layout/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { StatsSection } from "@/components/landing/StatsSection";
import { Footer } from "@/components/layout/Footer";
import { MeshGradient } from "@/components/shared/MeshGradient";

const Landing = () => {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <Navbar />
      
      <main>
        <HeroSection />
        <FeaturesSection />
        <HowItWorks />
        <StatsSection />

        {/* Call to Action Section */}
        <section className="py-20 relative overflow-hidden">
          <MeshGradient className="opacity-20" />
          <div className="container mx-auto px-4 relative z-10 text-center">
            <h2 className="font-display text-4xl font-bold mb-6">
              Ready to <span className="text-gradient">Transform</span> Your City?
            </h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
              Join thousands of citizens and volunteers making a tangible impact today.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a 
                href="/signup" 
                className="px-8 py-4 rounded-xl gradient-primary text-white font-semibold shadow-glow hover:shadow-glow-lg transition-all hover:scale-105 active:scale-95"
              >
                Get Started Now
              </a>
              <a 
                href="/about" 
                className="px-8 py-4 rounded-xl glass border border-border font-semibold hover:bg-card/50 transition-all hover:scale-105 active:scale-95"
              >
                Learn More
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Landing;
