import { motion } from "framer-motion";
import { memo } from "react";
import { ArrowRight, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { RevealOnScroll } from "@/components/shared/AnimatedComponents";
import { FEATURE_CARDS } from "@/constants/features";

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
          {FEATURE_CARDS.map((feature, index) => {
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
                  
                  {/* Learn more button */}
                  <Link
                    to={feature.href}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm font-semibold text-primary opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 transform translate-x-0 md:group-hover:translate-x-2"
                    aria-label={`Learn more about ${feature.title}`}
                  >
                    Learn more
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  
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
