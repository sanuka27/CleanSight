import { motion } from "framer-motion";
import { Camera, MapPin, Users, CheckCircle } from "lucide-react";
import { RevealOnScroll } from "@/components/shared/AnimatedComponents";

const steps = [
  {
    icon: Camera,
    title: "Spot & Snap",
    description: "Take a photo of the waste. Our AI automatically detects the type and severity.",
    color: "primary",
  },
  {
    icon: MapPin,
    title: "Tag Location",
    description: "Confirm the GPS location so our cleanup crews know exactly where to go.",
    color: "info",
  },
  {
    icon: Users,
    title: "Community Action",
    description: "Local volunteers and municipal teams get notified instantly to organize a cleanup.",
    color: "accent",
  },
  {
    icon: CheckCircle,
    title: "Verify & Close",
    description: "Once cleaned, the team uploads a photo proof. You get notified of the impact!",
    color: "success",
  },
];

export function HowItWorks() {
  return (
    <section className="py-24 relative overflow-hidden bg-secondary/30">
      <div className="container mx-auto px-4 relative z-10">
        <RevealOnScroll className="text-center mb-20">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-6">
            How CleanSight <span className="text-gradient">Works</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            From report to resolution, we've streamlined the process to make cleaning up your community effortless.
          </p>
        </RevealOnScroll>

        <div className="relative">
          {/* Connector Line (Desktop) */}
          <div className="hidden lg:block absolute top-12 left-0 right-0 h-0.5 bg-border/50 z-0">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/50 to-transparent w-1/2 mx-auto" />
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <RevealOnScroll key={step.title} delay={index * 0.2}>
                  <motion.div
                    className="text-center group"
                    whileHover={{ y: -5 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="relative mb-6 mx-auto w-24 h-24">
                      {/* Animated Glow Ring */}
                      <div className={`absolute inset-0 rounded-full bg-${step.color}/20 animate-pulse-soft`} />
                      <div className={`absolute inset-2 rounded-full border-2 border-${step.color}/30 border-dashed animate-spin-slow`} />
                      
                      <div className={`absolute inset-0 rounded-full bg-card flex items-center justify-center shadow-lg border-4 border-background z-10 group-hover:scale-105 transition-transform duration-300`}>
                        <Icon className={`w-8 h-8 text-${step.color}`} />
                      </div>

                      {/* Step Number Badge */}
                      <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-white font-bold text-sm shadow-md z-20">
                        {index + 1}
                      </div>
                    </div>

                    <h3 className="font-display text-xl font-bold mb-3 group-hover:text-primary transition-colors">
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed px-4">
                      {step.description}
                    </p>
                  </motion.div>
                </RevealOnScroll>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
