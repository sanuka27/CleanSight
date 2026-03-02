import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  MapPin,
  Lightbulb,
  Camera,
  Navigation,
  ArrowRight,
  Clock,
  Download,
} from "lucide-react";
import { RevealOnScroll } from "@/components/shared/AnimatedComponents";
import type { DashboardReport } from "@/types/dashboard";
import { exportReportsCsv } from "@/utils/exportCsv";

interface QuickActionsProps {
  reports?: DashboardReport[];
  onFilterPending?: () => void;
}

export function QuickActions({ reports = [], onFilterPending }: QuickActionsProps) {
  const navigate = useNavigate();

  const pendingCount = reports.filter((r) => r.status === "pending").length;

  const actions = [
    {
      label: "Report Waste",
      description: "Submit a new report",
      icon: FileText,
      onClick: () => navigate("/report"),
      variant: "primary" as const,
    },
    {
      label: "View Map",
      description: "See reports on map",
      icon: MapPin,
      onClick: () => navigate("/map"),
      variant: "secondary" as const,
    },
    ...(pendingCount > 0 && onFilterPending
      ? [
          {
            label: `Pending Reports (${pendingCount})`,
            description: "View reports awaiting review",
            icon: Clock,
            onClick: onFilterPending,
            variant: "secondary" as const,
          },
        ]
      : []),
    ...(reports.length > 0
      ? [
          {
            label: "Export My Reports",
            description: "Download as CSV",
            icon: Download,
            onClick: () =>
              exportReportsCsv(
                reports,
                `cleansight-reports-${new Date().toISOString().slice(0, 10)}.csv`
              ),
            variant: "secondary" as const,
          },
        ]
      : []),
  ];

  const tips = [
    {
      icon: Camera,
      text: "Take a clear photo showing the waste and surrounding area",
    },
    {
      icon: Navigation,
      text: "Enable location services for accurate report placement",
    },
    {
      icon: Lightbulb,
      text: "Add a description to help volunteers find and clean the site",
    },
  ];

  return (
    <RevealOnScroll delay={0.3} direction="right">
      <div className="space-y-4">
        {/* Quick action buttons */}
        <div className="glass-premium rounded-2xl border border-white/10 p-5 space-y-3">
          <h3 className="font-display font-bold text-sm text-muted-foreground uppercase tracking-wider">
            Quick Actions
          </h3>
          <div className="space-y-2">
            {actions.map((action) => (
              <motion.div
                key={action.label}
                whileHover={{ x: 4 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <Button
                  onClick={action.onClick}
                  variant={action.variant === "primary" ? "default" : "outline"}
                  className={`w-full justify-start gap-3 h-12 ${
                    action.variant === "primary"
                      ? "gradient-primary text-white shadow-glow"
                      : "border-border/50 hover:bg-primary/5"
                  }`}
                >
                  <action.icon className="w-4 h-4 flex-shrink-0" />
                  <div className="text-left flex-1">
                    <span className="text-sm font-medium">{action.label}</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 opacity-40" />
                </Button>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Tips card */}
        <div className="glass-premium rounded-2xl border border-white/10 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-accent/10">
              <Lightbulb className="w-4 h-4 text-accent" />
            </div>
            <h3 className="font-display font-bold text-sm">
              Report Effectively
            </h3>
          </div>

          <div className="space-y-3">
            {tips.map((tip, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className="flex items-start gap-3"
              >
                <div className="p-1.5 rounded-md bg-muted/20 flex-shrink-0 mt-0.5">
                  <tip.icon className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {tip.text}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </RevealOnScroll>
  );
}
