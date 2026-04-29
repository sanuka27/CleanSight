import { useEffect, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { MeshGradient } from "@/components/shared/MeshGradient";
import { RevealOnScroll } from "@/components/shared/AnimatedComponents";
import { Button } from "@/components/ui/button";
import NotFound from "@/pages/NotFound";
import {
  FEATURE_CARDS,
  FEATURE_DETAILS,
  type FeatureId,
} from "@/constants/features";

const isFeatureId = (value: string): value is FeatureId => value in FEATURE_DETAILS;

const FeatureDetail = () => {
  const { featureId } = useParams();
  const detail = featureId && isFeatureId(featureId)
    ? FEATURE_DETAILS[featureId]
    : undefined;

  const related = useMemo(
    () =>
      FEATURE_CARDS.filter((feature) => feature.id !== detail?.id).slice(0, 3),
    [detail?.id],
  );

  useEffect(() => {
    document.title = detail ? `${detail.title} — CleanSight` : "Feature — CleanSight";
  }, [detail]);

  if (!detail) {
    return <NotFound />;
  }

  const Icon = detail.icon;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative pt-32 pb-16 overflow-hidden">
          <MeshGradient className="opacity-20" />
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-3xl">
              <RevealOnScroll>
                <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full glass border border-border/50 text-sm text-muted-foreground mb-6">
                  <span
                    className={`w-10 h-10 rounded-xl bg-gradient-to-br ${detail.gradient} flex items-center justify-center shadow-glow`}
                  >
                    <Icon className="w-5 h-5 text-white" />
                  </span>
                  <span className="font-medium">{detail.eyebrow}</span>
                </div>
              </RevealOnScroll>

              <RevealOnScroll>
                <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                  {detail.title}
                  <span className="block text-gradient mt-2">
                    {detail.headline}
                  </span>
                </h1>
              </RevealOnScroll>

              <RevealOnScroll>
                <p className="text-muted-foreground text-lg leading-relaxed mb-8">
                  {detail.summary}
                </p>
              </RevealOnScroll>

              <RevealOnScroll>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    asChild
                    size="lg"
                    className="gap-2 px-8 py-6 text-base rounded-xl gradient-primary text-white shadow-glow hover:shadow-glow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Link to={detail.cta.primaryHref}>
                      {detail.cta.primaryLabel}
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="gap-2 px-8 py-6 text-base rounded-xl glass-premium border border-border/60 hover:bg-card/60"
                  >
                    <Link to={detail.cta.secondaryHref}>
                      {detail.cta.secondaryLabel}
                    </Link>
                  </Button>
                </div>
              </RevealOnScroll>
            </div>

            <RevealOnScroll className="mt-12">
              <div className="grid sm:grid-cols-3 gap-4">
                {detail.stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="glass-premium rounded-2xl border border-border/50 p-4"
                  >
                    <p className="text-sm text-muted-foreground mb-2">{stat.label}</p>
                    <p className="font-display text-xl font-bold">{stat.value}</p>
                  </div>
                ))}
              </div>
            </RevealOnScroll>
          </div>
        </section>

        {/* Highlights */}
        <section className="py-20 bg-card/50">
          <div className="container mx-auto px-4">
            <RevealOnScroll className="text-center mb-12">
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
                What It <span className="text-gradient">Unlocks</span>
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Practical advantages that keep reports accurate, teams aligned, and cleanup efforts moving fast.
              </p>
            </RevealOnScroll>

            <div className="grid md:grid-cols-3 gap-6">
              {detail.highlights.map((highlight) => (
                <RevealOnScroll key={highlight.title}>
                  <div className="glass-premium rounded-2xl p-6 border border-border/50 h-full">
                    <div
                      className={`w-12 h-12 rounded-xl bg-gradient-to-br ${detail.gradient} flex items-center justify-center mb-4 shadow-glow`}
                    >
                      <highlight.icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">
                      {highlight.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {highlight.description}
                    </p>
                  </div>
                </RevealOnScroll>
              ))}
            </div>
          </div>
        </section>

        {/* Workflow + Capabilities */}
        <section className="py-20">
          <div className="container mx-auto px-4 grid lg:grid-cols-2 gap-12">
            <RevealOnScroll>
              <div className="glass rounded-2xl p-8 border border-border/50 h-full">
                <h2 className="font-display text-2xl font-bold mb-6">
                  Workflow Overview
                </h2>
                <div className="space-y-6">
                  {detail.workflow.map((step, index) => (
                    <div key={step.title} className="flex gap-4">
                      <div
                        className={`w-10 h-10 rounded-full bg-gradient-to-br ${detail.gradient} flex items-center justify-center text-white font-semibold shadow-glow flex-shrink-0`}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">{step.title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </RevealOnScroll>

            <RevealOnScroll>
              <div className="glass rounded-2xl p-8 border border-border/50 h-full">
                <h2 className="font-display text-2xl font-bold mb-6">
                  Capabilities
                </h2>
                <div className="grid gap-4">
                  {detail.capabilities.map((item) => (
                    <div
                      key={item.title}
                      className="flex items-start gap-3 rounded-xl border border-border/40 bg-card/60 p-4"
                    >
                      <div
                        className={`w-3 h-3 rounded-full bg-gradient-to-br ${detail.gradient} mt-2`}
                      />
                      <div>
                        <p className="font-medium mb-1">{item.title}</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </RevealOnScroll>
          </div>
        </section>

        {/* Related Features */}
        <section className="py-20 bg-card/50">
          <div className="container mx-auto px-4">
            <RevealOnScroll className="text-center mb-12">
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
                Explore More <span className="text-gradient">Features</span>
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Pair this capability with other parts of the platform for full end-to-end coverage.
              </p>
            </RevealOnScroll>

            <div className="grid md:grid-cols-3 gap-6">
              {related.map((feature) => {
                const RelatedIcon = feature.icon;
                return (
                  <RevealOnScroll key={feature.id}>
                    <Link
                      to={feature.href}
                      className="group glass-premium rounded-2xl p-6 border border-border/50 h-full flex flex-col justify-between transition-all hover:shadow-glow"
                    >
                      <div>
                        <div
                          className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 shadow-glow`}
                        >
                          <RelatedIcon className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="font-semibold text-lg mb-2 group-hover:text-gradient transition-all">
                          {feature.title}
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {feature.description}
                        </p>
                      </div>
                      <div className="mt-6 flex items-center gap-2 text-primary font-medium text-sm">
                        Learn more
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </Link>
                  </RevealOnScroll>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default FeatureDetail;
