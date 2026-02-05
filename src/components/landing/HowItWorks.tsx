import { motion } from "framer-motion";
import { Camera, MapPin, Users, CheckCircle } from "lucide-react";

const steps = [
  {
    icon: Camera,
    title: "Capture & Report",
    description: "Take a photo of garbage or waste. Our AI validates the image and automatically tags your GPS location.",
    color: "primary",
  },
  {
    icon: MapPin,
    title: "Map Visualization",
    description: "Reports appear on our real-time map dashboard, giving everyone visibility into community waste issues.",
    color: "info",
  },
  {
    icon: Users,
    title: "Volunteer Assignment",
    description: "Volunteers can accept cleanup tasks in their area. Municipal staff can coordinate larger operations.",
    color: "warning",
  },
  {
    icon: CheckCircle,
    title: "Cleanup & Verify",
    description: "After cleanup, upload proof photos. Track your impact and earn recognition for your contributions.",
    color: "success",
  },
];

export function HowItWorks() {
  return (
    <section className="py-20 bg-secondary/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
            How CleanSight Works
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            From reporting to cleanup, our platform streamlines the entire process
            of keeping communities clean.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="relative"
              >
                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-12 left-[60%] w-full h-0.5 bg-border" />
                )}

                <div className="bg-card rounded-2xl p-6 shadow-soft hover:shadow-elevated transition-shadow relative z-10">
                  {/* Step Number */}
                  <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center shadow-soft">
                    {index + 1}
                  </div>

                  <div className={`w-14 h-14 rounded-xl bg-${step.color}/10 flex items-center justify-center mb-4`}>
                    <Icon className={`w-7 h-7 text-${step.color}`} />
                  </div>

                  <h3 className="font-display text-xl font-semibold mb-2">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
