import { memo } from "react";

interface MeshGradientProps {
  className?: string;
  animate?: boolean;
}

/**
 * MeshGradient uses pure CSS animations instead of JS-driven Framer Motion.
 * Three large blurred orbs animating via CSS keyframes → GPU-composited,
 * zero JS per frame, no layout recalculations.
 */
export const MeshGradient = memo(function MeshGradient({ className = "", animate = true }: MeshGradientProps) {
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`} style={{ contain: "layout style" }}>
      {/* Primary gradient orb */}
      <div
        className="absolute w-[700px] h-[700px] rounded-full opacity-25 blur-[80px]"
        style={{
          background: "radial-gradient(circle, hsl(152, 76%, 45%) 0%, transparent 70%)",
          left: "10%",
          top: "-20%",
          willChange: animate ? "transform" : "auto",
          animation: animate ? "mesh-orb-1 25s linear infinite" : "none",
          contain: "strict",
        }}
      />
      
      {/* Secondary gradient orb */}
      <div
        className="absolute w-[500px] h-[500px] rounded-full opacity-20 blur-[70px]"
        style={{
          background: "radial-gradient(circle, hsl(168, 65%, 50%) 0%, transparent 70%)",
          right: "5%",
          top: "30%",
          willChange: animate ? "transform" : "auto",
          animation: animate ? "mesh-orb-2 20s 2s linear infinite" : "none",
          contain: "strict",
        }}
      />
      
      {/* Accent gradient orb */}
      <div
        className="absolute w-[400px] h-[400px] rounded-full opacity-15 blur-[60px]"
        style={{
          background: "radial-gradient(circle, hsl(45, 93%, 55%) 0%, transparent 70%)",
          left: "60%",
          bottom: "-10%",
          willChange: animate ? "transform" : "auto",
          animation: animate ? "mesh-orb-3 22s 4s linear infinite" : "none",
          contain: "strict",
        }}
      />
    </div>
  );
});
