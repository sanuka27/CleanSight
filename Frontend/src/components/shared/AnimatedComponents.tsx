import { useEffect, useState, useRef } from "react";
import { motion, useMotionValue, useSpring, useInView } from "framer-motion";

interface AnimatedCounterProps {
  end: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
}

export function AnimatedCounter({ 
  end, 
  duration = 2, 
  suffix = "", 
  prefix = "",
  className = "" 
}: AnimatedCounterProps) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  useEffect(() => {
    if (!isInView) return;

    let startTime: number | null = null;
    const startValue = 0;
    const endValue = end;

    const animate = (currentTime: number) => {
      if (startTime === null) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / (duration * 1000), 1);
      
      // Easing function for smooth animation
      const easeOutExpo = 1 - Math.pow(2, -10 * progress);
      const currentCount = Math.floor(startValue + (endValue - startValue) * easeOutExpo);
      
      setCount(currentCount);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [isInView, end, duration]);

  return (
    <motion.span
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 10 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
      transition={{ duration: 0.5 }}
    >
      {prefix}{count.toLocaleString()}{suffix}
    </motion.span>
  );
}

interface FloatingCardProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: "left" | "right";
}

export function FloatingCard({ children, className = "", delay = 0, direction = "left" }: FloatingCardProps) {
  const x = direction === "left" ? -20 : 20;
  
  return (
    <motion.div
      initial={{ opacity: 0, x }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay, ease: [0.34, 1.56, 0.64, 1] }}
      className={`glass-premium rounded-2xl p-4 shadow-elevated hover:shadow-glow-lg transition-shadow duration-300 ${className}`}
    >
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

interface GlowButtonProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary";
}

export function GlowButton({ children, className = "", onClick, variant = "primary" }: GlowButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
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
      {/* Shimmer effect */}
      <span className="absolute inset-0 overflow-hidden rounded-xl">
        <span className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      </span>
      
      {/* Content */}
      <span className="relative z-10 flex items-center justify-center gap-2">
        {children}
      </span>
    </motion.button>
  );
}

interface RevealOnScrollProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "down" | "left" | "right";
}

export function RevealOnScroll({ 
  children, 
  className = "", 
  delay = 0,
  direction = "up"
}: RevealOnScrollProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  const directionVariants = {
    up: { y: 40 },
    down: { y: -40 },
    left: { x: 40 },
    right: { x: -40 },
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, ...directionVariants[direction] }}
      animate={isInView ? { opacity: 1, x: 0, y: 0 } : { opacity: 0, ...directionVariants[direction] }}
      transition={{ duration: 0.6, delay, ease: [0.34, 1.56, 0.64, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
