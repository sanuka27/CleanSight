import { motion, AnimatePresence } from "framer-motion";
import {
  Image,
  MapPin,
  CheckCircle,
  Loader2,
  ExternalLink,
  Eye,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DashboardReport } from "@/types/dashboard";
import { reportAge, distanceLabel } from "@/utils/volunteerInsights";

const statusColors: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/20",
  assigned: "bg-info/10 text-info border-info/20",
  resolved: "bg-success/10 text-success border-success/20",
};

const urgencyColors: Record<string, string> = {
  high: "bg-destructive/10 text-destructive border-destructive/20",
  medium: "bg-warning/10 text-warning border-warning/20",
  low: "bg-muted/20 text-muted-foreground border-border",
};

interface VolunteerTaskCardProps {
  report: DashboardReport;
  actionLoading: boolean;
  onResolve: (id: string) => void;
  onOpenDetail: (report: DashboardReport) => void;
  onOpenMap?: (report: DashboardReport) => void;
  userLat?: number;
  userLng?: number;
}

export function VolunteerTaskCard({
  report,
  actionLoading,
  onResolve,
  onOpenDetail,
  onOpenMap,
  userLat,
  userLng,
}: VolunteerTaskCardProps) {
  const dist = distanceLabel(report, userLat, userLng);
  const age = reportAge(report.createdAt);

  return (
    <AnimatePresence>
      <motion.div
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25 }}
        className="group flex gap-4 p-4 rounded-xl border border-border/50 bg-card/50 hover:bg-card hover:border-border hover:shadow-md transition-all duration-200"
      >
        {/* Thumbnail */}
        <div
          className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer"
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
              <Image className="w-6 h-6 text-muted-foreground/50" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge
                variant="outline"
                className={`text-xs ${statusColors[report.status] ?? ""}`}
              >
                {report.status}
              </Badge>
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
              title="View details"
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

          {/* Actions */}
          <div className="flex gap-2 mt-3 flex-wrap">
            <Button
              size="sm"
              className="gradient-primary text-white gap-1 h-8 px-3 hover:opacity-90 disabled:opacity-50"
              disabled={actionLoading}
              onClick={() => onResolve(report._id)}
            >
              {actionLoading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <CheckCircle className="w-3 h-3" />
              )}
              Mark Resolved
            </Button>
            {onOpenMap && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1 h-8 px-3"
                onClick={() => onOpenMap(report)}
              >
                <ExternalLink className="w-3 h-3" />
                Open in Google Maps
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
