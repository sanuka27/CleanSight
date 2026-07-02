import type { AppRole } from "@/lib/role";
import { MapPin, Camera, Users, BarChart3 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ── Role constants ──────────────────────────────────────────────────

/** All valid application roles. */
export const ALL_ROLES: readonly AppRole[] = [
  "citizen",
  "volunteer",
  "staff",
  "admin",
] as const;

/** Roles that have elevated (management) access. */
export const ELEVATED_ROLES: readonly AppRole[] = ["staff", "admin"] as const;

/** Roles a new user may self-select during signup / onboarding. */
export const SELECTABLE_ROLES: { id: AppRole; label: string; description: string }[] = [
  { id: "citizen", label: "Citizen", description: "Report waste issues" },
  { id: "volunteer", label: "Volunteer", description: "Join cleanup activities" },
];

/** Route users are sent to when they need to pick a role. */
export const ONBOARDING_ROUTE = "/onboarding/role" as const;

// ── Nav-link visibility matrix ──────────────────────────────────────

export interface NavLinkDef {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Which roles may see this link. `undefined` = visible to every authenticated user. */
  allowedRoles?: AppRole[];
  /** If true the link is only shown to guests (not-logged-in). */
  guestOnly?: boolean;
  /** If true the link requires authentication. */
  requiresAuth?: boolean;
}

/**
 * Master list of header nav links with role-based visibility.
 *
 * Rules (from the spec):
 *  - Report Map:    all authenticated users
 *  - Report Waste:  citizen, staff, admin  (volunteers don't file reports)
 *  - Volunteer:     volunteer, staff, admin
 *  - Dashboard:     all authenticated users
 */
export const NAV_LINKS: NavLinkDef[] = [
  {
    href: "/map",
    label: "Report Map",
    icon: MapPin,
    requiresAuth: true,
  },
  {
    href: "/report",
    label: "Report Waste",
    icon: Camera,
    requiresAuth: true,
    allowedRoles: ["citizen", "staff", "admin"],
  },
  {
    href: "/volunteer",
    label: "Volunteer",
    icon: Users,
    requiresAuth: true,
    allowedRoles: ["volunteer", "staff", "admin"],
  },
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: BarChart3,
    requiresAuth: true,
  },
];

// ── Helpers ─────────────────────────────────────────────────────────

/**
 * Return true if a given nav link should be visible to the current user.
 *
 * @param link       The link definition.
 * @param isAuthed   Is the user authenticated?
 * @param role       The user's resolved AppRole (may be undefined while loading).
 */
export function canSeeNavLink(
  link: NavLinkDef,
  isAuthed: boolean,
  role: AppRole | undefined,
): boolean {
  // Guest-only links (e.g. "Get Started") are hidden when logged in.
  if (link.guestOnly && isAuthed) return false;

  // Auth-required links are hidden for guests.
  if (link.requiresAuth && !isAuthed) return false;

  // If the link restricts to specific roles, check membership.
  if (link.allowedRoles && role && !link.allowedRoles.includes(role)) {
    return false;
  }

  return true;
}

/**
 * Return the dashboard sub-route path for a given role.
 * This keeps the mapping in one place (also used by DashboardRouter).
 */
export function dashboardRouteForRole(role: AppRole): string {
  switch (role) {
    case "admin":
      return "/dashboard/admin";
    case "staff":
      return "/dashboard/staff";
    case "volunteer":
      return "/dashboard/volunteer";
    case "citizen":
    default:
      return "/dashboard/citizen";
  }
}
