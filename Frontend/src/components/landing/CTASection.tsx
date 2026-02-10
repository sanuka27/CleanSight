import { motion } from "framer-motion";
import { memo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Leaf } from "lucide-react";

export const CTASection = memo(function CTASection() {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          style={{ willChange: "auto" }}
          className="relative rounded-3xl gradient-primary p-8 md:p-12 lg:p-16 overflow-hidden"
        >
          {/* Background Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-foreground/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary-foreground/5 rounded-full blur-3xl" />

          <div className="relative text-center max-w-3xl mx-auto">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-primary-foreground/20 flex items-center justify-center">
                <Leaf className="w-8 h-8 text-primary-foreground" />
              </div>
            </div>

            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-6">
              Ready to Make a Difference?
            </h2>

            <p className="text-lg text-primary-foreground/80 mb-8">
              Join thousands of citizens and volunteers who are transforming their communities.
              Every report counts. Every cleanup matters.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/signup">
                <Button 
                  size="xl" 
                  className="w-full sm:w-auto bg-primary-foreground text-primary hover:bg-primary-foreground/90 gap-2 font-semibold"
                >
                  Get Started Free
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link to="/map">
                <Button 
                  size="xl" 
                  variant="outline"
                  className="w-full sm:w-auto border-2 border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10 font-semibold"
                >
                  Explore the Map
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
});
