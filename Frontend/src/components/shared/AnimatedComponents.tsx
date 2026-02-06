import { useEffect, useState, useRef, memo } from "react";
import { motion, useMotionValue, useSpring, useInView } from "framer-motion";

interface AnimatedCounterProps {
  end: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
}

export const AnimatedCounter = memo(function AnimatedCounter({ 
  end, 
  duration = 2, 
  suffix = "", 
  prefix = "",
  className = "" 
}: AnimatedCounterProps) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px", amount: 0.3 });

  useEffect(() => {
    if (!isInView) return;

    let startTime: number | null = null;
    const startValue = 0;
    const endValue = end;
    let rafId: number;

    const animate = (currentTime: number) => {
      if (startTime === null) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / (duration * 1000), 1);
      
      // Easing function for smooth animation
      const easeOutExpo = 1 - Math.pow(2, -10 * progress);
      const currentCount = Math.floor(startValue + (endValue - startValue) * easeOutExpo);
      
      setCount(currentCount);

      if (progress < 1) {
        rafId = requestAnimationFrame(animate);
      }
    };

    rafId = requestAnimationFrame(animate);
    
    return () => cancelAnimationFrame(rafId);
  }, [isInView, end, duration]);

  return (
    <motion.span
      ref={ref}
      className={className}
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : { opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      style={{ willChange: "auto" }}
    >
      {prefix}{count.toLocaleString()}{suffix}
    </motion.span>
  );
});

interface FloatingCardProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: "left" | "right";
}

export const FloatingCard = memo(function FloatingCard({ children, className = "", delay = 0, direction = "left" }: FloatingCardProps) {
  const x = direction === "left" ? -20 : 20;
  
  return (
    <motion.div
      initial={{ opacity: 0, x }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ 
        duration: 0.4, 
        delay, 
        ease: "easeOut"
      }}
      style={{ willChange: "auto" }}
      className={`glass-premium rounded-2xl p-4 shadow-elevated hover:shadow-glow-lg transition-shadow duration-300 ${className}`}
    >
      {children}
    </motion.div>
  );
});

interface GlowButtonProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary";
}

export const GlowButton = memo(function GlowButton({ children, className = "", onClick, variant = "primary" }: GlowButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      onClick={onClick}
      style={{ willChange: "transform" }}
      className={`
        relative overflow-hidden px-8 py-4 rounded-xl font-semibold
        transition-all duration-300
        ${variant === "primary" 
          ? "gradient-primary text-white shadow-glow hover:shadow-glow-lg" 
          : "bg-card/50 border border-border text-foreground hover:bg-card/80"
        }
        ${className}
      `}
    >
      {/* Content */}
      <span className="relative z-10 flex items-center justify-center gap-2">
        {children}
      </span>
    </motion.button>
  );
});

interface RevealOnScrollProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "down" | "left" | "right";
}

export const RevealOnScroll = memo(function RevealOnScroll({ 
  children, 
  className = "", 
  delay = 0,
  direction = "up"
}: RevealOnScrollProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px", amount: 0.2 });

  const directionVariants = {
    up: { y: 30 },
    down: { y: -30 },
    left: { x: 30 },
    right: { x: -30 },
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, ...directionVariants[direction] }}
      animate={isInView ? { opacity: 1, x: 0, y: 0 } : { opacity: 0, ...directionVariants[direction] }}
      transition={{ 
        duration: 0.35, 
        delay, 
        ease: [0.25, 0.1, 0.25, 1]
      }}
      style={{ willChange: "auto" }}
      className={className}
    >
      {children}
    </motion.div>
  );
});
