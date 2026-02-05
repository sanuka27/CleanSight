import { motion } from "framer-motion";
import { ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export const PageTransition = ({ children, className = "" }: PageTransitionProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.02 }}
      transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
      className={`min-h-screen ${className}`}
    >
      {children}
    </motion.div>
  );
};
