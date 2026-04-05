/**
 * Role helpers for analytics gating.
 *
 * Determines the user's role from the backend profile returned by
 * /api/auth/me and exposes simple boolean checks.
 */

// Import from centralized types
export type { AppRole } from "@/types/core";
import type { AppRole } from "@/types/core";

/**
 * Extract the role string from the user profile object.
 * Falls back to "citizen" when unknown.
 */
export function getUserRole(profile: { role?: string } | null | undefined): AppRole {
  const role = profile?.role;
  if (
    role === "citizen" ||
    role === "volunteer" ||
    role === "staff" ||
    role === "admin"
  ) {
    return role;
  }
  return "citizen";
}

/** Can the user see global (org-wide) analytics? */
export function canViewGlobalAnalytics(role: AppRole): boolean {
  return role === "staff" || role === "admin" || role === "volunteer";
}

/** Can the user see the volunteer-performance table? */
export function canViewVolunteerAnalytics(role: AppRole): boolean {
  return role === "staff" || role === "admin";
}

/** Is the user a plain citizen? */
export function isCitizen(role: AppRole): boolean {
  return role === "citizen";
}
