import { motion } from "framer-motion";

interface MeshGradientProps {
  className?: string;
  animate?: boolean;
}

export function MeshGradient({ className = "", animate = true }: MeshGradientProps) {
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {/* Primary gradient orb */}
      <motion.div
        className="absolute w-[800px] h-[800px] rounded-full opacity-30 blur-[100px]"
        style={{
          background: "radial-gradient(circle, hsl(152, 76%, 45%) 0%, transparent 70%)",
          left: "10%",
          top: "-20%",
        }}
        animate={animate ? {
          x: [0, 100, 0],
          y: [0, 50, 0],
          scale: [1, 1.2, 1],
        } : undefined}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      {/* Secondary gradient orb */}
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full opacity-25 blur-[80px]"
        style={{
          background: "radial-gradient(circle, hsl(168, 65%, 50%) 0%, transparent 70%)",
          right: "5%",
          top: "30%",
        }}
        animate={animate ? {
          x: [0, -80, 0],
          y: [0, 80, 0],
          scale: [1, 1.1, 1],
        } : undefined}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
      />
      
      {/* Accent gradient orb */}
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full opacity-20 blur-[80px]"
        style={{
          background: "radial-gradient(circle, hsl(45, 93%, 55%) 0%, transparent 70%)",
          left: "60%",
          bottom: "-10%",
        }}
        animate={animate ? {
          x: [0, 60, 0],
          y: [0, -40, 0],
          scale: [1, 1.15, 1],
        } : undefined}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 4,
        }}
      />

      {/* Grid overlay for depth */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />
    </div>
  );
}
