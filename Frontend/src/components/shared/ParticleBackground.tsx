import { useMemo, memo } from "react";

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
}

interface ParticleBackgroundProps {
  count?: number;
  className?: string;
}

/**
 * Particles use pure CSS animations instead of JS-driven Framer Motion loops.
 * This eliminates 20+ independent JS animation ticks per frame.
 */
export const ParticleBackground = memo(function ParticleBackground({ count = 20, className = "" }: ParticleBackgroundProps) {
  const particles = useMemo<Particle[]>(() => {
    const result: Particle[] = [];
    for (let i = 0; i < count; i++) {
      result.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 1,
        duration: Math.random() * 15 + 15,
        delay: Math.random() * 3,
      });
    }
    return result;
  }, [count]);

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute rounded-full bg-primary/15"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
            height: particle.size,
            animation: `particle-css-float ${particle.duration}s ${particle.delay}s linear infinite`,
            willChange: "transform, opacity",
            contain: "strict",
          }}
        />
      ))}
    </div>
  );
});
