import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MeshGradient } from "@/components/shared/MeshGradient";
import { ArrowLeft, Home } from "lucide-react";
import { motion } from "framer-motion";

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background p-4">
      <MeshGradient className="opacity-30" />
      
      <div className="relative z-10 text-center max-w-lg">
        <motion.div
           initial={{ scale: 0.8, opacity: 0 }}
           animate={{ scale: 1, opacity: 1 }}
           transition={{ duration: 0.5 }}
        >
          <h1 className="font-display text-[150px] leading-none font-bold text-gradient opacity-20 select-none">
            404
          </h1>
          <div className="relative -mt-20">
            <h2 className="font-display text-3xl font-bold mb-4">Page Not Found</h2>
            <p className="text-muted-foreground text-lg mb-8">
              Oops! It seems like you've wandered into an area that doesn't exist or has been cleaned up.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/">
                <Button size="lg" className="w-full sm:w-auto gradient-primary text-white shadow-glow gap-2">
                  <Home className="w-4 h-4" />
                  Back Home
                </Button>
              </Link>
              <Button 
                variant="outline" 
                size="lg" 
                onClick={() => window.history.back()}
                className="w-full sm:w-auto glass hover:bg-card/50 gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Go Back
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default NotFound;
