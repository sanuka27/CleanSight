export interface CompanyLink {
  label: string;
  href: string;
}

/** Company footer links — single source of truth used by Footer (and anywhere else). */
export const COMPANY_LINKS: CompanyLink[] = [
  { label: "About Us", href: "/about" },
  { label: "Contact", href: "/contact" },
] as const;
