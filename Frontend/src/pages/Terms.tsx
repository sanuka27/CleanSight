import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { MeshGradient } from "@/components/shared/MeshGradient";
import { RevealOnScroll } from "@/components/shared/AnimatedComponents";
import { Scale } from "lucide-react";
import { useEffect } from "react";

const sections = [
  {
    heading: "Acceptance of Terms",
    body: "By accessing or using CleanSight you agree to be bound by these Terms of Service. If you do not agree, please do not use the platform.",
  },
  {
    heading: "Account Responsibilities",
    body: "You are responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account. You must provide accurate information during registration and keep it up to date.",
  },
  {
    heading: "Acceptable Use",
    body: "You agree to use CleanSight only for lawful purposes. You must not submit fraudulent reports, upload offensive or misleading content, or attempt to interfere with the operation of the platform.",
  },
  {
    heading: "Intellectual Property",
    body: "All content, branding, and software that make up CleanSight are owned by or licensed to us. By uploading a waste report you grant CleanSight a non-exclusive, royalty-free licence to display the submitted photo and data on the platform for the purpose of coordinating cleanup activities.",
  },
  {
    heading: "Limitation of Liability",
    body: "CleanSight is provided on an 'as-is' basis. We do our best to ensure accuracy and uptime but do not guarantee uninterrupted service or that every report will result in a cleanup. To the fullest extent permitted by law, CleanSight shall not be liable for indirect or consequential damages.",
  },
  {
    heading: "Termination",
    body: "We reserve the right to suspend or terminate accounts that violate these terms. You may delete your account at any time by contacting us at support@cleansight.io.",
  },
  {
    heading: "Changes to Terms",
    body: "We may revise these Terms of Service from time to time. Material changes will be communicated via email or an in-app banner. Continued use of the platform constitutes acceptance of the updated terms.",
  },
];

const Terms = () => {
  useEffect(() => {
    document.title = "Terms of Service — CleanSight";
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
                <Scale className="w-4 h-4 text-primary" />
                Legal
              </div>
            </RevealOnScroll>

            <RevealOnScroll>
              <h1 className="font-display text-4xl md:text-5xl font-bold mb-6">
                Terms of <span className="text-gradient">Service</span>
              </h1>
            </RevealOnScroll>

            <RevealOnScroll>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Last updated: February 2026
              </p>
            </RevealOnScroll>
          </div>
        </section>

        {/* Terms sections */}
        <section className="py-20 bg-card/50">
          <div className="container mx-auto px-4 max-w-3xl space-y-10">
            {sections.map((s, i) => (
              <RevealOnScroll key={s.heading} delay={i * 0.05}>
                <div>
                  <h2 className="font-display text-xl font-bold mb-3">
                    {i + 1}. {s.heading}
                  </h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {s.body}
                  </p>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Terms;
