import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  MapPin,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

interface DashboardHeaderProps {
  isLoading: boolean;
  error: string | null;
  totalReports: number;
}

export function DashboardHeader({ isLoading, error, totalReports }: DashboardHeaderProps) {
  const { user, appUser } = useAuth();
  const navigate = useNavigate();
  const firstName = user?.displayName?.split(" ")[0] || "Citizen";

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <div className="relative overflow-hidden rounded-2xl glass-premium border border-white/10 p-6 sm:p-8">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-accent/5 blur-3xl" />
        </div>

        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left: Greeting */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold">
                {getGreeting()},{" "}
                <span className="text-gradient">{firstName}</span>
              </h1>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, duration: 0.3 }}
              >
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-success/10 text-success border border-success/20">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Citizen account active
                </span>
              </motion.div>
            </div>

            <p className="text-muted-foreground text-sm sm:text-base max-w-lg">
              {isLoading
                ? "Loading your dashboard…"
                : error
                  ? "Could not load dashboard data. Please try again."
                  : totalReports > 0
                    ? `You've submitted ${totalReports} report${totalReports !== 1 ? "s" : ""} helping keep your community clean.`
                    : "Start reporting waste in your area to make a difference."}
            </p>

            {appUser?.email && (
              <p className="text-xs text-muted-foreground">
                Signed in as {appUser.email}
              </p>
            )}
          </div>

          {/* Right: CTAs */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <Button
              onClick={() => navigate("/report")}
              className="gradient-primary text-white shadow-glow gap-2 h-11 px-5"
              size="lg"
            >
              <FileText className="w-4 h-4" />
              Report Waste
            </Button>
            <Button
              onClick={() => navigate("/map")}
              variant="outline"
              className="gap-2 h-11 px-5 border-border/50 hover:bg-primary/5"
              size="lg"
            >
              <MapPin className="w-4 h-4" />
              View Map
            </Button>
          </div>
        </div>

        {/* Subtle sparkle accent */}
        <motion.div
          className="absolute top-4 right-4 text-primary/20"
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        >
          <Sparkles className="w-6 h-6" />
        </motion.div>
      </div>
    </motion.div>
  );
}
