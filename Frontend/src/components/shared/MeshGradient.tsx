import { motion } from "framer-motion";
import { memo } from "react";

interface MeshGradientProps {
  className?: string;
  animate?: boolean;
}

export const MeshGradient = memo(function MeshGradient({ className = "", animate = true }: MeshGradientProps) {
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {/* Primary gradient orb */}
      <motion.div
        className="absolute w-[700px] h-[700px] rounded-full opacity-25 blur-[80px]"
        style={{
          background: "radial-gradient(circle, hsl(152, 76%, 45%) 0%, transparent 70%)",
          left: "10%",
          top: "-20%",
        }}
        animate={animate ? {
          x: [0, 80, 0],
          y: [0, 40, 0],
        } : undefined}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "linear",
        }}
      />
      
      {/* Secondary gradient orb */}
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full opacity-20 blur-[70px]"
        style={{
          background: "radial-gradient(circle, hsl(168, 65%, 50%) 0%, transparent 70%)",
          right: "5%",
          top: "30%",
        }}
        animate={animate ? {
          x: [0, -60, 0],
          y: [0, 60, 0],
        } : undefined}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear",
          delay: 2,
        }}
      />
      
      {/* Accent gradient orb */}
      <motion.div
        className="absolute w-[400px] h-[400px] rounded-full opacity-15 blur-[60px]"
        style={{
          background: "radial-gradient(circle, hsl(45, 93%, 55%) 0%, transparent 70%)",
          left: "60%",
          bottom: "-10%",
        }}
        animate={animate ? {
          x: [0, 50, 0],
          y: [0, -30, 0],
        } : undefined}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: "linear",
          delay: 4,
        }}
      />
    </div>
  );
});
