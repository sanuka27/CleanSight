import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { MeshGradient } from "@/components/shared/MeshGradient";
import { RevealOnScroll } from "@/components/shared/AnimatedComponents";
import { ShieldCheck } from "lucide-react";
import { useEffect } from "react";

const sections = [
  {
    heading: "Information We Collect",
    body: "When you create an account we store your name, email address, and chosen role. When you submit a waste report we collect the uploaded photo, a text description, and the GPS coordinates of the report location. We also record basic usage analytics (page views and feature interactions) to improve the platform.",
  },
  {
    heading: "How We Use Your Data",
    body: "Your data is used exclusively to operate CleanSight — routing reports to the right cleanup teams, displaying them on the public map, and powering the analytics dashboard. We do not sell, rent, or share personal information with third-party advertisers.",
  },
  {
    heading: "Data Storage & Security",
    body: "All data is stored in encrypted databases. Authentication is handled by Firebase Auth with industry-standard token management. Uploaded images are stored in a private cloud bucket with access restricted to authorised services.",
  },
  {
    heading: "Cookies & Local Storage",
    body: "We use a session cookie to keep you signed in and may store non-sensitive preferences (such as newsletter opt-in status) in your browser's localStorage. No third-party tracking cookies are used.",
  },
  {
    heading: "Your Rights",
    body: "You may request a copy of your data or ask us to delete your account at any time by contacting us at privacy@cleansight.io. We will process requests within 30 days.",
  },
  {
    heading: "Changes to This Policy",
    body: "We may update this Privacy Policy as features evolve. When we do, we will revise the 'Last updated' date at the top of this page and, where appropriate, notify you via email.",
  },
];

const Privacy = () => {
  useEffect(() => {
    document.title = "Privacy Policy — CleanSight";
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
                <ShieldCheck className="w-4 h-4 text-primary" />
                Privacy
              </div>
            </RevealOnScroll>

            <RevealOnScroll>
              <h1 className="font-display text-4xl md:text-5xl font-bold mb-6">
                Privacy <span className="text-gradient">Policy</span>
              </h1>
            </RevealOnScroll>

            <RevealOnScroll>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Last updated: February 2026
              </p>
            </RevealOnScroll>
          </div>
        </section>

        {/* Policy sections */}
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

export default Privacy;
