import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Camera,
  CheckCircle2,
  FileCheck,
  Filter,
  Layers,
  MapPin,
  Route,
  Shield,
  ShieldCheck,
  Target,
  Timer,
  Users,
} from "lucide-react";

export type FeatureId =
  | "ai-detection"
  | "gps-tracking"
  | "community-volunteers"
  | "instant-notifications"
  | "verified-reports"
  | "impact-analytics";

export interface FeatureCard {
  id: FeatureId;
  title: string;
  description: string;
  gradient: string;
  icon: LucideIcon;
  href: string;
}

export interface FeatureDetail extends FeatureCard {
  eyebrow: string;
  headline: string;
  summary: string;
  stats: Array<{ label: string; value: string }>;
  highlights: Array<{ title: string; description: string; icon: LucideIcon }>;
  workflow: Array<{ title: string; description: string }>;
  capabilities: Array<{ title: string; description: string }>;
  cta: {
    primaryLabel: string;
    primaryHref: string;
    secondaryLabel: string;
    secondaryHref: string;
  };
}

const BASE_FEATURES: Record<FeatureId, FeatureCard> = {
  "ai-detection": {
    id: "ai-detection",
    title: "AI-Powered Detection",
    description:
      "Two-stage ML screening flags non-trash and labels waste categories with confidence.",
    gradient: "from-primary to-emerald-400",
    icon: Camera,
    href: "/features/ai-detection",
  },
  "gps-tracking": {
    id: "gps-tracking",
    title: "GPS Location Tracking",
    description:
      "Capture GPS or drop a pin to store precise coordinates for every report.",
    gradient: "from-info to-cyan-400",
    icon: MapPin,
    href: "/features/gps-tracking",
  },
  "community-volunteers": {
    id: "community-volunteers",
    title: "Community Volunteers",
    description:
      "Volunteers can register, claim reports, and update cleanup status.",
    gradient: "from-success to-emerald-400",
    icon: Users,
    href: "/features/community-volunteers",
  },
  "instant-notifications": {
    id: "instant-notifications",
    title: "Status Updates",
    description:
      "Report status changes are tracked across dashboards and the map.",
    gradient: "from-accent to-yellow-400",
    icon: Timer,
    href: "/features/instant-notifications",
  },
  "verified-reports": {
    id: "verified-reports",
    title: "Verified Reports",
    description:
      "AI review status and admin decisions keep the report queue reliable.",
    gradient: "from-primary to-teal-400",
    icon: Shield,
    href: "/features/verified-reports",
  },
  "impact-analytics": {
    id: "impact-analytics",
    title: "Impact Analytics",
    description:
      "Admin and ML dashboards summarize reports, urgency, and model performance.",
    gradient: "from-info to-blue-400",
    icon: BarChart3,
    href: "/features/impact-analytics",
  },
};

const FEATURE_ORDER: FeatureId[] = [
  "ai-detection",
  "gps-tracking",
  "community-volunteers",
  "instant-notifications",
  "verified-reports",
  "impact-analytics",
];

export const FEATURE_CARDS: FeatureCard[] = FEATURE_ORDER.map((id) => BASE_FEATURES[id]);

export const FEATURE_DETAILS: Record<FeatureId, FeatureDetail> = {
  "ai-detection": {
    ...BASE_FEATURES["ai-detection"],
    eyebrow: "ML Screening",
    headline: "Two-stage classification with confidence gating.",
    summary:
      "When a report is created, the backend calls the Phase 1 binary model (trash vs non-trash). If approved as trash, Phase 2 predicts the category and stores confidence and review status.",
    stats: [
      { label: "Phase 1 labels", value: "trash / non-trash" },
      { label: "Phase 2 categories", value: "glass / mixed / paper / plastic" },
      { label: "Confidence scale", value: "0.0 to 1.0" },
    ],
    highlights: [
      {
        title: "Two-stage pipeline",
        description:
          "Phase 1 screens for trash; Phase 2 runs only when Phase 1 approves.",
        icon: Filter,
      },
      {
        title: "Confidence recorded",
        description:
          "Predictions store confidence values and review status fields on each report.",
        icon: Shield,
      },
      {
        title: "Category metadata",
        description:
          "Predicted category and scores are saved for dashboards and analytics.",
        icon: FileCheck,
      },
    ],
    workflow: [
      {
        title: "Create report",
        description:
          "The backend submits the image URL to the ML service during report creation.",
      },
      {
        title: "Phase 1 decision",
        description:
          "Binary classification sets label, confidence, and `aiReviewStatus`.",
      },
      {
        title: "Phase 2 category",
        description:
          "Approved trash reports receive category predictions and review status.",
      },
    ],
    capabilities: [
      {
        title: "Binary validation",
        description: "Trash vs non-trash labels with confidence values.",
      },
      {
        title: "Category prediction",
        description: "Glass, mixed, paper, and plastic labels for approved trash.",
      },
      {
        title: "Review fields",
        description: "Confidence, entropy, and review status are stored per report.",
      },
      {
        title: "ML analytics",
        description: "Admin ML dashboards aggregate prediction metrics over time.",
      },
    ],
    cta: {
      primaryLabel: "Get started",
      primaryHref: "/signup",
      secondaryLabel: "Talk to us",
      secondaryHref: "/contact",
    },
  },
  "gps-tracking": {
    ...BASE_FEATURES["gps-tracking"],
    eyebrow: "Location Capture",
    headline: "GPS plus map pin for accurate placement.",
    summary:
      "Users can detect GPS, enter coordinates manually, or drop a pin on the map. Locations are stored as GeoJSON points and power map filtering and routing.",
    stats: [
      { label: "Capture modes", value: "GPS, manual, map pin" },
      { label: "Map filters", value: "status, search, sort" },
      { label: "Routing overlay", value: "OSRM (when available)" },
    ],
    highlights: [
      {
        title: "Map picker",
        description:
          "Drop a pin to refine coordinates before you submit a report.",
        icon: Target,
      },
      {
        title: "Smart clustering",
        description:
          "Dense areas are grouped to keep the map clear and readable.",
        icon: Layers,
      },
      {
        title: "Route overlay",
        description:
          "Volunteers can draw a driving route to a report when needed.",
        icon: Route,
      },
    ],
    workflow: [
      {
        title: "Detect or enter location",
        description: "Use GPS detection or enter latitude and longitude manually.",
      },
      {
        title: "Confirm on map",
        description: "Pick mode lets you refine the pin before saving.",
      },
      {
        title: "Explore on map",
        description: "Reports appear on the map with filters and sorting.",
      },
    ],
    capabilities: [
      {
        title: "GeoJSON storage",
        description: "Locations are stored as [lng, lat] points for geospatial queries.",
      },
      {
        title: "Bounding box queries",
        description: "The map fetches reports for the visible viewport.",
      },
      {
        title: "Status filters and sorting",
        description: "Filter markers by status and sort by urgency or time.",
      },
      {
        title: "Locate control",
        description: "Center the map on your current location when needed.",
      },
    ],
    cta: {
      primaryLabel: "Get started",
      primaryHref: "/signup",
      secondaryLabel: "Talk to us",
      secondaryHref: "/contact",
    },
  },
  "community-volunteers": {
    ...BASE_FEATURES["community-volunteers"],
    eyebrow: "Volunteer Workflow",
    headline: "Claim, track, and resolve cleanup tasks.",
    summary:
      "Volunteer roles can register, claim pending reports, and update report status as work progresses. Staff can assign reports and track activity.",
    stats: [
      { label: "Roles", value: "citizen, volunteer, staff, admin" },
      { label: "Task states", value: "assigned / in_progress / resolved" },
      { label: "Assignments", value: "self-claim or staff assign" },
    ],
    highlights: [
      {
        title: "Volunteer profiles",
        description:
          "Profiles store skills and availability for volunteer management.",
        icon: Users,
      },
      {
        title: "Self-assign tasks",
        description:
          "Volunteers can claim pending reports directly from the queue.",
        icon: CheckCircle2,
      },
      {
        title: "Status updates",
        description:
          "Volunteers can move assigned reports to in_progress or resolved.",
        icon: MapPin,
      },
    ],
    workflow: [
      {
        title: "Register as volunteer",
        description: "Create a volunteer profile and role in the system.",
      },
      {
        title: "Claim or assign",
        description: "Volunteers claim pending reports or staff assign them.",
      },
      {
        title: "Update status",
        description: "Progress moves through assigned, in_progress, and resolved.",
      },
    ],
    capabilities: [
      {
        title: "Assigned task lists",
        description: "Volunteer dashboards surface assigned and resolved work.",
      },
      {
        title: "Role-based updates",
        description: "Only volunteers, staff, and admins can change status.",
      },
      {
        title: "Assignment tracking",
        description: "Assigned volunteer IDs are stored on each report.",
      },
      {
        title: "Volunteer analytics",
        description: "Admin dashboards show volunteer performance metrics.",
      },
    ],
    cta: {
      primaryLabel: "Get started",
      primaryHref: "/signup",
      secondaryLabel: "Talk to us",
      secondaryHref: "/contact",
    },
  },
  "instant-notifications": {
    ...BASE_FEATURES["instant-notifications"],
    eyebrow: "Workflow Status",
    headline: "Clear state changes across the platform.",
    summary:
      "Reports follow a defined lifecycle, and the current status is reflected across dashboards, filters, and the map.",
    stats: [
      { label: "Lifecycle states", value: "pending / verified / assigned / in_progress / resolved / rejected" },
      { label: "Validation", value: "server-side rules" },
      { label: "Timestamps", value: "assignedAt / resolvedAt / rejectedAt" },
    ],
    highlights: [
      {
        title: "Lifecycle rules",
        description: "Status transitions are validated against a shared workflow.",
        icon: Timer,
      },
      {
        title: "Role controls",
        description: "Citizens cannot update status; volunteers can update assigned work.",
        icon: ShieldCheck,
      },
      {
        title: "Bulk updates",
        description: "Admins can update status in bulk from the reports table.",
        icon: FileCheck,
      },
    ],
    workflow: [
      {
        title: "Report created",
        description: "New reports start in the pending state.",
      },
      {
        title: "Assignment",
        description: "Staff assign volunteers or volunteers claim pending work.",
      },
      {
        title: "Progress updates",
        description: "Status moves through in_progress to resolved.",
      },
    ],
    capabilities: [
      {
        title: "Status filters",
        description: "Map and dashboards filter reports by workflow state.",
      },
      {
        title: "Bulk actions",
        description: "Admins can assign, reject, or update multiple reports.",
      },
      {
        title: "Audit timestamps",
        description: "Assigned and resolved timestamps are stored on reports.",
      },
      {
        title: "Transition validation",
        description: "Invalid status changes are blocked by server logic.",
      },
    ],
    cta: {
      primaryLabel: "Get started",
      primaryHref: "/signup",
      secondaryLabel: "Talk to us",
      secondaryHref: "/contact",
    },
  },
  "verified-reports": {
    ...BASE_FEATURES["verified-reports"],
    eyebrow: "Review Controls",
    headline: "AI review data stays attached to every report.",
    summary:
      "Each report stores AI review status, labels, and confidence. Admins can filter by review status and finalize decisions with notes and timestamps.",
    stats: [
      { label: "AI review status", value: "approved / flagged / manual_review / pending" },
      { label: "Category review", value: "auto_accepted / flagged / manual_review / pending" },
      { label: "Review fields", value: "notes + reviewer id" },
    ],
    highlights: [
      {
        title: "AI metadata",
        description: "Labels, confidence, and review status are stored per report.",
        icon: Shield,
      },
      {
        title: "Review notes",
        description: "Reviewers can add notes and timestamps to decisions.",
        icon: FileCheck,
      },
      {
        title: "Admin filtering",
        description: "Reports can be filtered by AI review status for triage.",
        icon: Filter,
      },
    ],
    workflow: [
      {
        title: "AI screen",
        description: "ML services label reports and set review status fields.",
      },
      {
        title: "Manual review",
        description: "Admins review flagged items and add notes if needed.",
      },
      {
        title: "Finalize status",
        description: "Reports can be verified, assigned, or rejected by admins.",
      },
    ],
    capabilities: [
      {
        title: "Review status fields",
        description: "AI review status and category review status are stored.",
      },
      {
        title: "Reviewer notes",
        description: "Review notes and reviewer IDs are saved on the report.",
      },
      {
        title: "Rejection reasons",
        description: "Rejected reports store a required rejection reason.",
      },
      {
        title: "Admin report tools",
        description: "Reports can be filtered and updated in bulk by status.",
      },
    ],
    cta: {
      primaryLabel: "Get started",
      primaryHref: "/signup",
      secondaryLabel: "Talk to us",
      secondaryHref: "/contact",
    },
  },
  "impact-analytics": {
    ...BASE_FEATURES["impact-analytics"],
    eyebrow: "Analytics",
    headline: "Dashboards for system and ML performance.",
    summary:
      "Admin analytics summarize report volume, urgency, resolution times, and volunteer performance. ML analytics track phase 1 and phase 2 prediction metrics.",
    stats: [
      { label: "Report KPIs", value: "status + urgency" },
      { label: "Volunteer metrics", value: "assigned + resolved" },
      { label: "ML metrics", value: "phase 1 + phase 2" },
    ],
    highlights: [
      {
        title: "Admin overview",
        description: "Charts summarize report volume, status, and urgency.",
        icon: BarChart3,
      },
      {
        title: "Volunteer performance",
        description: "Assigned and resolved counts are tracked per volunteer.",
        icon: Users,
      },
      {
        title: "ML analytics",
        description: "Phase 1 and Phase 2 dashboards show prediction trends.",
        icon: Target,
      },
    ],
    workflow: [
      {
        title: "Collect signals",
        description: "Reports and status changes create structured metrics.",
      },
      {
        title: "Aggregate metrics",
        description: "Analytics endpoints summarize by date range.",
      },
      {
        title: "Visualize insights",
        description: "Dashboards render charts and tables for admins.",
      },
    ],
    capabilities: [
      {
        title: "Date range filters",
        description: "7d, 30d, 90d, and custom ranges are supported.",
      },
      {
        title: "Status breakdowns",
        description: "Analytics include status, waste type, and urgency splits.",
      },
      {
        title: "CSV export",
        description: "Reports can be exported from the admin tools.",
      },
      {
        title: "ML trends",
        description: "Phase 1 and Phase 2 metrics are tracked over time.",
      },
    ],
    cta: {
      primaryLabel: "Get started",
      primaryHref: "/signup",
      secondaryLabel: "Talk to us",
      secondaryHref: "/contact",
    },
  },
};
