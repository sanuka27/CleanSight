import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Camera, MapPin, CheckCircle, ArrowRight, Sparkles, Zap } from "lucide-react";
import { MeshGradient } from "@/components/shared/MeshGradient";
import { AnimatedCounter, FloatingCard } from "@/components/shared/AnimatedComponents";
import { memo } from "react";

export const HeroSection = memo(function HeroSection() {

  const stats = [
    { value: 2500, suffix: "+", label: "Reports Filed" },
    { value: 1200, suffix: "+", label: "Cleanups Done" },
    { value: 500, suffix: "+", label: "Volunteers" },
  ];

  return (
    <section className="relative min-h-screen overflow-hidden">
      {/* Animated Background */}
      <MeshGradient />
      
      {/* Noise texture overlay */}
      <div className="absolute inset-0 noise pointer-events-none" />

      <div className="container mx-auto px-4 pt-28 pb-20 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="text-center lg:text-left"
          >
            {/* Badge */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-premium mb-8"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              <span className="text-sm font-medium bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">
                Community-Powered Cleanup
              </span>
              <Sparkles className="w-4 h-4 text-primary" />
            </motion.div>

            {/* Heading */}
            <motion.h1 
              className="font-display text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-6 leading-[1.1]"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
            >
              Report Waste.{" "}
              <span className="text-gradient-aurora inline-block">
                Coordinate Cleanup.
              </span>{" "}
              <br className="hidden lg:block" />
              Transform Communities.
            </motion.h1>

            {/* Description */}
            <motion.p 
              className="text-lg md:text-xl text-muted-foreground mb-10 max-w-xl mx-auto lg:mx-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.3, ease: "easeOut" }}
            >
              CleanSight empowers citizens to report garbage issues, volunteers to take action,
              and municipalities to efficiently manage cleanup operations.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div 
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-14"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.4, ease: "easeOut" }}
            >
              <Link to="/report">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <Button 
                    size="lg" 
                    className="w-full sm:w-auto gap-2 gradient-primary text-white shadow-glow hover:shadow-glow-lg transition-all duration-300 px-8 py-6 text-lg rounded-xl shimmer"
                  >
                    <Camera className="w-5 h-5" />
                    Report Waste Now
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </motion.div>
              </Link>
              <Link to="/map">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <Button 
                    variant="outline" 
                    size="lg" 
                    className="w-full sm:w-auto gap-2 glass-premium hover:bg-card/80 transition-all duration-300 px-8 py-6 text-lg rounded-xl border-primary/30"
                  >
                    <MapPin className="w-5 h-5" />
                    View Report Map
                  </Button>
                </motion.div>
              </Link>
            </motion.div>

            {/* Stats */}
            <motion.div 
              className="grid grid-cols-3 gap-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.5, ease: "easeOut" }}
            >
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  className="text-center lg:text-left"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.7 + index * 0.1 }}
                >
                  <p className="font-display text-3xl md:text-4xl font-bold text-gradient mb-1">
                    <AnimatedCounter end={stat.value} suffix={stat.suffix} duration={2.5} />
                  </p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right Content - Hero Visual */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
            className="relative hidden lg:block"
          >
            {/* Main visual container */}
            <div className="relative">
              {/* Glowing background */}
              <div className="absolute inset-0 gradient-primary rounded-3xl blur-3xl opacity-20 scale-110" />
              
              {/* Main card */}
              <div className="relative glass-premium rounded-3xl p-8 shadow-2xl">
                {/* Dashboard preview mockup */}
                <div className="space-y-6">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                        <Zap className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">Live Dashboard</p>
                        <p className="text-xs text-muted-foreground">Real-time updates</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <span className="w-3 h-3 rounded-full bg-success animate-pulse" />
                      <span className="w-3 h-3 rounded-full bg-warning" />
                      <span className="w-3 h-3 rounded-full bg-destructive" />
                    </div>
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: "Active Reports", value: "47", trend: "+12%" },
                      { label: "Volunteers", value: "23", trend: "+5%" },
                      { label: "Resolved", value: "892", trend: "+24%" },
                      { label: "Response Time", value: "2.4h", trend: "-18%" },
                    ].map((item, i) => (
                      <motion.div
                        key={item.label}
                        className="glass rounded-xl p-4"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.8 + i * 0.1 }}
                      >
                        <p className="text-2xl font-bold">{item.value}</p>
                        <p className="text-xs text-muted-foreground">{item.label}</p>
                        <p className={`text-xs font-medium ${item.trend.startsWith('+') ? 'text-success' : 'text-info'}`}>
                          {item.trend}
                        </p>
                      </motion.div>
                    ))}
                  </div>

                  {/* Progress bars */}
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>Weekly Progress</span>
                        <span className="text-primary">78%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full gradient-primary rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: "78%" }}
                          transition={{ duration: 1.5, delay: 1, ease: "easeOut" }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating cards */}
              <FloatingCard 
                className="absolute -left-8 top-1/4 max-w-[180px]" 
                delay={0.6}
                direction="left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Report Verified</p>
                    <p className="text-xs text-muted-foreground">AI-powered</p>
                  </div>
                </div>
              </FloatingCard>

              <FloatingCard 
                className="absolute -right-4 bottom-1/4 max-w-[180px]" 
                delay={0.8}
                direction="right"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-info/20 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-info" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">GPS Tagged</p>
                    <p className="text-xs text-muted-foreground">Precise location</p>
                  </div>
                </div>
              </FloatingCard>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
    </section>
  );
});
