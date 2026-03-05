import { motion, AnimatePresence } from "framer-motion";
import {
  Image,
  MapPin,
  Loader2,
  CheckCircle,
  Eye,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DashboardReport } from "@/types/dashboard";
import { reportAge, distanceLabel } from "@/utils/volunteerInsights";

const urgencyColors: Record<string, string> = {
  high: "bg-destructive/10 text-destructive border-destructive/20",
  medium: "bg-warning/10 text-warning border-warning/20",
  low: "bg-muted/20 text-muted-foreground border-border",
};

interface VolunteerReportCardProps {
  report: DashboardReport;
  actionLoading: boolean;
  onAccept: (id: string) => void;
  onOpenDetail: (report: DashboardReport) => void;
  userLat?: number;
  userLng?: number;
}

export function VolunteerReportCard({
  report,
  actionLoading,
  onAccept,
  onOpenDetail,
  userLat,
  userLng,
}: VolunteerReportCardProps) {
  const dist = distanceLabel(report, userLat, userLng);
  const age = reportAge(report.createdAt);

  return (
    <AnimatePresence>
      <motion.div
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.25 }}
        className="group flex gap-4 p-4 rounded-xl border border-border/40 bg-card/40 hover:bg-card hover:border-border hover:shadow-sm transition-all duration-200"
      >
        {/* Thumbnail */}
        <div
          className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer"
          onClick={() => onOpenDetail(report)}
        >
          {report.imageUrl ? (
            <img
              src={report.imageUrl}
              alt="Report"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-muted/30 flex items-center justify-center">
              <Image className="w-5 h-5 text-muted-foreground/40" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1 mb-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge variant="outline" className="text-xs capitalize">
                {report.wasteType}
              </Badge>
              <Badge
                variant="outline"
                className={`text-xs capitalize ${urgencyColors[report.urgency?.toLowerCase() ?? ""] ?? ""}`}
              >
                {report.urgency}
              </Badge>
            </div>
            <button
              onClick={() => onOpenDetail(report)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground flex-shrink-0"
            >
              <Eye className="w-4 h-4" />
            </button>
          </div>

          <p className="text-sm text-foreground/80 truncate">
            {report.description || report.title || "No description"}
          </p>

          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span>{age}</span>
            {dist && (
              <span className="flex items-center gap-0.5">
                <MapPin className="w-3 h-3" />
                {dist}
              </span>
            )}
          </div>

          <Button
            size="sm"
            variant="outline"
            className="mt-3 gap-1.5 h-8 px-3 border-primary/30 text-primary hover:bg-primary/10 hover:border-primary/50 disabled:opacity-50 transition-all"
            disabled={actionLoading}
            onClick={() => onAccept(report._id)}
          >
            {actionLoading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <CheckCircle className="w-3 h-3" />
            )}
            Accept Task
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
