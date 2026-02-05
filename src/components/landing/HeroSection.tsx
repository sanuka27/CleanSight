import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Camera, MapPin, CheckCircle, ArrowRight } from "lucide-react";
import heroImage from "@/assets/hero-cleanup.jpg";

export function HeroSection() {
  return (
    <section className="relative min-h-screen gradient-hero overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-success/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 pt-32 pb-16 relative">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center lg:text-left"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-sm font-medium">Community-Powered Cleanup</span>
            </div>

            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              Report Waste.{" "}
              <span className="text-gradient">Coordinate Cleanup.</span>{" "}
              Transform Communities.
            </h1>

            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto lg:mx-0">
              CleanSight empowers citizens to report garbage issues, volunteers to take action,
              and municipalities to efficiently manage cleanup operations.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-12">
              <Link to="/report">
                <Button variant="hero" size="xl" className="w-full sm:w-auto gap-2">
                  <Camera className="w-5 h-5" />
                  Report Waste Now
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/map">
                <Button variant="hero-outline" size="xl" className="w-full sm:w-auto gap-2">
                  <MapPin className="w-5 h-5" />
                  View Report Map
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6">
              {[
                { value: "2,500+", label: "Reports Filed" },
                { value: "1,200+", label: "Cleanups Done" },
                { value: "500+", label: "Volunteers" },
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                  className="text-center lg:text-left"
                >
                  <p className="font-display text-2xl md:text-3xl font-bold text-primary">
                    {stat.value}
                  </p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right Content - Hero Image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative"
          >
            <div className="relative rounded-2xl overflow-hidden shadow-dramatic">
              <img
                src={heroImage}
                alt="Community volunteers cleaning up a park"
                className="w-full h-[400px] lg:h-[500px] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/40 to-transparent" />
            </div>

            {/* Floating Cards */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="absolute -left-4 top-1/4 glass-strong rounded-xl p-4 shadow-elevated"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="font-medium text-sm">Report Verified</p>
                  <p className="text-xs text-muted-foreground">AI-powered validation</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
              className="absolute -right-4 bottom-1/4 glass-strong rounded-xl p-4 shadow-elevated"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-info/20 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-info" />
                </div>
                <div>
                  <p className="font-medium text-sm">GPS Tagged</p>
                  <p className="text-xs text-muted-foreground">Precise location data</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
