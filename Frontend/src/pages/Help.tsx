import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { MeshGradient } from "@/components/shared/MeshGradient";
import { RevealOnScroll } from "@/components/shared/AnimatedComponents";
import { HelpCircle, MessageSquare, FileText, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect } from "react";

const topics = [
  {
    icon: FileText,
    title: "Reporting Waste",
    description:
      "Take a photo of illegal dumping, tag the location, and submit your report. Our AI validates the image and routes it to the right team automatically.",
  },
  {
    icon: MapPin,
    title: "Live Map & Tracking",
    description:
      "View all open reports on an interactive map. Each pin shows status — pending, assigned, or resolved — so you always know what's happening nearby.",
  },
  {
    icon: HelpCircle,
    title: "Roles & Permissions",
    description:
      "Citizens submit reports, volunteers accept cleanup tasks, and staff manage the dashboard. Your role is assigned at registration and controls what you see.",
  },
  {
    icon: MessageSquare,
    title: "Need More Help?",
    description:
      "If you can't find what you're looking for, drop us a message on the Contact page and we'll get back to you within 48 hours.",
    cta: { label: "Contact Us", href: "/contact" },
  },
];

const Help = () => {
  useEffect(() => {
    document.title = "Help Center — CleanSight";
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
                <HelpCircle className="w-4 h-4 text-primary" />
                Help Center
              </div>
            </RevealOnScroll>

            <RevealOnScroll>
              <h1 className="font-display text-4xl md:text-5xl font-bold mb-6">
                How Can We <span className="text-gradient">Help</span>?
              </h1>
            </RevealOnScroll>

            <RevealOnScroll>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Everything you need to know about using CleanSight — from
                submitting your first report to tracking community clean-ups.
              </p>
            </RevealOnScroll>
          </div>
        </section>

        {/* Topics */}
        <section className="py-20 bg-card/50">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="grid sm:grid-cols-2 gap-8">
              {topics.map((topic, i) => (
                <RevealOnScroll key={topic.title} delay={i * 0.1}>
                  <div className="glass rounded-2xl p-6 border border-border/50 h-full flex flex-col">
                    <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center shadow-glow mb-4">
                      <topic.icon className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{topic.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                      {topic.description}
                    </p>
                    {topic.cta && (
                      <Link
                        to={topic.cta.href}
                        className="mt-4 text-primary text-sm font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                      >
                        {topic.cta.label} →
                      </Link>
                    )}
                  </div>
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

export default Help;
