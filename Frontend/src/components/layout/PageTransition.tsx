import { motion } from "framer-motion";
import { ReactNode, memo, useEffect } from "react";

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export const PageTransition = memo(({ children, className = "" }: PageTransitionProps) => {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ 
        duration: 0.2, 
        ease: "easeOut"
      }}
      style={{ willChange: "opacity" }}
      className={`min-h-screen ${className}`}
    >
      {children}
    </motion.div>
  );
});

PageTransition.displayName = "PageTransition";
