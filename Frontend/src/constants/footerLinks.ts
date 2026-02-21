import type { AppRole } from "@/lib/role";

// ── Shared footer link type ─────────────────────────────────────────

export interface FooterLink {
  label: string;
  href: string;
  /** If true the link is only shown to authenticated users. */
  requiresAuth?: boolean;
  /** If set, only these roles will see the link. */
  allowedRoles?: AppRole[];
}

// ── Platform links (auth-aware, mirrors header nav rules) ───────────

export const PLATFORM_LINKS: FooterLink[] = [
  { label: "Report Waste", href: "/report", requiresAuth: true, allowedRoles: ["citizen", "staff", "admin"] },
  { label: "Live Map", href: "/map", requiresAuth: true },
  { label: "Dashboard", href: "/dashboard", requiresAuth: true },
  { label: "Volunteer", href: "/volunteer", requiresAuth: true, allowedRoles: ["volunteer", "staff", "admin"] },
];

// ── Company links (public) ──────────────────────────────────────────

export const COMPANY_FOOTER_LINKS: FooterLink[] = [
  { label: "About Us", href: "/about" },
  { label: "Contact", href: "/contact" },
];

// ── Support / legal links (public) ──────────────────────────────────

export const SUPPORT_LINKS: FooterLink[] = [
  { label: "Help Center", href: "/help" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
];

// ── Visibility helper (reusable by Footer) ──────────────────────────

/**
 * Return true if a footer link should be rendered for the current user.
 */
export function canSeeFooterLink(
  link: FooterLink,
  isAuthenticated: boolean,
  role: AppRole | undefined,
): boolean {
  if (link.requiresAuth && !isAuthenticated) return false;
  if (link.allowedRoles && role && !link.allowedRoles.includes(role)) return false;
  return true;
}
