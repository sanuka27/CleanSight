import { motion } from "framer-motion";
import { MapPin, RefreshCw, Clock, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getGreeting } from "@/utils/volunteerInsights";

interface VolunteerDashboardHeaderProps {
  name: string;
  activeTaskCount: number;
  isLoading: boolean;
  onOpenNearMap: () => void;
  onRefresh: () => void;
  onScrollToTasks: () => void;
}

export function VolunteerDashboardHeader({
  name,
  activeTaskCount,
  isLoading,
  onOpenNearMap,
  onRefresh,
  onScrollToTasks,
}: VolunteerDashboardHeaderProps) {
  const greeting = getGreeting();

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative rounded-2xl overflow-hidden"
    >
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-2xl pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_hsl(152,76%,36%,0.15)_0%,_transparent_70%)] pointer-events-none" />

      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 md:p-8">
        {/* Left: greeting */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Leaf className="w-5 h-5 text-primary" />
            <Badge
              variant="outline"
              className="bg-primary/10 text-primary border-primary/20 text-xs font-medium px-3 py-0.5"
            >
              Volunteer
            </Badge>
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold leading-tight mt-2">
            {greeting},{" "}
            <span className="text-gradient">{name || "Volunteer"}</span>
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {activeTaskCount > 0
              ? `You have ${activeTaskCount} active task${activeTaskCount !== 1 ? "s" : ""} — here's what needs action near you`
              : "Here's what needs action near you"}
          </p>
        </div>

        {/* Right: quick actions */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 glass-premium border-white/10 hover:bg-primary/10 hover:border-primary/30 transition-all"
            onClick={onOpenNearMap}
          >
            <MapPin className="w-4 h-4 text-primary" />
            Near Me Map
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 glass-premium border-white/10 hover:bg-accent/10 hover:border-accent/30 transition-all"
            disabled={isLoading}
            onClick={onRefresh}
          >
            <RefreshCw
              className={`w-4 h-4 text-accent ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button
            size="sm"
            className="gap-2 gradient-primary text-white shadow-sm hover:opacity-90 transition-opacity"
            onClick={onScrollToTasks}
          >
            <Clock className="w-4 h-4" />
            My Active Tasks
            {activeTaskCount > 0 && (
              <span className="ml-1 bg-white/20 rounded-full px-1.5 py-0.5 text-xs font-bold">
                {activeTaskCount}
              </span>
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
