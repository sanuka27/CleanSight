import { motion } from "framer-motion";
import { memo } from "react";
import { 
  Camera, 
  MapPin, 
  Users, 
  Zap, 
  Shield, 
  BarChart3,
  ArrowRight 
} from "lucide-react";
import { RevealOnScroll } from "@/components/shared/AnimatedComponents";

const features = [
  {
    icon: Camera,
    title: "AI-Powered Detection",
    description: "Our advanced AI verifies waste reports instantly, ensuring accuracy and faster response times.",
    color: "primary",
    gradient: "from-primary to-emerald-400",
  },
  {
    icon: MapPin,
    title: "GPS Location Tracking",
    description: "Precise geolocation tags every report, making it easy for cleanup crews to find exact locations.",
    color: "info",
    gradient: "from-info to-cyan-400",
  },
  {
    icon: Users,
    title: "Community Volunteers",
    description: "Connect with local volunteers who are ready to take action and make a difference.",
    color: "success",
    gradient: "from-success to-emerald-400",
  },
  {
    icon: Zap,
    title: "Instant Notifications",
    description: "Real-time alerts keep everyone informed about new reports and cleanup progress.",
    color: "accent",
    gradient: "from-accent to-yellow-400",
  },
  {
    icon: Shield,
    title: "Verified Reports",
    description: "Multi-step verification ensures only legitimate reports reach cleanup teams.",
    color: "primary",
    gradient: "from-primary to-teal-400",
  },
  {
    icon: BarChart3,
    title: "Impact Analytics",
    description: "Track community progress with detailed dashboards and environmental impact metrics.",
    color: "info",
    gradient: "from-info to-blue-400",
  },
];

export const FeaturesSection = memo(function FeaturesSection() {
  return (
    <section className="py-24 relative overflow-hidden" style={{ contain: "layout style" }}>
      {/* Background elements */}
      <div className="absolute inset-0 gradient-mesh opacity-50" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <RevealOnScroll className="text-center mb-16">
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-premium mb-6"
          >
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Powerful Features</span>
          </div>
          
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            Everything You Need to{" "}
            <span className="text-gradient">Make a Difference</span>
          </h2>
          
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            CleanSight combines cutting-edge technology with community spirit to create 
            a seamless waste management experience.
          </p>
        </RevealOnScroll>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            
            return (
              <RevealOnScroll
                key={feature.title}
                delay={index * 0.1}
                className="h-full"
              >
                <motion.div
                  className="group relative h-full p-6 rounded-2xl glass-premium overflow-hidden hover:shadow-glow transition-all duration-300"
                  whileHover={{ y: -4 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  style={{ willChange: "transform" }}
                >
                  {/* Gradient overlay on hover */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />
                  
                  {/* Icon */}
                  <div className={`relative w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-5 shadow-lg`}>
                    <Icon className="w-7 h-7 text-white" />
                    
                    {/* Glow effect */}
                    <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${feature.gradient} blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-500`} />
                  </div>
                  
                  {/* Content */}
                  <h3 className="font-display text-xl font-semibold mb-3 group-hover:text-gradient transition-all duration-300">
                    {feature.title}
                  </h3>
                  
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {feature.description}
                  </p>
                  
                  {/* Arrow indicator */}
                  <div className="mt-4 flex items-center gap-2 text-primary opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-0 group-hover:translate-x-2">
                    <span className="text-sm font-medium">Learn more</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                  
                  {/* Corner decoration */}
                  <div className="absolute -bottom-10 -right-10 w-32 h-32 rounded-full bg-gradient-to-br from-primary/10 to-transparent blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </motion.div>
              </RevealOnScroll>
            );
          })}
        </div>
      </div>
    </section>
  );
});
