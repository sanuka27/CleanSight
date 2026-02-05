import { motion } from "framer-motion";
import { 
  Sparkles, 
  Shield, 
  BarChart3, 
  Bell, 
  Globe, 
  Smartphone 
} from "lucide-react";

const features = [
  {
    icon: Sparkles,
    title: "AI-Powered Detection",
    description: "Our pre-trained model automatically validates waste images, ensuring accurate reports and reducing false submissions.",
  },
  {
    icon: Shield,
    title: "Role-Based Access",
    description: "Citizens, volunteers, municipal staff, and admins each have tailored dashboards and permissions.",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description: "Track cleanup progress, volunteer activity, and community impact with comprehensive analytics.",
  },
  {
    icon: Bell,
    title: "Real-Time Updates",
    description: "Get notified when new reports are filed in your area or when your cleanup tasks are approved.",
  },
  {
    icon: Globe,
    title: "Interactive Maps",
    description: "Visualize all waste reports on an interactive map with filtering by status, type, and urgency.",
  },
  {
    icon: Smartphone,
    title: "Mobile Optimized",
    description: "Report waste on the go with our mobile-friendly interface. GPS tagging works seamlessly on any device.",
  },
];

export function FeaturesSection() {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
            Powerful Features for{" "}
            <span className="text-gradient">Cleaner Communities</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Everything you need to report, track, and coordinate community cleanup efforts.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group"
              >
                <div className="h-full bg-card rounded-2xl p-6 border border-border hover:border-primary/30 hover:shadow-elevated transition-all">
                  <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Icon className="w-6 h-6 text-primary-foreground" />
                  </div>

                  <h3 className="font-display text-lg font-semibold mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {feature.description}
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
